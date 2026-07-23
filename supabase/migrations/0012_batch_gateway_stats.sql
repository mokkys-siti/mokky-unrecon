-- 0012_batch_gateway_stats.sql
-- Per-gateway parse stats for a batch. Drives the feed-completeness gate: a
-- gateway that previously had data but now reads zero rows blocks publication
-- (a broken feed looks perfectly reconciled but isn't).

create table public.batch_gateway_stats (
  id           uuid primary key default gen_random_uuid(),
  batch_id     uuid not null references public.recon_batches (id) on delete cascade,
  gateway_code text not null,
  rows_read    int not null default 0,
  rows_junk    int not null default 0,
  rows_kept    int not null default 0,
  total_amount numeric(14, 2) not null default 0,
  feed_status  text not null default 'ok'
                 check (feed_status in ('ok', 'empty', 'error')),
  created_at   timestamptz not null default now(),
  unique (batch_id, gateway_code)
);

comment on table public.batch_gateway_stats is
  'Per-gateway rows read/junk/kept + total, per batch. Feeds the completeness gate.';
