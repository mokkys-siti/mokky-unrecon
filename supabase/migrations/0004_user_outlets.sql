-- 0004_user_outlets.sql
-- Which outlets a user covers. One user may cover several (area managers).
-- Finance/admin roles are not scoped here — they see all outlets via RLS.

create table public.user_outlets (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  outlet_id  uuid not null references public.outlets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, outlet_id)
);

create index user_outlets_outlet_id_idx on public.user_outlets (outlet_id);

comment on table public.user_outlets is
  'Membership: outlet users/managers can only see rows for outlets listed here.';
