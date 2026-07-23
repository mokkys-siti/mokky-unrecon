-- 0018_rls_deleted_batch_gate.sql
-- Fix: outlet case/line visibility gated on a published batch but not on the
-- batch being non-deleted. Retracting a published batch (deleted_at) hid it from
-- the outlet's batch list yet left its cases/lines visible. Add deleted_at IS NULL.

drop policy if exists "unrecon_cases: outlet read own visible" on public.unrecon_cases;
create policy "unrecon_cases: outlet read own visible"
  on public.unrecon_cases for select to authenticated
  using (
    outlet_visible = true
    and deleted_at is null
    and outlet_id in (select public.auth_outlet_ids())
    and exists (
      select 1 from public.recon_batches b
      where b.id = unrecon_cases.batch_id
        and b.status = 'published'
        and b.deleted_at is null
    )
  );

drop policy if exists "case_lines: outlet read via visible case" on public.case_lines;
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
          where b.id = c.batch_id
            and b.status = 'published'
            and b.deleted_at is null
        )
    )
  );
