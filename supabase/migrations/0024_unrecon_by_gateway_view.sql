-- 0024_unrecon_by_gateway_view.sql
-- Unresolved unrecon items per outlet x gateway, for the dashboard's
-- "which outlet, from which PG" breakdown. security_invoker so RLS applies.
-- Counts anything not yet closed/auto-closed (visible + system alike).

create or replace view public.unrecon_by_outlet_gateway
with (security_invoker = true) as
select
  o.id   as outlet_id,
  o.code,
  c.gateway_code,
  count(c.id)                              as unrecon_count,
  coalesce(sum(abs(c.variance)), 0)        as unrecon_amount
from public.outlets o
join public.unrecon_cases c
  on c.outlet_id = o.id
 and c.deleted_at is null
 and c.status not in ('closed', 'auto_closed')
where o.deleted_at is null
group by o.id, o.code, c.gateway_code;

grant select on public.unrecon_by_outlet_gateway to authenticated;

comment on view public.unrecon_by_outlet_gateway is
  'Open unrecon case counts + amounts per outlet and payment gateway.';
