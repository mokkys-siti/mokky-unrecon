-- 0019_case_responses_events.sql
-- Phase 3-4 tables: case_responses, case_attachments, case_events.
-- Design: outlets NEVER update unrecon_cases directly (they have no such
-- policy). They INSERT a case_responses row (RLS-scoped to their own visible,
-- published, answerable cases). A SECURITY DEFINER trigger then transitions the
-- case to 'outlet_responded' and writes an append-only case_event. This makes
-- "outlets never close their own cases" a structural guarantee, and reason
-- codes mandatory (reason_code_id is NOT NULL).

create table public.case_responses (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.unrecon_cases (id) on delete cascade,
  user_id        uuid not null references public.profiles (id),
  reason_code_id uuid not null references public.reason_codes (id),
  remarks        text,
  submitted_at   timestamptz not null default now()
);
create index case_responses_case_idx on public.case_responses (case_id);

create table public.case_attachments (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.unrecon_cases (id) on delete cascade,
  storage_path text not null,
  filename     text,
  mime_type    text,
  size_bytes   int,
  uploaded_by  uuid references public.profiles (id),
  uploaded_at  timestamptz not null default now()
);
create index case_attachments_case_idx on public.case_attachments (case_id);

create table public.case_events (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.unrecon_cases (id) on delete cascade,
  event_type text not null,
  actor_id   uuid references public.profiles (id),
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index case_events_case_idx on public.case_events (case_id);

comment on table public.case_events is 'Append-only audit log. No UPDATE or DELETE, ever.';

-- ---------------------------------------------------------------------------
-- Trigger: a response transitions its case and logs an event (bypasses the
-- outlet's lack of update rights via SECURITY DEFINER).
-- ---------------------------------------------------------------------------
create or replace function public.on_case_response_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.unrecon_cases
     set status = 'outlet_responded',
         reason_code_id = new.reason_code_id,
         updated_at = now()
   where id = new.case_id
     and status in ('open', 'awaiting_outlet');

  insert into public.case_events (case_id, event_type, actor_id, payload)
  values (new.case_id, 'outlet_responded', new.user_id,
          jsonb_build_object('response_id', new.id, 'reason_code_id', new.reason_code_id));

  return new;
end;
$$;

create trigger case_response_after_insert
  after insert on public.case_responses
  for each row execute function public.on_case_response_insert();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.case_responses enable row level security;
alter table public.case_attachments enable row level security;
alter table public.case_events enable row level security;

-- A case the current outlet user may act on (own, visible, published, answerable).
create or replace function public.outlet_can_answer(target_case uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.unrecon_cases c
      join public.recon_batches b on b.id = c.batch_id
     where c.id = target_case
       and c.outlet_visible = true
       and c.deleted_at is null
       and c.status in ('open', 'awaiting_outlet')
       and b.status = 'published'
       and b.deleted_at is null
       and c.outlet_id in (select public.auth_outlet_ids())
  );
$$;
revoke execute on function public.outlet_can_answer(uuid) from public, anon;
grant execute on function public.outlet_can_answer(uuid) to authenticated;

-- case_responses: outlets insert for answerable cases; read own; finance/admin all.
create policy "case_responses: outlet insert own answerable"
  on public.case_responses for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.outlet_can_answer(case_id)));
create policy "case_responses: finance/admin insert"
  on public.case_responses for insert to authenticated
  with check ((select public.is_finance_or_admin()));
create policy "case_responses: finance/admin read"
  on public.case_responses for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "case_responses: outlet read own"
  on public.case_responses for select to authenticated
  using (
    exists (
      select 1 from public.unrecon_cases c
      where c.id = case_responses.case_id
        and c.outlet_id in (select public.auth_outlet_ids())
        and c.outlet_visible = true
    )
  );

-- case_attachments: same shape as responses.
create policy "case_attachments: outlet insert own answerable"
  on public.case_attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and (select public.outlet_can_answer(case_id)));
create policy "case_attachments: finance/admin insert"
  on public.case_attachments for insert to authenticated
  with check ((select public.is_finance_or_admin()));
create policy "case_attachments: finance/admin read"
  on public.case_attachments for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "case_attachments: outlet read own"
  on public.case_attachments for select to authenticated
  using (
    exists (
      select 1 from public.unrecon_cases c
      where c.id = case_attachments.case_id
        and c.outlet_id in (select public.auth_outlet_ids())
        and c.outlet_visible = true
    )
  );

-- case_events: readable by finance/admin (all) and outlets (their visible cases).
-- INSERT allowed for finance/admin and the SECURITY DEFINER trigger. NEVER
-- UPDATE or DELETE — enforced by having no such policy AND revoking the grants.
create policy "case_events: finance/admin read"
  on public.case_events for select to authenticated
  using ((select public.is_finance_or_admin()));
create policy "case_events: outlet read own"
  on public.case_events for select to authenticated
  using (
    exists (
      select 1 from public.unrecon_cases c
      where c.id = case_events.case_id
        and c.outlet_id in (select public.auth_outlet_ids())
        and c.outlet_visible = true
    )
  );
create policy "case_events: finance/admin insert"
  on public.case_events for insert to authenticated
  with check ((select public.is_finance_or_admin()));

revoke update, delete on public.case_events from authenticated, anon;
