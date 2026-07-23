-- 0005_payment_gateways.sql
-- Payment gateways. Tolerance is per-gateway and editable by admins
-- (e.g. Grab may later need widening to +/-0.10).

create table public.payment_gateways (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  tolerance_min numeric(10, 2) not null default -0.05,
  tolerance_max numeric(10, 2) not null default 0.05,
  is_active     boolean not null default true,
  sort_order    int not null default 0
);

comment on table public.payment_gateways is
  'Settlement channels. code is the natural key; tolerance bounds are editable.';
