-- 0014_case_lines.sql
-- The underlying POS/PG rows behind a case. 0..n per side — one Grab payout
-- covering three bills, or one bill paid by two QR scans, are both normal.
-- Never assume 1:1. Gateway-specific fields live in `raw` jsonb.

create table public.case_lines (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.unrecon_cases (id) on delete cascade,
  side         text not null check (side in ('POS', 'PG')),
  gateway_code text,
  txn_datetime timestamptz,
  business_date date,
  external_ref text,
  tender_code  text,
  amount       numeric(12, 2),
  raw          jsonb,
  created_at   timestamptz not null default now()
);

create index case_lines_case_idx on public.case_lines (case_id);

comment on table public.case_lines is
  '0..n POS/PG lines per case. Gateway-specific columns go into raw jsonb.';
