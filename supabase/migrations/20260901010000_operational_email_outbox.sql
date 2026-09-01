begin;

-- Production-oriented operational email foundation. The database owns event
-- selection and idempotency; the delivery provider remains replaceable.
-- Sending stays disabled until the Edge Function, provider account, verified
-- domain and webhook secret have all been configured.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.operational_email_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into private.operational_email_settings (singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

create table if not exists private.operational_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  template_key text not null check (template_key in (
    'new_request',
    'request_accepted',
    'request_rejected',
    'request_cancelled',
    'handover_confirmation_required',
    'return_confirmation_required',
    'operation_completed'
  )),
  recipient_user_id uuid not null references auth.users(id) on delete restrict,
  rental_id uuid not null references public.rentals(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'dead')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operational_email_payload_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists operational_email_outbox_dispatch_idx
  on private.operational_email_outbox (status, available_at, created_at)
  where status in ('pending', 'processing');

alter table private.operational_email_settings enable row level security;
alter table private.operational_email_outbox enable row level security;

revoke all on table private.operational_email_settings, private.operational_email_outbox
  from public, anon, authenticated;

create or replace function private.enqueue_operational_email(
  p_event_key text,
  p_template_key text,
  p_recipient_user_id uuid,
  p_rental_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((
    select settings.enabled
    from private.operational_email_settings settings
    where settings.singleton
  ), false) then
    return;
  end if;

  insert into private.operational_email_outbox (
    event_key,
    template_key,
    recipient_user_id,
    rental_id,
    payload
  ) values (
    p_event_key,
    p_template_key,
    p_recipient_user_id,
    p_rental_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_key) do nothing;
end;
$$;

create or replace function private.queue_rental_status_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_equipment_title text;
  v_payload jsonb;
begin
  select equipment.owner_id, equipment.title
  into v_owner_id, v_equipment_title
  from public.listings listing
  join public.equipment equipment on equipment.id = listing.equipment_id
  where listing.id = new.listing_id;

  if not found then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'equipment_title', v_equipment_title,
    'start_date', new.start_date,
    'end_date', new.end_date
  );

  if tg_op = 'INSERT' and new.status = 'requested' then
    perform private.enqueue_operational_email(
      format('rental:%s:new-request:owner', new.id),
      'new_request',
      v_owner_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'owner')
    );
    return new;
  end if;

  if tg_op <> 'UPDATE' or old.status = new.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    perform private.enqueue_operational_email(
      format('rental:%s:request-accepted:renter', new.id),
      'request_accepted',
      new.renter_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'renter')
    );
  elsif new.status = 'rejected' then
    perform private.enqueue_operational_email(
      format('rental:%s:request-rejected:renter', new.id),
      'request_rejected',
      new.renter_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'renter')
    );
  elsif new.status = 'cancelled' then
    perform private.enqueue_operational_email(
      format('rental:%s:request-cancelled:owner', new.id),
      'request_cancelled',
      v_owner_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'owner')
    );
  elsif new.status = 'completed' then
    perform private.enqueue_operational_email(
      format('rental:%s:completed:owner', new.id),
      'operation_completed',
      v_owner_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'owner')
    );
    perform private.enqueue_operational_email(
      format('rental:%s:completed:renter', new.id),
      'operation_completed',
      new.renter_id,
      new.id,
      v_payload || jsonb_build_object('recipient_role', 'renter')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists queue_rental_status_email on public.rentals;
create trigger queue_rental_status_email
after insert or update of status on public.rentals
for each row execute function private.queue_rental_status_email();

create or replace function private.queue_condition_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_renter_id uuid;
  v_recipient_id uuid;
  v_equipment_title text;
  v_report_count integer;
  v_template_key text;
  v_deadline_at timestamptz;
  v_payload jsonb;
begin
  select equipment.owner_id, rental.renter_id, equipment.title
  into v_owner_id, v_renter_id, v_equipment_title
  from public.rentals rental
  join public.listings listing on listing.id = rental.listing_id
  join public.equipment equipment on equipment.id = listing.equipment_id
  where rental.id = new.rental_id;

  if not found then
    return new;
  end if;

  select count(*)
  into v_report_count
  from public.rental_condition_reports report
  where report.rental_id = new.rental_id
    and report.phase = new.phase;

  if v_report_count <> 1 then
    return new;
  end if;

  v_recipient_id := case when new.user_id = v_owner_id then v_renter_id else v_owner_id end;
  v_template_key := case
    when new.phase = 'handover' then 'handover_confirmation_required'
    else 'return_confirmation_required'
  end;
  v_deadline_at := case when new.phase = 'return' then new.confirmed_at + interval '24 hours' else null end;
  v_payload := jsonb_build_object(
    'equipment_title', v_equipment_title,
    'phase', new.phase,
    'deadline_at', v_deadline_at,
    'recipient_role', case when v_recipient_id = v_owner_id then 'owner' else 'renter' end
  );

  perform private.enqueue_operational_email(
    format('rental:%s:%s-confirmation-required:%s', new.rental_id, new.phase, v_recipient_id),
    v_template_key,
    v_recipient_id,
    new.rental_id,
    v_payload
  );

  return new;
end;
$$;

drop trigger if exists queue_condition_confirmation_email on public.rental_condition_reports;
create trigger queue_condition_confirmation_email
after insert on public.rental_condition_reports
for each row execute function private.queue_condition_confirmation_email();

create or replace function public.claim_operational_email(p_outbox_id uuid default null)
returns table (
  outbox_id uuid,
  event_key text,
  template_key text,
  recipient_user_id uuid,
  rental_id uuid,
  payload jsonb,
  attempt integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidate as (
    select email.id
    from private.operational_email_outbox email
    where (p_outbox_id is null or email.id = p_outbox_id)
      and email.attempts < 5
      and email.available_at <= now()
      and (
        email.status = 'pending'
        or (email.status = 'processing' and email.locked_at < now() - interval '15 minutes')
      )
    order by email.created_at, email.id
    for update skip locked
    limit 1
  )
  update private.operational_email_outbox email
  set
    status = 'processing',
    attempts = email.attempts + 1,
    locked_at = now(),
    updated_at = now(),
    last_error = null
  from candidate
  where email.id = candidate.id
  returning
    email.id,
    email.event_key,
    email.template_key,
    email.recipient_user_id,
    email.rental_id,
    email.payload,
    email.attempts;
end;
$$;

create or replace function public.complete_operational_email(
  p_outbox_id uuid,
  p_provider_message_id text
)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.operational_email_outbox
  set
    status = 'sent',
    sent_at = now(),
    provider_message_id = left(p_provider_message_id, 255),
    locked_at = null,
    updated_at = now()
  where id = p_outbox_id
    and status = 'processing';
$$;

create or replace function public.fail_operational_email(
  p_outbox_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.operational_email_outbox
  set
    status = case when attempts >= 5 then 'dead' else 'pending' end,
    available_at = case
      when attempts >= 5 then available_at
      else now() + make_interval(mins => least(60, (power(2, attempts))::integer))
    end,
    last_error = left(coalesce(p_error, 'UNKNOWN_DELIVERY_ERROR'), 1000),
    locked_at = null,
    updated_at = now()
  where id = p_outbox_id
    and status = 'processing';
end;
$$;

revoke execute on function private.enqueue_operational_email(text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.queue_rental_status_email() from public, anon, authenticated;
revoke execute on function private.queue_condition_confirmation_email() from public, anon, authenticated;
revoke execute on function public.claim_operational_email(uuid) from public, anon, authenticated;
revoke execute on function public.complete_operational_email(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_operational_email(uuid, text) from public, anon, authenticated;

grant execute on function public.claim_operational_email(uuid) to service_role;
grant execute on function public.complete_operational_email(uuid, text) to service_role;
grant execute on function public.fail_operational_email(uuid, text) to service_role;

comment on table private.operational_email_outbox is
  'Provider-neutral, idempotent queue for essential transactional operation emails. Contains user IDs and minimal non-PII template payload only.';
comment on column private.operational_email_outbox.event_key is
  'Permanent business idempotency key; one email is queued at most once for each recipient and operational event.';

commit;
