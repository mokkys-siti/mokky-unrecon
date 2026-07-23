-- 0020_evidence_storage.sql
-- Private evidence bucket. Objects are stored under {outlet_id}/{case_id}/file
-- so RLS can path-scope by outlet. Access is via signed URLs only (bucket is
-- not public). Outlets read/write only their own outlet's folder; finance/admin
-- read all.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-evidence', 'case-evidence', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

create policy "case-evidence: outlet insert own outlet folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'case-evidence'
    and (storage.foldername(name))[1]::uuid in (select public.auth_outlet_ids())
  );

create policy "case-evidence: outlet read own outlet folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'case-evidence'
    and (storage.foldername(name))[1]::uuid in (select public.auth_outlet_ids())
  );

create policy "case-evidence: finance/admin read all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'case-evidence'
    and (select public.is_finance_or_admin())
  );
