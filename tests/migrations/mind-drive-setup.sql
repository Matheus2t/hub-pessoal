create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema private;
create table private.mind_admins (user_id uuid primary key);
create table public.mind_items (
  id uuid primary key, owner_id uuid not null, kind text not null, title text not null,
  topic text not null default 'Sem assunto', tags text[] not null default '{}',
  description text not null default '', content text not null default '', favorite boolean not null default false,
  file_name text, file_size bigint, storage_path text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), video_url text, poster_data_url text
);
insert into private.mind_admins values ('11111111-2222-4333-8444-555555555555');
insert into public.mind_items(id,owner_id,kind,title,file_name,file_size,storage_path,video_url) values
 ('00000000-0000-4000-8000-000000000001','11111111-2222-4333-8444-555555555555','note','Legacy note',null,null,null,null),
 ('00000000-0000-4000-8000-000000000002','11111111-2222-4333-8444-555555555555','pdf','Legacy PDF','paper.pdf',4,null,null),
 ('00000000-0000-4000-8000-000000000003','11111111-2222-4333-8444-555555555555','video','Legacy link',null,null,null,'https://www.youtube.com/watch?v=abcdefghijk'),
 ('00000000-0000-4000-8000-000000000004','11111111-2222-4333-8444-555555555555','video','Legacy Storage','legacy.mp4',5,'11111111-2222-4333-8444-555555555555/00000000-0000-4000-8000-000000000004.mp4',null);