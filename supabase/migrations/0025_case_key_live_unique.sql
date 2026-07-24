-- 0025_case_key_live_unique.sql
-- Bug fix: case_key was globally UNIQUE, so once a batch was soft-deleted its
-- cases still reserved their keys. Re-uploading the corrected file then either
-- collided on the unique constraint or silently "aged up" the deleted rows,
-- producing zero visible cases. Make uniqueness apply to LIVE rows only, so a
-- deleted case never blocks a fresh import of the same item.

alter table public.unrecon_cases drop constraint if exists unrecon_cases_case_key_key;

create unique index if not exists unrecon_cases_case_key_live_uniq
  on public.unrecon_cases (case_key)
  where deleted_at is null;

comment on index public.unrecon_cases_case_key_live_uniq is
  'case_key is unique among live (non-deleted) cases only.';
