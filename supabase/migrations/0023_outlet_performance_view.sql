-- 0023_outlet_performance_view.sql
-- Per-outlet case performance for the finance dashboard. security_invoker so the
-- caller's RLS applies (finance sees all outlets; the view never leaks across
-- outlets to an outlet user). Aggregates in the DB rather than shipping rows.

create or replace view public.outlet_performance
with (security_invoker = true) as
select
  o.id   as outlet_id,
  o.code,
  o.zeoniq_name,
  o.status as outlet_status,
  count(c.id) filter (where c.outlet_visible)                                              as visible_total,
  count(c.id) filter (where c.outlet_visible and c.status in ('open', 'awaiting_outlet'))  as awaiting,
  count(c.id) filter (where c.outlet_visible and c.status in ('outlet_responded', 'under_review')) as responded,
  count(c.id) filter (where c.outlet_visible and c.status = 'closed')                      as closed,
  count(c.id) filter (where c.status = 'auto_closed')                                      as auto_closed,
  count(c.id) filter (where not c.outlet_visible and c.status not in ('closed', 'auto_closed')) as system_open,
  coalesce(
    sum(abs(c.variance)) filter (where c.outlet_visible and c.status in ('open', 'awaiting_outlet')),
    0
  ) as outstanding_amount
from public.outlets o
left join public.unrecon_cases c
  on c.outlet_id = o.id and c.deleted_at is null
where o.deleted_at is null
group by o.id, o.code, o.zeoniq_name, o.status;

grant select on public.outlet_performance to authenticated;

comment on view public.outlet_performance is
  'Per-outlet case counts + outstanding exposure for the finance dashboard.';
