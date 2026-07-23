-- 0013_unrecon_cases.sql
-- One unreconciled case. case_key is a deterministic natural key so re-imports
-- are idempotent (an unresolved case ages up, it is not re-created).
-- variance is ALWAYS pg - pos (positive = overpaid) — same convention forever.
-- or_sequence is snapshotted on first sight and never overwritten.

create table public.unrecon_cases (
  id                  uuid primary key default gen_random_uuid(),
  case_key            text not null unique,
  batch_id            uuid not null references public.recon_batches (id),
  first_seen_batch_id uuid references public.recon_batches (id),
  outlet_id           uuid not null references public.outlets (id),
  gateway_code        text not null,
  business_date       date,
  case_type           text not null
                        check (case_type in
                               ('BILL_NO_PAYMENT', 'PAYMENT_NO_BILL', 'VARIANCE')),
  classification      text,
  fault_owner         text,
  outlet_visible      boolean not null default false,
  pos_amount          numeric(12, 2),
  pg_amount           numeric(12, 2),
  variance            numeric(12, 2)
                        generated always as
                        (coalesce(pg_amount, 0) - coalesce(pos_amount, 0)) stored,
  status              text not null default 'open'
                        check (status in ('open', 'awaiting_outlet',
                               'outlet_responded', 'under_review',
                               'closed', 'auto_closed')),
  reason_code_id      uuid references public.reason_codes (id),
  disposition_code_id uuid references public.disposition_codes (id),
  or_sequence         text,
  merged_into_case_id uuid references public.unrecon_cases (id),
  first_seen_at       timestamptz not null default now(),
  closed_at           timestamptz,
  closed_by           uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index unrecon_cases_batch_idx on public.unrecon_cases (batch_id);
create index unrecon_cases_outlet_idx on public.unrecon_cases (outlet_id);
create index unrecon_cases_status_idx on public.unrecon_cases (status);
create index unrecon_cases_outlet_visible_idx
  on public.unrecon_cases (outlet_id, outlet_visible);

comment on column public.unrecon_cases.variance is
  'PG minus POS. Positive = overpaid. This convention is identical everywhere.';
comment on column public.unrecon_cases.or_sequence is
  'Snapshotted on first sight; never overwritten. Flag mismatches, do not update.';
