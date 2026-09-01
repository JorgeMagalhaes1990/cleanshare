begin;

-- MVP 3.2: the first return condition report starts a 24-hour window for the
-- counterparty. Bilateral confirmation still completes immediately. If the
-- second report is absent after the deadline, either participant can trigger
-- authoritative automatic completion by refreshing their operational data.

create or replace function public.can_upload_rental_condition_photo(
  p_rental_id text,
  p_phase text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_phase in ('handover', 'return')
    and exists (
      select 1
      from public.rentals r
      join public.listings l on l.id = r.listing_id
      join public.equipment e on e.id = l.equipment_id
      where r.id::text = p_rental_id
        and (r.renter_id = auth.uid() or e.owner_id = auth.uid())
        and (
          (p_phase = 'handover' and r.status = 'confirmed')
          or (p_phase = 'return' and r.status = 'in_progress')
        )
        and not exists (
          select 1
          from public.rental_condition_reports own_report
          where own_report.rental_id = r.id
            and own_report.phase = p_phase
            and own_report.user_id = auth.uid()
        )
        and (
          p_phase <> 'return'
          or not exists (
            select 1
            from public.rental_condition_reports first_report
            where first_report.rental_id = r.id
              and first_report.phase = 'return'
              and first_report.confirmed_at <= now() - interval '24 hours'
          )
        )
    );
$$;

create or replace function public.finalize_expired_rental_returns()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_finalized integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  update public.rentals r
  set
    status = 'completed',
    updated_at = now()
  from public.listings l
  join public.equipment e on e.id = l.equipment_id
  where l.id = r.listing_id
    and r.status = 'in_progress'
    and (r.renter_id = v_user_id or e.owner_id = v_user_id)
    and 1 = (
      select count(*)
      from public.rental_condition_reports report
      where report.rental_id = r.id
        and report.phase = 'return'
    )
    and exists (
      select 1
      from public.rental_condition_reports report
      where report.rental_id = r.id
        and report.phase = 'return'
        and report.confirmed_at <= now() - interval '24 hours'
    );

  get diagnostics v_finalized = row_count;
  return v_finalized;
end;
$$;

create or replace function public.submit_rental_condition_report(
  p_rental_id uuid,
  p_phase text,
  p_photo_paths text[],
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rental record;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_path text;
  v_report_id uuid;
  v_confirmation_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if p_phase is null or p_phase not in ('handover', 'return') then
    raise exception using errcode = '22023', message = 'CONDITION_PHASE_INVALID';
  end if;

  if v_note is not null and char_length(v_note) > 1000 then
    raise exception using errcode = '22001', message = 'NOTE_TOO_LONG';
  end if;

  if p_photo_paths is null or cardinality(p_photo_paths) not between 1 and 5 then
    raise exception using errcode = '22023', message = 'PHOTO_COUNT_INVALID';
  end if;

  select r.id, r.renter_id, r.status, e.owner_id
  into v_rental
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id
  for update of r;

  if not found or v_user_id not in (v_rental.renter_id, v_rental.owner_id) then
    raise exception using errcode = '42501', message = 'RENTAL_PARTICIPANTS_ONLY';
  end if;

  if (p_phase = 'handover' and v_rental.status <> 'confirmed')
    or (p_phase = 'return' and v_rental.status <> 'in_progress') then
    raise exception using errcode = '55000', message = 'CONDITION_PHASE_NOT_AVAILABLE';
  end if;

  if p_phase = 'return' and exists (
    select 1
    from public.rental_condition_reports report
    where report.rental_id = p_rental_id
      and report.phase = 'return'
      and report.confirmed_at <= now() - interval '24 hours'
  ) then
    raise exception using errcode = '55000', message = 'RETURN_CONFIRMATION_DEADLINE_EXPIRED';
  end if;

  if exists (
    select 1 from public.rental_condition_reports report
    where report.rental_id = p_rental_id
      and report.phase = p_phase
      and report.user_id = v_user_id
  ) then
    raise exception using errcode = '23505', message = 'CONDITION_REPORT_ALREADY_CONFIRMED';
  end if;

  if (
    select count(distinct path_value)
    from unnest(p_photo_paths) as path_value
  ) <> cardinality(p_photo_paths) then
    raise exception using errcode = '22023', message = 'DUPLICATE_PHOTO_PATH';
  end if;

  foreach v_path in array p_photo_paths loop
    if v_path is null
      or position(format('%s/%s/%s/', p_rental_id, v_user_id, p_phase) in v_path) <> 1
      or array_length(string_to_array(v_path, '/'), 1) <> 4
      or v_path like '%..%'
      or not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'rental-condition-photos'
          and object.name = v_path
          and object.owner_id = v_user_id::text
      ) then
      raise exception using errcode = '42501', message = 'CONDITION_PHOTO_PATH_INVALID';
    end if;
  end loop;

  insert into public.rental_condition_reports (
    rental_id,
    phase,
    user_id,
    note,
    photo_paths,
    confirmed_at
  ) values (
    p_rental_id,
    p_phase,
    v_user_id,
    v_note,
    p_photo_paths,
    now()
  )
  returning id into v_report_id;

  select count(*)
  into v_confirmation_count
  from public.rental_condition_reports report
  where report.rental_id = p_rental_id
    and report.phase = p_phase;

  if v_confirmation_count = 2 then
    if p_phase = 'handover' then
      update public.rentals
      set status = 'in_progress', updated_at = now()
      where id = p_rental_id and status = 'confirmed';
    else
      update public.rentals
      set status = 'completed', updated_at = now()
      where id = p_rental_id and status = 'in_progress';
    end if;
  end if;

  return v_report_id;
end;
$$;

revoke execute on function public.can_upload_rental_condition_photo(text, text) from public, anon, authenticated;
revoke execute on function public.finalize_expired_rental_returns() from public, anon, authenticated;
revoke execute on function public.submit_rental_condition_report(uuid, text, text[], text) from public, anon, authenticated;

grant execute on function public.can_upload_rental_condition_photo(text, text) to authenticated;
grant execute on function public.finalize_expired_rental_returns() to authenticated;
grant execute on function public.submit_rental_condition_report(uuid, text, text[], text) to authenticated;

comment on function public.finalize_expired_rental_returns() is
  'Completes a participant rental when exactly one return report has remained unanswered for at least 24 hours.';

commit;
