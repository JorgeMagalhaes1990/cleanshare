begin;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references public.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  city text,
  postal_code text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  equipment_type text not null,
  title text not null,
  brand text,
  model text,
  description text,
  condition text not null default 'good'
    check (condition in ('new', 'excellent', 'good', 'fair')),
  purchase_year integer
    check (purchase_year is null or purchase_year between 1950 and extract(year from current_date)::integer),
  estimated_value numeric(10,2)
    check (estimated_value is null or estimated_value >= 0),
  image_urls text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'available', 'unavailable', 'maintenance', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  price_per_day numeric(10,2) not null check (price_per_day > 0),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  minimum_days integer not null default 1 check (minimum_days > 0),
  maximum_days integer check (maximum_days is null or maximum_days >= minimum_days),
  city text not null,
  postal_code text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index listings_one_active_per_equipment_idx
  on public.listings (equipment_id)
  where status = 'active';

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  renter_id uuid not null references public.users(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  daily_price numeric(10,2) not null check (daily_price > 0),
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  total_amount numeric(10,2) not null check (total_amount > 0),
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected', 'disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rentals_valid_dates check (end_date >= start_date)
);

create index equipment_owner_id_idx on public.equipment (owner_id);
create index equipment_type_idx on public.equipment (equipment_type);
create index listings_equipment_id_idx on public.listings (equipment_id);
create index listings_status_idx on public.listings (status);
create index rentals_listing_id_idx on public.rentals (listing_id);
create index rentals_renter_id_idx on public.rentals (renter_id);
create index rentals_dates_idx on public.rentals (start_date, end_date);

create table public.valuation_matrix (
  id uuid primary key default gen_random_uuid(),
  equipment_type text not null unique,
  suggested_daily_rate numeric(10,2) not null check (suggested_daily_rate > 0),
  suggested_deposit numeric(10,2) not null default 0 check (suggested_deposit >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.valuation_matrix
  (equipment_type, suggested_daily_rate, suggested_deposit)
values
  ('Lavadora de Alta Pressão', 15, 100),
  ('Máquina de Limpeza de Estofos', 20, 120),
  ('Aspirador Industrial', 18, 100),
  ('Lavadora de Pavimentos', 35, 250),
  ('Gerador de Vapor', 30, 200),
  ('Extratora', 25, 150),
  ('Polidora', 28, 180),
  ('Lavadora Compacta', 12, 80);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger equipment_set_updated_at
before update on public.equipment
for each row execute function public.set_updated_at();

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

create trigger rentals_set_updated_at
before update on public.rentals
for each row execute function public.set_updated_at();

create trigger valuation_matrix_set_updated_at
before update on public.valuation_matrix
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.listings enable row level security;
alter table public.rentals enable row level security;
alter table public.valuation_matrix enable row level security;

create policy "Users can view own account"
on public.users for select
using (auth.uid() = id);

create policy "Users can update own account"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Public can view available equipment"
on public.equipment for select
using (status = 'available' or auth.uid() = owner_id);

create policy "Owners can create equipment"
on public.equipment for insert
with check (auth.uid() = owner_id);

create policy "Owners can update equipment"
on public.equipment for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Owners can delete equipment"
on public.equipment for delete
using (auth.uid() = owner_id);

create policy "Public can view active listings"
on public.listings for select
using (
  status = 'active'
  or exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
);

create policy "Owners can create listings"
on public.listings for insert
with check (
  exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
);

create policy "Owners can update listings"
on public.listings for update
using (
  exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
);

create policy "Owners can delete listings"
on public.listings for delete
using (
  exists (
    select 1
    from public.equipment e
    where e.id = equipment_id
      and e.owner_id = auth.uid()
  )
);

create policy "Participants can view rentals"
on public.rentals for select
using (
  auth.uid() = renter_id
  or exists (
    select 1
    from public.listings l
    join public.equipment e on e.id = l.equipment_id
    where l.id = listing_id
      and e.owner_id = auth.uid()
  )
);

create policy "Renters can request rentals"
on public.rentals for insert
with check (
  auth.uid() = renter_id
  and exists (
    select 1
    from public.listings l
    join public.equipment e on e.id = l.equipment_id
    where l.id = listing_id
      and l.status = 'active'
      and e.owner_id <> auth.uid()
  )
);

create policy "Public can read active valuations"
on public.valuation_matrix for select
using (active = true);

grant usage on schema public to anon, authenticated;
grant select on public.equipment, public.listings, public.valuation_matrix to anon;
grant select, insert, update, delete on public.equipment, public.listings to authenticated;
grant select, update on public.users, public.profiles to authenticated;
grant select, insert on public.rentals to authenticated;
grant select on public.valuation_matrix to authenticated;

commit;
