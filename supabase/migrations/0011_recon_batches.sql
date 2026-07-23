-- 0011_recon_batches.sql
-- One row per uploaded recon file (one outlet, one period). file_hash prevents
-- accidentally uploading the same file twice. Cases are only visible to outlets
-- once status = 'published' (finance confirms on the review screen).

create table public.recon_batches (
  id              uuid primary key default gen_random_uuid(),
  outlet_id       uuid not null references public.outlets (id),
  period_label    text,
  period_start    date,
  period_end      date,
  source_filename text,
  file_hash       text,
  uploaded_by     uuid references public.profiles (id),
  uploaded_at     timestamptz not null default now(),
  status          text not null default 'parsing'
                    check (status in ('parsing', 'review', 'published', 'failed')),
  parse_summary   jsonb,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Same file (by content hash) can't be ingested twice for the same outlet.
create unique index recon_batches_outlet_hash_uniq
  on public.recon_batches (outlet_id, file_hash)
  where file_hash is not null and deleted_at is null;

create index recon_batches_outlet_idx on public.recon_batches (outlet_id);
create index recon_batches_status_idx on public.recon_batches (status);

comment on table public.recon_batches is
  'One uploaded recon workbook. Outlets see its cases only when status=published.';
