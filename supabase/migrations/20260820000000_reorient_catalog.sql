begin;

alter table public.valuation_matrix
  add column if not exists category text not null default 'Por classificar';

alter table public.valuation_matrix
  add column if not exists launch_phase text not null default 'future'
    check (launch_phase in ('launch', 'future', 'legacy'));

alter table public.valuation_matrix
  add column if not exists pricing_status text not null default 'provisional'
    check (pricing_status in ('provisional', 'validated', 'retired'));

create index if not exists valuation_matrix_category_active_idx
  on public.valuation_matrix (category, active);

-- Preserve the previous records for audit, but remove them from the active
-- launch catalogue. Rates below are initial hypotheses and must be validated
-- with real supply, demand and incident data before production use.
update public.valuation_matrix
set active = false,
    launch_phase = 'legacy',
    pricing_status = 'retired';

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
  ('Projetos em casa', 'Berbequim ou aparafusadora profissional', 18, 100, 'launch', 'provisional', true),
  ('Projetos em casa', 'Lixadora', 20, 120, 'launch', 'provisional', true),
  ('Projetos em casa', 'Serra tico-tico ou circular', 22, 150, 'launch', 'provisional', true),
  ('Projetos em casa', 'Escada extensível ou articulada', 15, 100, 'launch', 'provisional', true),
  ('Limpeza profunda', 'Lavadora de alta pressão', 20, 150, 'launch', 'provisional', true),
  ('Limpeza profunda', 'Extratora de estofos e alcatifas', 25, 150, 'launch', 'provisional', true),
  ('Limpeza profunda', 'Máquina de limpeza a vapor', 25, 150, 'launch', 'provisional', true),
  ('Jardim e terreno', 'Roçadora', 25, 180, 'launch', 'provisional', true),
  ('Jardim e terreno', 'Corta-relvas', 25, 200, 'launch', 'provisional', true),
  ('Jardim e terreno', 'Motoenxada', 40, 300, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Projetor de vídeo', 30, 250, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Coluna de som de elevada potência', 35, 300, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Tenda de campismo de grande capacidade', 30, 200, 'launch', 'provisional', true),
  ('Eventos e lazer', 'Kit de equipamento de campismo', 25, 150, 'launch', 'provisional', true)
on conflict (equipment_type) do update
set category = excluded.category,
    suggested_daily_rate = excluded.suggested_daily_rate,
    suggested_deposit = excluded.suggested_deposit,
    launch_phase = excluded.launch_phase,
    pricing_status = excluded.pricing_status,
    active = excluded.active,
    updated_at = now();

commit;
