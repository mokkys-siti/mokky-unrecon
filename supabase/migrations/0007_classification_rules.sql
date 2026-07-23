-- 0007_classification_rules.sql
-- Rules that classify a case (evaluated by ascending priority, first match
-- wins). Stored as data so an admin can edit policy without a redeploy.
-- `name` is unique (the seed's natural key); `priority` is the eval order.

create table public.classification_rules (
  id             uuid primary key default gen_random_uuid(),
  priority       int not null,
  name           text not null unique,
  tender_from    text,
  tender_to      text,
  condition      text,
  classification text not null
                   check (classification in
                          ('OUTLET_ERROR', 'SYSTEM', 'ROUNDING', 'OPEN')),
  fault_owner    text not null
                   check (fault_owner in
                          ('OUTLET', 'GATEWAY', 'POS_SYSTEM', 'TIMING', 'FINANCE')),
  outlet_visible boolean not null default true,
  auto_close     boolean not null default false,
  is_active      boolean not null default true
);

create index classification_rules_priority_idx
  on public.classification_rules (priority);

comment on table public.classification_rules is
  'Case classification policy. Evaluated ascending by priority, first match wins.';
