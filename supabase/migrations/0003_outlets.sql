-- 0003_outlets.sql
-- Outlets. `code` (OBJ, OBT, ...) is the natural key used everywhere and is
-- NOT derivable from the outlet name — always look it up by code.

create table public.outlets (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  zeoniq_name text,
  brand       text,
  entity_id   uuid references public.entities (id),
  status      text not null default 'active'
                check (status in ('active', 'closed', 'not_open')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

comment on column public.outlets.code is
  'Natural key (e.g. OBJ, OBT). Unique. Never derived from the name.';
