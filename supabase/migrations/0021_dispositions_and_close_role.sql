-- 0021_dispositions_and_close_role.sql
-- Phase 4: seed disposition codes and enforce close rights at the RLS layer.
-- finance_exec may write cases (e.g. reject -> awaiting_outlet) but may NOT set
-- status='closed'; only finance_manager/admin can close.

insert into public.disposition_codes (code, label, sort_order) values
  ('ACCEPTED',      'Accepted outlet explanation', 1),
  ('ADJUSTED',      'Adjusted in accounts',        2),
  ('CORRECTED_POS', 'Corrected in POS',            3),
  ('GATEWAY_ISSUE', 'Gateway / system issue',      4),
  ('WRITTEN_OFF',   'Written off (immaterial)',    5),
  ('DUPLICATE',     'Duplicate / no action',       6)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order;

create or replace function public.is_finance_manager()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.app_role() = 'finance_manager';
$$;

-- Tighten the finance update policy: closing requires manager/admin.
drop policy if exists "unrecon_cases: finance/admin update" on public.unrecon_cases;
create policy "unrecon_cases: finance/admin update"
  on public.unrecon_cases for update to authenticated
  using ((select public.is_finance_or_admin()))
  with check (
    (select public.is_finance_or_admin())
    and (
      status <> 'closed'
      or (select public.is_admin())
      or (select public.is_finance_manager())
    )
  );
