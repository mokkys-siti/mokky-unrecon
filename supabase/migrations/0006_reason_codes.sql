-- 0006_reason_codes.sql
-- The controlled vocabulary outlets pick from. applies_to_outlets NULL = all
-- outlets; a non-null array scopes the reason (e.g. FD button only at OGD, ZGD).
-- applies_to_gateways works the same way for gateways.

create table public.reason_codes (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  label               text not null,
  group_name          text,
  applies_to_outlets  text[],
  applies_to_gateways text[],
  requires_evidence   boolean not null default false,
  is_active           boolean not null default true,
  sort_order          int not null default 0
);

comment on column public.reason_codes.applies_to_outlets is
  'NULL = applies to all outlets. Non-null = only these outlet codes.';
