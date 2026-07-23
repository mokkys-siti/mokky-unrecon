-- 0016_cases_rls.sql
-- RLS for batches, stats, cases, lines, and layout config.
--   Finance (exec/manager) + admin: full read/write on batches/stats/cases/lines.
--   Outlets: read only their own cases that are outlet_visible AND from a
--     published batch. No outlet writes yet (responses arrive in Phase 3 with a
--     status-constrained policy). Layout config: read-all, admin-write.
-- No DELETE policies (soft delete only).

-- Convenience predicate reused below.
create or replace function public.is_finance_or_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.is_admin() or public.is_finance();
$$;

-- ---------------------------------------------------------------------------
-- recon_layouts / recon_gateway_columns — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.recon_layouts enable row level security;
create policy "recon_layouts: authenticated read"
  on public.recon_layouts for select to authenticated using (true);
create policy "recon_layouts: admin insert"
  on public.recon_layouts for insert to authenticated with check ((select public.is_admin()));
create policy "recon_layouts: admin update"
  on public.recon_layouts for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.recon_gateway_columns enable row level security;
create policy "recon_gateway_columns: authenticated read"
  on public.recon_gateway_columns for select to authenticated using (true);
create policy "recon_gateway_columns: admin insert"
  on public.recon_gateway_columns for insert to authenticated with check ((select public.is_admin()));
create policy "recon_gateway_columns: admin update"
  on public.recon_gateway_columns for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- recon_batches — finance/admin full; outlets read published batches for their outlets
-- ---------------------------------------------------------------------------
alter table public.recon_batches enable row level security;

create policy "recon_batches: finance/admin read"
  on public.recon_batches for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "recon_batches: outlet read published"
  on public.recon_batches for select to authenticated
  using (
    status = 'published'
    and deleted_at is null
    and outlet_id in (select public.auth_outlet_ids())
  );
create policy "recon_batches: finance/admin insert"
  on public.recon_batches for insert to authenticated
  with check ((select public.is_finance_or_admin()));
create policy "recon_batches: finance/admin update"
  on public.recon_batches for update to authenticated
  using ((select public.is_finance_or_admin()))
  with check ((select public.is_finance_or_admin()));

-- ---------------------------------------------------------------------------
-- batch_gateway_stats — finance/admin only
-- ---------------------------------------------------------------------------
alter table public.batch_gateway_stats enable row level security;
create policy "batch_gateway_stats: finance/admin read"
  on public.batch_gateway_stats for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "batch_gateway_stats: finance/admin insert"
  on public.batch_gateway_stats for insert to authenticated
  with check ((select public.is_finance_or_admin()));
create policy "batch_gateway_stats: finance/admin update"
  on public.batch_gateway_stats for update to authenticated
  using ((select public.is_finance_or_admin()))
  with check ((select public.is_finance_or_admin()));

-- ---------------------------------------------------------------------------
-- unrecon_cases — finance/admin full; outlets read own visible published cases
-- ---------------------------------------------------------------------------
alter table public.unrecon_cases enable row level security;

create policy "unrecon_cases: finance/admin read"
  on public.unrecon_cases for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "unrecon_cases: outlet read own visible"
  on public.unrecon_cases for select to authenticated
  using (
    outlet_visible = true
    and deleted_at is null
    and outlet_id in (select public.auth_outlet_ids())
    and exists (
      select 1 from public.recon_batches b
      where b.id = unrecon_cases.batch_id and b.status = 'published'
    )
  );
create policy "unrecon_cases: finance/admin insert"
  on public.unrecon_cases for insert to authenticated
  with check ((select public.is_finance_or_admin()));
create policy "unrecon_cases: finance/admin update"
  on public.unrecon_cases for update to authenticated
  using ((select public.is_finance_or_admin()))
  with check ((select public.is_finance_or_admin()));

-- ---------------------------------------------------------------------------
-- case_lines — visibility follows the parent case
-- ---------------------------------------------------------------------------
alter table public.case_lines enable row level security;

create policy "case_lines: finance/admin read"
  on public.case_lines for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "case_lines: outlet read via visible case"
  on public.case_lines for select to authenticated
  using (
    exists (
      select 1 from public.unrecon_cases c
      where c.id = case_lines.case_id
        and c.outlet_visible = true
        and c.deleted_at is null
        and c.outlet_id in (select public.auth_outlet_ids())
        and exists (
          select 1 from public.recon_batches b
          where b.id = c.batch_id and b.status = 'published'
        )
    )
  );
create policy "case_lines: finance/admin insert"
  on public.case_lines for insert to authenticated
  with check ((select public.is_finance_or_admin()));
