-- 0009_reference_rls.sql
-- RLS for all reference/config tables.
--   outlets / user_outlets : row-scoped to the user's outlets; finance+admin see all.
--   entities / gateways / reason_codes / classification_rules / disposition_codes:
--       read-all for any authenticated user; writes are admin-only.
-- No DELETE policy anywhere (no hard deletes; use deleted_at / is_active).

-- ---------------------------------------------------------------------------
-- Live outlet-membership lookup. SECURITY DEFINER so it bypasses RLS on
-- user_outlets (no recursion) and always reflects current membership — not a
-- stale JWT claim. Used by the outlets read policy.
-- ---------------------------------------------------------------------------
create or replace function public.auth_outlet_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select outlet_id from public.user_outlets where user_id = auth.uid();
$$;

revoke execute on function public.auth_outlet_ids() from public, anon;
grant execute on function public.auth_outlet_ids() to authenticated;

comment on function public.auth_outlet_ids() is
  'Outlet ids the current user covers (from user_outlets). SECURITY DEFINER.';

-- ---------------------------------------------------------------------------
-- entities — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.entities enable row level security;

create policy "entities: authenticated read"
  on public.entities for select to authenticated using (true);
create policy "entities: admin insert"
  on public.entities for insert to authenticated
  with check ((select public.is_admin()));
create policy "entities: admin update"
  on public.entities for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- outlets — outlet members + finance/admin read; admin write
-- ---------------------------------------------------------------------------
alter table public.outlets enable row level security;

create policy "outlets: members + finance/admin read"
  on public.outlets for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_finance())
    or id in (select public.auth_outlet_ids())
  );
create policy "outlets: admin insert"
  on public.outlets for insert to authenticated
  with check ((select public.is_admin()));
create policy "outlets: admin update"
  on public.outlets for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- user_outlets — self + finance/admin read; admin write
-- ---------------------------------------------------------------------------
alter table public.user_outlets enable row level security;

create policy "user_outlets: self + finance/admin read"
  on public.user_outlets for select to authenticated
  using (
    (select public.is_admin())
    or (select public.is_finance())
    or user_id = (select auth.uid())
  );
create policy "user_outlets: admin insert"
  on public.user_outlets for insert to authenticated
  with check ((select public.is_admin()));
create policy "user_outlets: admin update"
  on public.user_outlets for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- payment_gateways — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.payment_gateways enable row level security;

create policy "payment_gateways: authenticated read"
  on public.payment_gateways for select to authenticated using (true);
create policy "payment_gateways: admin insert"
  on public.payment_gateways for insert to authenticated
  with check ((select public.is_admin()));
create policy "payment_gateways: admin update"
  on public.payment_gateways for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- reason_codes — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.reason_codes enable row level security;

create policy "reason_codes: authenticated read"
  on public.reason_codes for select to authenticated using (true);
create policy "reason_codes: admin insert"
  on public.reason_codes for insert to authenticated
  with check ((select public.is_admin()));
create policy "reason_codes: admin update"
  on public.reason_codes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- classification_rules — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.classification_rules enable row level security;

create policy "classification_rules: authenticated read"
  on public.classification_rules for select to authenticated using (true);
create policy "classification_rules: admin insert"
  on public.classification_rules for insert to authenticated
  with check ((select public.is_admin()));
create policy "classification_rules: admin update"
  on public.classification_rules for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- disposition_codes — read-all, admin-write
-- ---------------------------------------------------------------------------
alter table public.disposition_codes enable row level security;

create policy "disposition_codes: authenticated read"
  on public.disposition_codes for select to authenticated using (true);
create policy "disposition_codes: admin insert"
  on public.disposition_codes for insert to authenticated
  with check ((select public.is_admin()));
create policy "disposition_codes: admin update"
  on public.disposition_codes for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
