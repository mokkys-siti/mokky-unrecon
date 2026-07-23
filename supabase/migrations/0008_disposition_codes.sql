-- 0008_disposition_codes.sql
-- Finance disposition outcomes applied when closing a case (Phase 4).
-- Created empty here; no seed values are defined yet.

create table public.disposition_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  label      text not null,
  is_active  boolean not null default true,
  sort_order int not null default 0
);

comment on table public.disposition_codes is
  'Finance close-out outcomes. Seeded later; table intentionally empty for now.';
