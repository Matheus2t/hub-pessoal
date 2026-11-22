-- Synthetic schema/data for an isolated local Supabase stack. Never production data.
create schema private;
create table private.mind_admins (user_id uuid primary key);

create table public.mind_items (
  id uuid primary key,
  owner_id uuid not null,
  kind text not null,
  title text not null,
  topic text not null default 'Sem assunto',
  tags text[] not null default '{}',
  description text not null default '',
  content text not null default '',
  favorite boolean not null default false,
  file_name text,
  file_size bigint,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  video_url text,
  poster_data_url text
);
alter table public.mind_items enable row level security;
grant select on public.mind_items to anon, authenticated;
create policy mind_items_public_read on public.mind_items
  for select to anon, authenticated using (true);

revoke all on schema private from public, anon, authenticated;
revoke all on private.mind_admins from public, anon, authenticated, service_role;
alter table private.mind_admins enable row level security;

create or replace function public.mind_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.mind_admins where user_id = (select auth.uid())
  )
$$;
revoke all on function public.mind_is_admin() from public, anon;
grant execute on function public.mind_is_admin() to authenticated;

-- Local-only provisioning hook. service_role can call it; browser roles cannot.
create or replace function public.mind_codespaces_make_admin(p_admin_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into private.mind_admins(user_id) values (p_admin_id)
    on conflict (user_id) do nothing;
  return true;
end
$$;
revoke all on function public.mind_codespaces_make_admin(uuid) from public, anon, authenticated;
grant execute on function public.mind_codespaces_make_admin(uuid) to service_role;

insert into public.mind_items(id, owner_id, kind, title, file_name, file_size, storage_path, video_url) values
  ('00000000-0000-4000-8000-000000000001','11111111-2222-4333-8444-555555555555','note','Fixture note',null,null,null,null),
  ('00000000-0000-4000-8000-000000000002','11111111-2222-4333-8444-555555555555','pdf','Fixture PDF','paper.pdf',4,null,null),
  ('00000000-0000-4000-8000-000000000003','11111111-2222-4333-8444-555555555555','video','Fixture link',null,null,null,'https://www.youtube.com/watch?v=abcdefghijk'),
  ('00000000-0000-4000-8000-000000000004','11111111-2222-4333-8444-555555555555','video','Fixture Storage','legacy.mp4',5,'11111111-2222-4333-8444-555555555555/00000000-0000-4000-8000-000000000004.mp4',null);
