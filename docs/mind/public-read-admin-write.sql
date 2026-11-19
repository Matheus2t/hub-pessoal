-- 2T Mente: public reading, authenticated administrator-only mutations.
-- Applied to Supabase 2T'Site on 2026-11-19.
-- WARNING: all existing Mente notes and PDFs become publicly readable.
-- The administrator must upload only content intended for public distribution.
begin;
grant select on table public.mind_items to anon;
create policy mind_public_read on public.mind_items
  for select to anon, authenticated using (true);
update storage.buckets set public = true where id = 'mind-pdfs';
commit;
-- Keep existing mind_admin_insert/update/delete and mind_storage_insert/update/delete.
-- No public INSERT/UPDATE/DELETE grants, no public sign-up, no service-role client key.
