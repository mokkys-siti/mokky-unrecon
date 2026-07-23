-- 0015_recon_layouts.sql
-- Column positions live in the database, not in code (the workbook will change;
-- an admin must be able to remap without a redeploy). recon_layouts holds the
-- sheet/row geometry; recon_gateway_columns holds the per-gateway column map as
-- jsonb (canonical field -> column letter). Seeded with the validated
-- 'combined_v1' layout (Mokkys_Recon_*_Combined.xlsx).

create table public.recon_layouts (
  id                        uuid primary key default gen_random_uuid(),
  version                   text not null unique,
  results_sheet             text not null default 'Results',
  interrecon_sheet          text not null default 'Interrecon',
  results_title_row         int not null default 3,
  results_header_row        int not null default 5,
  results_data_row          int not null default 6,
  interrecon_header_row     int not null default 4,
  interrecon_data_row       int not null default 5,
  -- Checksum labels sit on Results B1/B2; counts (if present) in the next column.
  checksum_bill_no_cell     text not null default 'C1',
  checksum_no_bill_cell     text not null default 'C2',
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now()
);

create table public.recon_gateway_columns (
  id             uuid primary key default gen_random_uuid(),
  layout_version text not null references public.recon_layouts (version),
  gateway_code   text not null,
  section_title  text not null,
  pos_columns    jsonb not null,
  pg_columns     jsonb not null,
  -- 'gross' for all except FoodPanda, whose file only exposes a net payout.
  pg_amount_basis text not null default 'gross'
                    check (pg_amount_basis in ('gross', 'payout')),
  sort_order     int not null default 0,
  is_active      boolean not null default true,
  unique (layout_version, gateway_code)
);

comment on table public.recon_gateway_columns is
  'Per-gateway Results column map (field -> column letter). Editable config.';

-- ---------------------------------------------------------------------------
-- Seed the validated 'combined_v1' layout.
-- ---------------------------------------------------------------------------
insert into public.recon_layouts (version) values ('combined_v1')
on conflict (version) do nothing;

insert into public.recon_gateway_columns
  (layout_version, gateway_code, section_title, pos_columns, pg_columns, pg_amount_basis, sort_order)
values
  ('combined_v1', 'MBBQR', 'MBBQR Reconciliation',
   '{"business_date":"B","outlet":"C","tender":"D","bill_no":"E","bill_closed_date":"F","amount":"G","status":"H","pg_number":"I"}',
   '{"txn_datetime":"K","outlet_name":"L","external_ref":"M","amount":"N","status":"O","bill_no":"P"}',
   'gross', 1),
  ('combined_v1', 'MMP', 'MMP Reconciliation',
   '{"business_date":"R","outlet":"S","tender":"T","bill_no":"U","bill_closed_date":"V","amount":"W","status":"X","pg_number":"Y"}',
   '{"card_type":"AA","txn_datetime":"AB","external_ref":"AC","amount":"AD","status":"AE","bill_no":"AF"}',
   'gross', 2),
  ('combined_v1', 'ODR_GKASH', 'Odaring-GKash Reconciliation',
   '{"business_date":"AH","outlet":"AI","tender":"AJ","bill_no":"AK","ref_no":"AL","bill_closed_date":"AM","amount":"AN","status":"AO","pg_number":"AP"}',
   '{"txn_datetime":"AR","store":"AS","terminal_id":"AT","external_ref":"AU","amount":"AV"}',
   'gross', 3),
  ('combined_v1', 'GRABPAY', 'Grabpay Reconciliation',
   '{"business_date":"AX","outlet":"AY","tender":"AZ","bill_no":"BA","bill_closed_date":"BB","amount":"BC","status":"BD","pg_number":"BE"}',
   '{"txn_datetime":"BG","external_ref":"BH","amount":"BI","status":"BJ","bill_no":"BK"}',
   'gross', 4),
  ('combined_v1', 'GRABFOOD', 'Grabfood Reconciliation',
   '{"business_date":"BM","outlet":"BN","tender":"BO","bill_no":"BP","bill_closed_date":"BQ","amount":"BR","status":"BS","pg_number":"BT"}',
   '{"txn_datetime":"BV","external_ref":"BW","amount":"BX","status":"BY","bill_no":"BZ"}',
   'gross', 5),
  ('combined_v1', 'FOODPANDA', 'Foodpanda Reconciliation',
   '{"business_date":"CB","outlet":"CC","tender":"CD","bill_no":"CE","bill_closed_date":"CF","amount":"CG","status":"CH","pg_number":"CI"}',
   '{"txn_datetime":"CK","external_ref":"CL","amount":"CM"}',
   'payout', 6),
  ('combined_v1', 'SHOPEEFOOD', 'Shopeefood Reconciliation',
   '{"business_date":"CQ","outlet":"CR","tender":"CS","bill_no":"CT","ref_no":"CU","bill_closed_date":"CV","amount":"CW","status":"CX","order_id":"CY"}',
   '{"txn_datetime":"DA","store":"DB","external_ref":"DC","amount":"DD"}',
   'gross', 7)
on conflict (layout_version, gateway_code) do update set
  section_title   = excluded.section_title,
  pos_columns     = excluded.pos_columns,
  pg_columns      = excluded.pg_columns,
  pg_amount_basis = excluded.pg_amount_basis,
  sort_order      = excluded.sort_order;
