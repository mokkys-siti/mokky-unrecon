-- 0001_profiles.sql
-- Profiles (app-level identity + role), the JWT role plumbing, role helpers,
-- and RLS. This establishes the auth foundation every later table builds on.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       extensions.citext,
  role        text not null check (
                role in ('outlet_user', 'outlet_manager',
                         'finance_exec', 'finance_manager', 'admin')
              ),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz          -- soft delete only; no hard deletes anywhere
);

comment on table public.profiles is
  'App-level user identity and role. One row per auth.users row.';

-- ---------------------------------------------------------------------------
-- Role helpers — read the verified JWT claims. Used by RLS policies app-wide.
-- SECURITY INVOKER + empty search_path (all references fully-qualified).
-- ---------------------------------------------------------------------------
create or replace function public.app_role()
returns text
language sql
stable
set search_path = ''
as $$
  select auth.jwt() ->> 'app_role';
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.app_role() = 'admin';
$$;

create or replace function public.is_finance()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.app_role() in ('finance_exec', 'finance_manager');
$$;

comment on function public.app_role() is
  'The app_role claim from the current request JWT (null if hook disabled).';

-- ---------------------------------------------------------------------------
-- Custom Access Token Hook — injects `app_role` into every issued JWT.
-- Runs as the supabase_auth_admin role at token issuance. Must be enabled in
-- the dashboard (Authentication -> Hooks) or via config.toml for the project.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  claims    jsonb;
  found_role text;
begin
  select role
    into found_role
    from public.profiles
   where id = (event ->> 'user_id')::uuid
     and is_active
     and deleted_at is null;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if found_role is not null then
    claims := jsonb_set(claims, '{app_role}', to_jsonb(found_role));
  else
    -- No active profile -> explicit null so the app can detect a missing role.
    claims := jsonb_set(claims, '{app_role}', 'null'::jsonb);
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grants required for the auth hook to run and read roles despite RLS.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- RLS: users read only their own profile; admins read/write all.
-- No self-writes (prevents role self-escalation); no DELETE policy (no hard
-- deletes). The seed script uses the service role, which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: self can read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: admin can read all"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

create policy "profiles: admin can insert"
  on public.profiles for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "profiles: admin can update"
  on public.profiles for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- The token hook (as supabase_auth_admin) must read every role.
create policy "profiles: auth admin can read for token hook"
  on public.profiles for select
  to supabase_auth_admin
  using (true);
