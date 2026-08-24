begin;

-- MVP 3 pilot workflow. Financial, legal, insurance and CMD integrations are
-- deliberately outside this migration; these records describe operational
-- intent only.
alter table public.rentals
  add column if not exists request_message text,
  add column if not exists owner_response_message text,
  add column if not exists accepted_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists cancelled_at timestamptz;

-- Requests must pass through request_rental so dates, ownership and amounts
-- are decided by the database rather than by client input.
revoke insert on table public.rentals from authenticated;
drop policy if exists "Renters can request rentals" on public.rentals;

-- Active pilot listings are exposed through list_active_pilot_listings(),
-- which deliberately omits owner identity. Direct reads remain available to
-- each owner for management of their own equipment and listings only.
revoke select on table public.equipment, public.listings from anon;

drop policy if exists "Public can view available equipment" on public.equipment;
drop policy if exists "Owners can view own equipment" on public.equipment;
create policy "Owners can view own equipment"
on public.equipment for select to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Public can view active listings" on public.listings;
drop policy if exists "Owners can view own listings" on public.listings;
create policy "Owners can view own listings"
on public.listings for select to authenticated
using (
  exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
);

create or replace function public.request_rental(
  p_listing_id uuid,
  p_start_date date,
  p_end_date date,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_listing record;
  v_days integer;
  v_rental_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception using errcode = '22007', message = 'INVALID_DATES';
  end if;

  if p_start_date < current_date then
    raise exception using errcode = '22007', message = 'START_DATE_IN_PAST';
  end if;

  if length(coalesce(p_message, '')) > 1000 then
    raise exception using errcode = '22001', message = 'MESSAGE_TOO_LONG';
  end if;

  select
    l.id as listing_id,
    l.equipment_id,
    l.price_per_day,
    l.deposit_amount,
    l.minimum_days,
    l.maximum_days,
    l.status as listing_status,
    e.owner_id,
    e.status as equipment_status
  into v_listing
  from public.listings l
  join public.equipment e on e.id = l.equipment_id
  where l.id = p_listing_id
  for update of l, e;

  if not found
    or v_listing.listing_status <> 'active'
    or v_listing.equipment_status <> 'available' then
    raise exception using errcode = 'P0001', message = 'LISTING_UNAVAILABLE';
  end if;

  if v_listing.owner_id = v_user_id then
    raise exception using errcode = '42501', message = 'SELF_RENTAL_NOT_ALLOWED';
  end if;

  v_days := (p_end_date - p_start_date) + 1;
  if v_days < v_listing.minimum_days
    or (v_listing.maximum_days is not null and v_days > v_listing.maximum_days) then
    raise exception using errcode = '22023', message = 'RENTAL_DURATION_OUT_OF_RANGE';
  end if;

  if exists (
    select 1
    from public.rentals r
    join public.listings existing_listing on existing_listing.id = r.listing_id
    where existing_listing.equipment_id = v_listing.equipment_id
      and r.status in ('requested', 'confirmed', 'in_progress')
      and r.start_date <= p_end_date
      and r.end_date >= p_start_date
  ) then
    raise exception using errcode = '23P01', message = 'RENTAL_DATES_UNAVAILABLE';
  end if;

  insert into public.rentals (
    listing_id,
    renter_id,
    start_date,
    end_date,
    daily_price,
    deposit_amount,
    total_amount,
    status,
    request_message
  ) values (
    v_listing.listing_id,
    v_user_id,
    p_start_date,
    p_end_date,
    v_listing.price_per_day,
    v_listing.deposit_amount,
    v_listing.price_per_day * v_days,
    'requested',
    nullif(btrim(p_message), '')
  )
  returning id into v_rental_id;

  return v_rental_id;
end;
$$;

create or replace function public.accept_rental_request(
  p_rental_id uuid,
  p_message text default null
)
returns void
language plpgsql
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

  if length(coalesce(p_message, '')) > 1000 then
    raise exception using errcode = '22001', message = 'MESSAGE_TOO_LONG';
  end if;

  select
    r.id,
    r.status,
    r.start_date,
    r.end_date,
    l.equipment_id,
    e.owner_id
  into v_rental
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id
  for update of r, e;

  if not found or v_rental.owner_id <> v_user_id then
    raise exception using errcode = '42501', message = 'OWNER_ONLY';
  end if;

  if v_rental.status <> 'requested' then
    raise exception using errcode = '55000', message = 'REQUEST_NOT_PENDING';
  end if;

  if exists (
    select 1
    from public.rentals conflicting_rental
    join public.listings conflicting_listing on conflicting_listing.id = conflicting_rental.listing_id
    where conflicting_rental.id <> v_rental.id
      and conflicting_listing.equipment_id = v_rental.equipment_id
      and conflicting_rental.status in ('confirmed', 'in_progress')
      and conflicting_rental.start_date <= v_rental.end_date
      and conflicting_rental.end_date >= v_rental.start_date
  ) then
    raise exception using errcode = '23P01', message = 'RENTAL_DATES_UNAVAILABLE';
  end if;

  update public.rentals
  set
    status = 'confirmed',
    accepted_at = now(),
    owner_response_message = nullif(btrim(p_message), '')
  where id = v_rental.id;
end;
$$;

create or replace function public.reject_rental_request(
  p_rental_id uuid,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if length(coalesce(p_message, '')) > 1000 then
    raise exception using errcode = '22001', message = 'MESSAGE_TOO_LONG';
  end if;

  select e.owner_id, r.status
  into v_owner_id, v_status
  from public.rentals r
  join public.listings l on l.id = r.listing_id
  join public.equipment e on e.id = l.equipment_id
  where r.id = p_rental_id
  for update of r;

  if not found or v_owner_id <> v_user_id then
    raise exception using errcode = '42501', message = 'OWNER_ONLY';
  end if;

  if v_status <> 'requested' then
    raise exception using errcode = '55000', message = 'REQUEST_NOT_PENDING';
  end if;

  update public.rentals
  set
    status = 'rejected',
    rejected_at = now(),
    owner_response_message = nullif(btrim(p_message), '')
  where id = p_rental_id;
end;
$$;

create or replace function public.cancel_rental_request(p_rental_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_renter_id uuid;
  v_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select renter_id, status
  into v_renter_id, v_status
  from public.rentals
  where id = p_rental_id
  for update;

  if not found or v_renter_id <> v_user_id then
    raise exception using errcode = '42501', message = 'RENTER_ONLY';
  end if;

  if v_status not in ('requested', 'confirmed') then
    raise exception using errcode = '55000', message = 'REQUEST_CANNOT_BE_CANCELLED';
  end if;

  update public.rentals
  set status = 'cancelled', cancelled_at = now()
  where id = p_rental_id;
end;
$$;

create or replace function public.list_my_rentals()
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

create or replace function public.list_active_pilot_listings()
returns table (
  listing_id uuid,
  equipment_id uuid,
  equipment_title text,
  equipment_type text,
  equipment_brand text,
  equipment_model text,
  equipment_condition text,
  equipment_image_url text,
  city text,
  price_per_day numeric,
  deposit_amount numeric,
  minimum_days integer,
  maximum_days integer,
  description text
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
    l.id,
    e.id,
    e.title,
    e.equipment_type,
    e.brand,
    e.model,
    e.condition,
    e.image_urls[1],
    l.city,
    l.price_per_day,
    l.deposit_amount,
    l.minimum_days,
    l.maximum_days,
    coalesce(l.description, e.description)
  from public.listings l
  join public.equipment e on e.id = l.equipment_id
  where l.status = 'active'
    and e.status = 'available'
    and e.owner_id <> v_user_id
  order by l.updated_at desc, l.created_at desc;
end;
$$;

revoke execute on function public.request_rental(uuid, date, date, text) from public, anon, authenticated;
revoke execute on function public.accept_rental_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.reject_rental_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.cancel_rental_request(uuid) from public, anon, authenticated;
revoke execute on function public.list_my_rentals() from public, anon, authenticated;
revoke execute on function public.list_active_pilot_listings() from public, anon, authenticated;

grant execute on function public.request_rental(uuid, date, date, text) to authenticated;
grant execute on function public.accept_rental_request(uuid, text) to authenticated;
grant execute on function public.reject_rental_request(uuid, text) to authenticated;
grant execute on function public.cancel_rental_request(uuid) to authenticated;
grant execute on function public.list_my_rentals() to authenticated;
grant execute on function public.list_active_pilot_listings() to authenticated;

-- Public images are limited to the dedicated bucket. Only the authenticated
-- owner of the first path segment may write or remove objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipment-images',
  'equipment-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view pilot equipment images" on storage.objects;
create policy "Public can view pilot equipment images"
on storage.objects for select
using (bucket_id = 'equipment-images');

drop policy if exists "Users can upload own pilot equipment images" on storage.objects;
create policy "Users can upload own pilot equipment images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'equipment-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own pilot equipment images" on storage.objects;
create policy "Users can update own pilot equipment images"
on storage.objects for update to authenticated
using (
  bucket_id = 'equipment-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'equipment-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own pilot equipment images" on storage.objects;
create policy "Users can delete own pilot equipment images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'equipment-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
