begin;

-- Preserve the previous camping-kit row for audit, but remove it from the
-- active launch catalogue in favour of the more specific replacement below.
update public.valuation_matrix
set active = false,
    launch_phase = 'legacy',
    pricing_status = 'retired',
    updated_at = now()
where equipment_type = 'Kit de equipamento de campismo';

-- Initial launch hypotheses for removable leisure equipment. These values
-- remain provisional until validated with real marketplace data.
insert into public.valuation_matrix
  (
    category,
    equipment_type,
    suggested_daily_rate,
    suggested_deposit,
    launch_phase,
    pricing_status,
    active
  )
values
  ('Eventos e lazer', 'Kit de campismo com sacos-cama', 25, 150, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Suporte de bicicletas para automóvel', 25, 300, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Mala de tejadilho', 25, 250, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Sistema de barras de tejadilho', 15, 150, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Tenda de tejadilho', 75, 750, 'launch', 'provisional', true)
on conflict (equipment_type) do update
set category = excluded.category,
    suggested_daily_rate = excluded.suggested_daily_rate,
    suggested_deposit = excluded.suggested_deposit,
    launch_phase = excluded.launch_phase,
    pricing_status = excluded.pricing_status,
    active = excluded.active,
    updated_at = now();

commit;
