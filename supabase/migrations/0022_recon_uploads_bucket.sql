-- 0022_recon_uploads_bucket.sql
-- Private staging bucket for raw recon workbooks. Finance uploads files here
-- directly from the browser (bypassing the Server Action request-size cap), then
-- a server action downloads + parses each and removes it. Finance/admin only.

insert into storage.buckets (id, name, public, file_size_limit)
values ('recon-uploads', 'recon-uploads', false, 20971520)  -- 20 MB per file
on conflict (id) do nothing;

create policy "recon-uploads: finance insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recon-uploads' and (select public.is_finance_or_admin()));

create policy "recon-uploads: finance read"
  on storage.objects for select to authenticated
  using (bucket_id = 'recon-uploads' and (select public.is_finance_or_admin()));

create policy "recon-uploads: finance delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recon-uploads' and (select public.is_finance_or_admin()));
