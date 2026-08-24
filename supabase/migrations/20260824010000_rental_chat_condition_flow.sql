begin;

-- MVP 3.1: private operational chat, conditional phone disclosure and
-- bilateral photographic condition reports. Payments, deposits, contracts,
-- insurance and CMD remain outside this pilot flow.

create table if not exists public.rental_messages (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete restrict,
  sender_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint rental_messages_body_trimmed check (body = btrim(body)),
  constraint rental_messages_body_length check (char_length(body) between 1 and 1000)
);

create index if not exists rental_messages_rental_created_idx
  on public.rental_messages (rental_id, created_at, id);

create table if not exists public.rental_condition_reports (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rentals(id) on delete restrict,
  phase text not null check (phase in ('handover', 'return')),
  user_id uuid not null references auth.users(id) on delete restrict,
  note text,
  photo_paths text[] not null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_condition_reports_note_trimmed check (note is null or note = btrim(note)),
  constraint rental_condition_reports_note_length check (note is null or char_length(note) <= 1000),
  constraint rental_condition_reports_photo_count check (cardinality(photo_paths) between 1 and 5),
  constraint rental_condition_reports_participant_phase unique (rental_id, phase, user_id)
);

create index if not exists rental_condition_reports_rental_phase_idx
  on public.rental_condition_reports (rental_id, phase, confirmed_at);

-- Messages are an audit trail. The restrictive foreign keys on both audit
-- tables deliberately block deletion of a rental with evidence; there is no
-- surprising cascade. No role, including a future RPC, may mutate or delete a
-- message without explicitly removing this trigger in a migration.
create or replace function public.prevent_rental_message_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'RENTAL_MESSAGES_ARE_IMMUTABLE';
end;
$$;

drop trigger if exists rental_messages_immutable on public.rental_messages;
create trigger rental_messages_immutable
before update or delete on public.rental_messages
for each row execute function public.prevent_rental_message_mutation();

create or replace function public.prevent_rental_condition_report_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'CONDITION_REPORTS_ARE_IMMUTABLE';
end;
$$;

drop trigger if exists rental_condition_reports_immutable on public.rental_condition_reports;
create trigger rental_condition_reports_immutable
before update or delete on public.rental_condition_reports
for each row execute function public.prevent_rental_condition_report_mutation();

-- Text comparison avoids unsafe UUID casts in storage policies when an
-- authenticated client attempts to use a malformed object path.
create or replace function public.is_rental_participant(p_rental_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.rentals r
    join public.listings l on l.id = r.listing_id
    join public.equipment e on e.id = l.equipment_id
    where r.id::text = p_rental_id
      and (r.renter_id = auth.uid() or e.owner_id = auth.uid())
  );
$$;

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
          from public.rental_condition_reports report
          where report.rental_id = r.id
            and report.phase = p_phase
            and report.user_id = auth.uid()
        )
    );
$$;

create or replace function public.can_delete_rental_condition_photo(
  p_rental_id text,
  p_photo_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_rental_participant(p_rental_id)
    and not exists (
      select 1
      from public.rental_condition_reports report
      where report.rental_id::text = p_rental_id
        and p_photo_path = any(report.photo_paths)
    );
$$;

alter table public.rental_messages enable row level security;
alter table public.rental_condition_reports enable row level security;

drop policy if exists "Participants can read rental messages" on public.rental_messages;
create policy "Participants can read rental messages"
on public.rental_messages for select to authenticated
using (public.is_rental_participant(rental_id::text));

drop policy if exists "Participants can read condition reports" on public.rental_condition_reports;
create policy "Participants can read condition reports"
on public.rental_condition_reports for select to authenticated
using (public.is_rental_participant(rental_id::text));

-- Reads may use RLS; all writes are RPC-only. Condition reports are final once
-- confirmed, just like chat messages.
revoke all on table public.rental_messages, public.rental_condition_reports from public, anon;
revoke insert, update, delete on table public.rental_messages, public.rental_condition_reports from authenticated;
grant select on table public.rental_messages, public.rental_condition_reports to authenticated;
revoke insert, update, delete on table public.rentals from public, anon, authenticated;

create or replace function public.list_rental_messages(p_rental_id uuid)
returns table (
  message_id uuid,
  sender_id uuid,
  sender_role text,
  sender_full_name text,
  body text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rental record;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select r.renter_id, e.owner_id
  into v_rental
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id;

  if not found or v_user_id not in (v_rental.renter_id, v_rental.owner_id) then
    raise exception using errcode = '42501', message = 'RENTAL_PARTICIPANTS_ONLY';
  end if;

  return query
  select
    message.id,
    message.sender_id,
    case when message.sender_id = v_rental.owner_id then 'owner' else 'renter' end,
    coalesce(profile.full_name, 'Utilizador CleanShare'),
    message.body,
    message.created_at
  from public.rental_messages message
  left join public.profiles profile on profile.id = message.sender_id
  where message.rental_id = p_rental_id
  order by message.created_at, message.id;
end;
$$;

create or replace function public.send_rental_message(
  p_rental_id uuid,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_renter_id uuid;
  v_owner_id uuid;
  v_status text;
  v_body text := btrim(coalesce(p_body, ''));
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if char_length(v_body) not between 1 and 1000 then
    raise exception using errcode = '22001', message = 'MESSAGE_LENGTH_INVALID';
  end if;

  select r.renter_id, e.owner_id, r.status
  into v_renter_id, v_owner_id, v_status
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id;

  if not found or v_user_id not in (v_renter_id, v_owner_id) then
    raise exception using errcode = '42501', message = 'RENTAL_PARTICIPANTS_ONLY';
  end if;

  if v_status not in ('requested', 'confirmed', 'in_progress', 'completed', 'disputed') then
    raise exception using errcode = '55000', message = 'RENTAL_CHAT_NOT_AVAILABLE';
  end if;

  insert into public.rental_messages (rental_id, sender_id, body)
  values (p_rental_id, v_user_id, v_body)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.list_rental_condition_reports(p_rental_id uuid)
returns table (
  report_id uuid,
  phase text,
  user_id uuid,
  author_role text,
  author_full_name text,
  note text,
  photo_paths text[],
  confirmed_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_rental record;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select r.renter_id, e.owner_id
  into v_rental
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id;

  if not found or v_user_id not in (v_rental.renter_id, v_rental.owner_id) then
    raise exception using errcode = '42501', message = 'RENTAL_PARTICIPANTS_ONLY';
  end if;

  return query
  select
    report.id,
    report.phase,
    report.user_id,
    case when report.user_id = v_rental.owner_id then 'owner' else 'renter' end,
    coalesce(profile.full_name, 'Utilizador CleanShare'),
    report.note,
    report.photo_paths,
    report.confirmed_at,
    report.created_at
  from public.rental_condition_reports report
  left join public.profiles profile on profile.id = report.user_id
  where report.rental_id = p_rental_id
  order by report.phase, report.confirmed_at, report.id;
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
          -- owner_id is text in the current Supabase Storage schema.
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
      set status = 'in_progress'
      where id = p_rental_id and status = 'confirmed';
    else
      update public.rentals
      set status = 'completed'
      where id = p_rental_id and status = 'in_progress';
    end if;
  end if;

  return v_report_id;
end;
$$;

-- PostgreSQL cannot replace a table-returning function when its return shape
-- changes. Recreate list_my_rentals to add only the state-conditioned phone.
revoke execute on function public.list_my_rentals() from public, anon, authenticated;
drop function public.list_my_rentals();

create function public.list_my_rentals()
returns table (
  rental_id uuid,
  rental_reference text,
  role text,
  status text,
  start_date date,
  end_date date,
  daily_price numeric,
  deposit_amount numeric,
  total_amount numeric,
  listing_id uuid,
  equipment_id uuid,
  equipment_title text,
  equipment_type text,
  equipment_brand text,
  equipment_model text,
  equipment_image_url text,
  city text,
  counterpart_id uuid,
  counterpart_full_name text,
  counterpart_phone text,
  request_message text,
  owner_response_message text,
  created_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  return query
  select
    r.id,
    'CS-' || upper(left(replace(r.id::text, '-', ''), 8)),
    case when e.owner_id = v_user_id then 'owner' else 'renter' end,
    r.status,
    r.start_date,
    r.end_date,
    r.daily_price,
    r.deposit_amount,
    r.total_amount,
    l.id,
    e.id,
    e.title,
    e.equipment_type,
    e.brand,
    e.model,
    e.image_urls[1],
    l.city,
    case when e.owner_id = v_user_id then r.renter_id else e.owner_id end,
    case
      when e.owner_id = v_user_id then coalesce(renter_profile.full_name, 'Utilizador CleanShare')
      else coalesce(owner_profile.full_name, 'Utilizador CleanShare')
    end,
    case
      when r.status in ('confirmed', 'in_progress', 'completed', 'disputed') then
        case when e.owner_id = v_user_id then renter_profile.phone else owner_profile.phone end
      else null
    end,
    r.request_message,
    r.owner_response_message,
    r.created_at,
    r.accepted_at,
    r.rejected_at,
    r.cancelled_at,
    r.updated_at
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  left join public.profiles renter_profile on renter_profile.id = r.renter_id
  left join public.profiles owner_profile on owner_profile.id = e.owner_id
  where r.renter_id = v_user_id or e.owner_id = v_user_id
  order by
    case when r.status in ('requested', 'confirmed', 'in_progress') then 0 else 1 end,
    r.start_date,
    r.created_at desc;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rental-condition-photos',
  'rental-condition-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Participants can read rental condition photos" on storage.objects;
create policy "Participants can read rental condition photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'rental-condition-photos'
  and public.is_rental_participant((storage.foldername(name))[1])
);

drop policy if exists "Participants can upload own rental condition photos" on storage.objects;
create policy "Participants can upload own rental condition photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'rental-condition-photos'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[2] = auth.uid()::text
  and (storage.foldername(name))[3] in ('handover', 'return')
  and public.can_upload_rental_condition_photo(
    (storage.foldername(name))[1],
    (storage.foldername(name))[3]
  )
);

drop policy if exists "Participants can remove unconfirmed condition photos" on storage.objects;
create policy "Participants can remove unconfirmed condition photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'rental-condition-photos'
  and (storage.foldername(name))[2] = auth.uid()::text
  and owner_id = auth.uid()::text
  and public.can_delete_rental_condition_photo((storage.foldername(name))[1], name)
);

-- No update policy is created: uploaded evidence is replaced by a new,
-- unpredictable object path and becomes undeletable after report confirmation.

revoke execute on function public.prevent_rental_message_mutation() from public, anon, authenticated;
revoke execute on function public.prevent_rental_condition_report_mutation() from public, anon, authenticated;
revoke execute on function public.is_rental_participant(text) from public, anon, authenticated;
revoke execute on function public.can_upload_rental_condition_photo(text, text) from public, anon, authenticated;
revoke execute on function public.can_delete_rental_condition_photo(text, text) from public, anon, authenticated;
revoke execute on function public.list_rental_messages(uuid) from public, anon, authenticated;
revoke execute on function public.send_rental_message(uuid, text) from public, anon, authenticated;
revoke execute on function public.list_rental_condition_reports(uuid) from public, anon, authenticated;
revoke execute on function public.submit_rental_condition_report(uuid, text, text[], text) from public, anon, authenticated;
revoke execute on function public.list_my_rentals() from public, anon, authenticated;

grant execute on function public.is_rental_participant(text) to authenticated;
grant execute on function public.can_upload_rental_condition_photo(text, text) to authenticated;
grant execute on function public.can_delete_rental_condition_photo(text, text) to authenticated;
grant execute on function public.list_rental_messages(uuid) to authenticated;
grant execute on function public.send_rental_message(uuid, text) to authenticated;
grant execute on function public.list_rental_condition_reports(uuid) to authenticated;
grant execute on function public.submit_rental_condition_report(uuid, text, text[], text) to authenticated;
grant execute on function public.list_my_rentals() to authenticated;

comment on table public.rental_messages is
  'Immutable private chat messages visible only to the owner and renter of a pilot rental.';
comment on table public.rental_condition_reports is
  'Bilateral pilot handover/return evidence; each participant confirms only their own report.';
comment on column public.rental_condition_reports.photo_paths is
  'Private storage paths; clients must request short-lived signed URLs.';

commit;
