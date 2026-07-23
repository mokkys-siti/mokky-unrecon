-- 0002_entities.sql
-- Legal entities (SDN BHD companies) that own outlets. Six of them.

create table public.entities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  registration_no text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

comment on table public.entities is
  'Legal operating companies. name is unique (used as the seed natural key).';
