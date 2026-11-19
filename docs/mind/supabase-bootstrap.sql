-- 2T Mente Cloud: run on a DEDICATED Supabase project, not on another 2T project.
-- No user is authorized until the administrator explicitly adds their UUID to private.mind_admins.
-- Disable public sign-ups and anonymous auth at Authentication > Providers before rollout.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.mind_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.mind_admins from public, anon, authenticated;
create or replace function private.is_mind_admin()
returns boolean language sql stable security definer set search_path = ''
as $$select exists(select 1 from private.mind_admins a where a.user_id = (select auth.uid()));$$;
revoke all on function private.is_mind_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_mind_admin() to authenticated;
create or replace function public.mind_is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$select private.is_mind_admin();$$;
revoke all on function public.mind_is_admin() from public, anon;
grant execute on function public.mind_is_admin() to authenticated;

create table if not exists public.mind_items (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check(kind in ('note','pdf')),
  title varchar(180) not null check(length(trim(title)) > 0),
  topic varchar(80) not null default 'Sem assunto',
  tags text[] not null default '{}',
  description varchar(3000) not null default '',
  content varchar(250000) not null default '',
  favorite boolean not null default false,
  file_name varchar(180),
  file_size bigint check(file_size is null or (file_size > 0 and file_size <= 26214400)),
  storage_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mind_note_no_file check(kind <> 'note' or (file_name is null and file_size is null and storage_path is null)),
  constraint mind_tags_max check(coalesce(array_length(tags,1),0) <= 12)
);
alter table public.mind_items enable row level security;
revoke all on table public.mind_items from public, anon;
grant select,insert,update,delete on table public.mind_items to authenticated;

create policy mind_admin_select on public.mind_items for select to authenticated
using (owner_id = (select auth.uid()) and (select private.is_mind_admin()));
create policy mind_admin_insert on public.mind_items for insert to authenticated
with check (owner_id = (select auth.uid()) and (select private.is_mind_admin()));
create policy mind_admin_update on public.mind_items for update to authenticated
using (owner_id = (select auth.uid()) and (select private.is_mind_admin()))
with check (owner_id = (select auth.uid()) and (select private.is_mind_admin()));
create policy mind_admin_delete on public.mind_items for delete to authenticated
using (owner_id = (select auth.uid()) and (select private.is_mind_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mind-pdfs', 'mind-pdfs', false, 26214400, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 26214400,
allowed_mime_types = array['application/pdf'];

create policy mind_storage_select on storage.objects for select to authenticated
using (bucket_id = 'mind-pdfs' and (select private.is_mind_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy mind_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'mind-pdfs' and (select private.is_mind_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) = 'pdf');
create policy mind_storage_update on storage.objects for update to authenticated
using (bucket_id = 'mind-pdfs' and (select private.is_mind_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'mind-pdfs' and (select private.is_mind_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and lower(storage.extension(name)) = 'pdf');
create policy mind_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'mind-pdfs' and (select private.is_mind_admin())
  and (storage.foldername(name))[1] = (select auth.uid())::text);
commit;
-- After creating the owner's account in Authentication > Users, run manually:
-- insert into private.mind_admins(user_id) values ('YOUR_AUTH_USER_UUID');
-- Never commit a real user's UUID, credentials or private notes to the repository.
