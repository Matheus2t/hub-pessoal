-- Additive Google Drive storage ledger. Historical rows and Storage objects remain untouched.
begin;

alter table public.mind_items add column if not exists storage_provider text;
alter table public.mind_items add column if not exists drive_file_id text;
create unique index if not exists mind_items_drive_file_id_unique on public.mind_items(drive_file_id) where drive_file_id is not null;
alter table public.mind_items drop constraint if exists mind_items_file_size_check;
alter table public.mind_items add constraint mind_items_file_size_check check (
  file_size is null or file_size > 0 and (
    (kind='pdf' and file_size<=26214400) or
    (kind='video' and video_url is null and (
      (drive_file_id is not null and storage_provider='google-drive' and storage_path is null and file_size<=5000000000) or
      (drive_file_id is null and storage_provider is distinct from 'google-drive' and file_size<=50000000)
    ))
  )
);
alter table public.mind_items drop constraint if exists mind_video_source_check;
alter table public.mind_items add constraint mind_video_source_check check ((
  (kind<>'video' and video_url is null and drive_file_id is null and storage_provider is null) or
  (kind='video' and (
    (video_url is not null and (video_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$' or video_url ~ '^https://vimeo[.]com/[0-9]{1,18}$') and storage_path is null and drive_file_id is null and storage_provider is null and file_name is null and file_size is null) or
    (video_url is null and drive_file_id is not null and drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$' and storage_path is null and storage_provider='google-drive' and file_name is not null and file_size between 1 and 5000000000) or
    (video_url is null and drive_file_id is null and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?[.]mp4$' and storage_provider is distinct from 'google-drive' and file_name is not null and file_size between 1 and 50000000)
  ))
) is true);

create schema if not exists private;
create table if not exists private.mind_drive_connections (
  admin_id uuid primary key references private.mind_admins(user_id) on delete cascade,
  refresh_token_cipher text not null, google_email text not null, google_subject text not null, folder_id text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists private.mind_drive_uploads (
  upload_id text primary key check (upload_id ~ '^[0-9a-f]{32}$'),
  admin_id uuid not null references private.mind_admins(user_id) on delete cascade,
  item_id uuid not null, file_name text not null check (length(file_name) between 1 and 180),
  expected_size bigint not null check (expected_size between 1 and 5000000000), confirmed_size bigint,
  drive_file_id text, session_uri_cipher text, session_expires_at timestamptz, session_claimed_at timestamptz,
  status text not null check (status in ('reserved','creating','uploading','uploaded','published','cancelled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (admin_id, drive_file_id)
);
create unique index if not exists mind_drive_one_active_upload_per_item on private.mind_drive_uploads(admin_id,item_id)
  where status in ('reserved','creating','uploading','uploaded');
create table if not exists private.mind_drive_assets (
  admin_id uuid not null references private.mind_admins(user_id) on delete cascade,
  drive_file_id text not null, file_name text not null, mime_type text,
  size_bytes bigint not null check (size_bytes between 0 and 5000000000), trashed boolean not null default false,
  item_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  missing_at timestamptz, delete_claimed_at timestamptz, primary key (admin_id,drive_file_id)
);
alter table private.mind_drive_connections enable row level security;
alter table private.mind_drive_uploads enable row level security;
alter table private.mind_drive_assets enable row level security;
revoke all on private.mind_drive_connections,private.mind_drive_uploads,private.mind_drive_assets from public,anon,authenticated,service_role;

create or replace function public.mind_drive_get_connection(p_admin_id uuid)
returns jsonb language sql security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('admin_id',admin_id,'refresh_token_cipher',refresh_token_cipher,
    'google_email',google_email,'google_subject',google_subject,'folder_id',folder_id)
    from private.mind_drive_connections where admin_id=p_admin_id),'{}'::jsonb)
$$;
create or replace function public.mind_drive_save_connection(p_admin_id uuid,p_refresh_token_cipher text,p_google_email text,p_google_subject text,p_folder_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from private.mind_admins where user_id=p_admin_id) then raise exception 'not admin'; end if;
  if length(p_refresh_token_cipher)>4096 or length(p_google_email)>320 or length(p_google_subject)>255 or length(p_folder_id)>255 then raise exception 'invalid connection'; end if;
  insert into private.mind_drive_connections(admin_id,refresh_token_cipher,google_email,google_subject,folder_id)
    values(p_admin_id,p_refresh_token_cipher,p_google_email,p_google_subject,p_folder_id)
    on conflict(admin_id) do update set refresh_token_cipher=excluded.refresh_token_cipher,google_email=excluded.google_email,
      google_subject=excluded.google_subject,folder_id=excluded.folder_id,updated_at=now();
  return true;
end $$;
create or replace function public.mind_drive_disconnect(p_admin_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from private.mind_admins where user_id=p_admin_id) then raise exception 'not admin'; end if;
  if exists(select 1 from private.mind_drive_uploads where admin_id=p_admin_id and status in ('reserved','creating','uploading','uploaded')) then raise exception 'active upload'; end if;
  delete from private.mind_drive_connections where admin_id=p_admin_id;
  return true;
end $$;

create or replace function public.mind_drive_reconcile(p_admin_id uuid,p_scan_started_at timestamptz,p_assets jsonb,p_folder_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_used bigint; v_reserved bigint; v_orphans jsonb; v_upload private.mind_drive_uploads%rowtype; v_matches integer; v_file record;
begin
  if not exists(select 1 from private.mind_admins where user_id=p_admin_id) then raise exception 'not admin'; end if;
  if jsonb_typeof(p_assets)<>'array' or p_folder_id !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception 'invalid snapshot'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  insert into private.mind_drive_assets(admin_id,drive_file_id,file_name,size_bytes,trashed,mime_type)
    select p_admin_id,a.file_id,left(a.file_name,180),a.size_bytes,coalesce(a.trashed,false),a.mime_type
    from jsonb_to_recordset(p_assets) as a(file_id text,file_name text,size_bytes bigint,trashed boolean,mime_type text,upload_id text,parents jsonb)
    where a.file_id ~ '^[A-Za-z0-9_-]{10,200}$' and a.size_bytes between 0 and 5000000000
    on conflict(admin_id,drive_file_id) do update set file_name=excluded.file_name,size_bytes=excluded.size_bytes,
      trashed=excluded.trashed,mime_type=excluded.mime_type,missing_at=null,updated_at=now();
  for v_upload in select * from private.mind_drive_uploads where admin_id=p_admin_id and status='uploading' loop
    select count(*) into v_matches from jsonb_to_recordset(p_assets) as a(file_id text,file_name text,size_bytes bigint,trashed boolean,mime_type text,upload_id text,parents jsonb)
      where a.upload_id=v_upload.upload_id and a.file_id ~ '^[A-Za-z0-9_-]{10,200}$'
        and a.size_bytes=v_upload.expected_size and a.mime_type='video/mp4' and coalesce(a.trashed,false)=false
        and coalesce(a.parents,'[]'::jsonb) ? p_folder_id;
    if v_matches=1 then
      select a.file_id,a.file_name,a.size_bytes into v_file from jsonb_to_recordset(p_assets) as a(file_id text,file_name text,size_bytes bigint,trashed boolean,mime_type text,upload_id text,parents jsonb)
        where a.upload_id=v_upload.upload_id and a.file_id ~ '^[A-Za-z0-9_-]{10,200}$'
          and a.size_bytes=v_upload.expected_size and a.mime_type='video/mp4' and coalesce(a.trashed,false)=false
          and coalesce(a.parents,'[]'::jsonb) ? p_folder_id;
      update private.mind_drive_uploads set status='uploaded',drive_file_id=v_file.file_id,confirmed_size=v_file.size_bytes,
        file_name=left(coalesce(v_file.file_name,v_upload.file_name),180),session_uri_cipher=null,updated_at=now()
        where admin_id=p_admin_id and upload_id=v_upload.upload_id and status='uploading';
    end if;
  end loop;
  update private.mind_drive_assets a set item_id=(select mi.id from public.mind_items mi where mi.drive_file_id=a.drive_file_id limit 1)
    where a.admin_id=p_admin_id;
  update private.mind_drive_assets a set missing_at=now(),updated_at=now()
    where a.admin_id=p_admin_id and a.missing_at is null and a.updated_at<p_scan_started_at
      and not exists(select 1 from jsonb_to_recordset(p_assets) as s(file_id text) where s.file_id=a.drive_file_id);
  update private.mind_drive_uploads set status='cancelled',session_uri_cipher=null,updated_at=now()
    where admin_id=p_admin_id and (
      (status in ('reserved','creating') and created_at<now()-interval '1 hour') or
      (status='uploading' and session_expires_at<now()-interval '1 day')
    );
  select coalesce(sum(size_bytes),0) into v_used from private.mind_drive_assets where admin_id=p_admin_id and missing_at is null;
  select coalesce(sum(expected_size),0) into v_reserved from private.mind_drive_uploads where admin_id=p_admin_id and status in ('reserved','creating','uploading');
  select coalesce(jsonb_agg(jsonb_build_object('drive_file_id',a.drive_file_id,'file_name',a.file_name,'size_bytes',a.size_bytes,'trashed',a.trashed) order by a.file_name), '[]'::jsonb)
    into v_orphans from private.mind_drive_assets a
    where a.admin_id=p_admin_id and a.missing_at is null and a.item_id is null
      and not exists(select 1 from private.mind_drive_uploads u where u.admin_id=p_admin_id and u.drive_file_id=a.drive_file_id and u.status='uploaded');
  return jsonb_build_object('used_bytes',v_used,'reserved_bytes',v_reserved,'total_bytes',v_used+v_reserved,
    'available_bytes',greatest(0,5000000000-v_used-v_reserved),'orphan_files',v_orphans);
end $$;
create or replace function public.mind_drive_reserve_upload(p_admin_id uuid,p_upload_id text,p_item_id uuid,p_file_name text,p_expected_size bigint,p_scan_started_at timestamptz,p_assets jsonb,p_account_free_bytes bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_used bigint; v_reserved bigint; v_existing private.mind_drive_uploads%rowtype;
begin
  if not exists(select 1 from private.mind_admins where user_id=p_admin_id) then raise exception 'not admin'; end if;
  if p_upload_id !~ '^[0-9a-f]{32}$' or p_expected_size not between 1 and 5000000000 or length(p_file_name) not between 1 and 180 or jsonb_typeof(p_assets)<>'array' then raise exception 'invalid reservation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  select * into v_existing from private.mind_drive_uploads where admin_id=p_admin_id and upload_id=p_upload_id for update;
  if found then
    if v_existing.item_id<>p_item_id or v_existing.expected_size<>p_expected_size or v_existing.file_name<>left(p_file_name,180) then raise exception 'idempotency key reused'; end if;
    if v_existing.status='cancelled' then raise exception 'upload cancelled'; end if;
    select coalesce(sum(size_bytes),0) into v_used from private.mind_drive_assets where admin_id=p_admin_id and missing_at is null;
    select coalesce(sum(expected_size),0) into v_reserved from private.mind_drive_uploads where admin_id=p_admin_id and status in ('reserved','creating','uploading');
    return jsonb_build_object('upload_id',p_upload_id,'status',v_existing.status,'used_bytes',v_used,'reserved_bytes',v_reserved);
  end if;
  insert into private.mind_drive_assets(admin_id,drive_file_id,file_name,size_bytes,trashed,mime_type)
    select p_admin_id,a.file_id,left(a.file_name,180),a.size_bytes,coalesce(a.trashed,false),a.mime_type
    from jsonb_to_recordset(p_assets) as a(file_id text,file_name text,size_bytes bigint,trashed boolean,mime_type text,upload_id text,parents jsonb)
    where a.file_id ~ '^[A-Za-z0-9_-]{10,200}$' and a.size_bytes between 0 and 5000000000
    on conflict(admin_id,drive_file_id) do update set file_name=excluded.file_name,size_bytes=excluded.size_bytes,
      trashed=excluded.trashed,mime_type=excluded.mime_type,missing_at=null,updated_at=now();
  update private.mind_drive_assets a set missing_at=now(),updated_at=now()
    where a.admin_id=p_admin_id and a.missing_at is null and a.updated_at<p_scan_started_at
      and not exists(select 1 from jsonb_to_recordset(p_assets) as s(file_id text) where s.file_id=a.drive_file_id);
  select coalesce(sum(size_bytes),0) into v_used from private.mind_drive_assets where admin_id=p_admin_id and missing_at is null;
  select coalesce(sum(expected_size),0) into v_reserved from private.mind_drive_uploads where admin_id=p_admin_id and status in ('reserved','creating','uploading');
  if v_used+v_reserved+p_expected_size>5000000000 then raise exception 'managed cap exceeded'; end if;
  if p_account_free_bytes is null or p_account_free_bytes<0 or v_reserved+p_expected_size>p_account_free_bytes then raise exception 'Google account quota exceeded'; end if;
  insert into private.mind_drive_uploads(upload_id,admin_id,item_id,file_name,expected_size,status)
    values(p_upload_id,p_admin_id,p_item_id,p_file_name,p_expected_size,'reserved');
  return jsonb_build_object('upload_id',p_upload_id,'used_bytes',v_used,'reserved_bytes',v_reserved+p_expected_size);
end $$;

create or replace function public.mind_drive_claim_upload_session(p_admin_id uuid,p_upload_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  update private.mind_drive_uploads set status='creating',session_claimed_at=now(),updated_at=now()
    where admin_id=p_admin_id and upload_id=p_upload_id and
      (status='reserved' or (status='creating' and session_claimed_at<now()-interval '60 seconds'));
  return found;
end $$;

create or replace function public.mind_drive_set_upload_session(p_admin_id uuid,p_upload_id text,p_session_uri_cipher text,p_expires_at double precision)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.mind_drive_uploads set session_uri_cipher=p_session_uri_cipher,session_expires_at=to_timestamp(p_expires_at),session_claimed_at=null,status='uploading',updated_at=now()
    where admin_id=p_admin_id and upload_id=p_upload_id and status='creating';
  if not found then raise exception 'upload reservation not found'; end if;
  return true;
end $$;

create or replace function public.mind_drive_get_upload(p_admin_id uuid,p_upload_id text)
returns jsonb language sql security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('upload_id',upload_id,'item_id',item_id,'file_name',file_name,
    'expected_size',expected_size,'confirmed_size',confirmed_size,'drive_file_id',drive_file_id,
    'session_uri_cipher',session_uri_cipher,'status',status,'session_expires_at',session_expires_at)
    from private.mind_drive_uploads where admin_id=p_admin_id and upload_id=p_upload_id),'{}'::jsonb)
$$;

create or replace function public.mind_drive_release_upload(p_admin_id uuid,p_upload_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.mind_drive_uploads set status='cancelled',session_uri_cipher=null,updated_at=now()
    where admin_id=p_admin_id and upload_id=p_upload_id and status in ('reserved','creating');
  return found;
end $$;

create or replace function public.mind_drive_cancel_upload(p_admin_id uuid,p_upload_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.mind_drive_uploads set status='cancelled',session_uri_cipher=null,updated_at=now()
    where admin_id=p_admin_id and upload_id=p_upload_id and status in ('reserved','uploading');
  if not found then raise exception 'upload cannot be cancelled'; end if;
  return true;
end $$;

create or replace function public.mind_drive_finalize_upload(p_admin_id uuid,p_upload_id text,p_drive_file_id text,p_confirmed_size bigint,p_file_name text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_upload private.mind_drive_uploads%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  select * into v_upload from private.mind_drive_uploads where admin_id=p_admin_id and upload_id=p_upload_id for update;
  if not found or v_upload.status not in ('uploading','uploaded') or p_confirmed_size<>v_upload.expected_size or p_confirmed_size not between 1 and 5000000000 or p_drive_file_id !~ '^[A-Za-z0-9_-]{10,200}$' then raise exception 'file confirmation mismatch'; end if;
  if v_upload.status='uploaded' then
    if v_upload.drive_file_id<>p_drive_file_id then raise exception 'file id mismatch'; end if;
    return true;
  end if;
  insert into private.mind_drive_assets(admin_id,drive_file_id,file_name,size_bytes)
    values(p_admin_id,p_drive_file_id,left(p_file_name,180),p_confirmed_size)
    on conflict(admin_id,drive_file_id) do update set file_name=excluded.file_name,size_bytes=excluded.size_bytes,missing_at=null,updated_at=now();
  update private.mind_drive_uploads set status='uploaded',drive_file_id=p_drive_file_id,confirmed_size=p_confirmed_size,
    file_name=left(p_file_name,180),session_uri_cipher=null,updated_at=now() where admin_id=p_admin_id and upload_id=p_upload_id;
  return true;
end $$;

create or replace function public.mind_drive_publish_video(p_admin_id uuid,p_upload_id text,p_item jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_upload private.mind_drive_uploads%rowtype; v_previous public.mind_items%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  select * into v_upload from private.mind_drive_uploads where admin_id=p_admin_id and upload_id=p_upload_id for update;
  if not found or v_upload.status<>'uploaded' or p_item->>'id'<>v_upload.item_id::text or v_upload.drive_file_id is null then raise exception 'upload not ready'; end if;
  if exists(select 1 from private.mind_drive_assets where admin_id=p_admin_id and drive_file_id=v_upload.drive_file_id and delete_claimed_at is not null) then raise exception 'asset deleting'; end if;
  if length(trim(coalesce(p_item->>'title',''))) not between 1 and 180 or length(coalesce(p_item->>'topic',''))>80 or
     length(coalesce(p_item->>'description',''))>3000 or length(coalesce(p_item->>'content',''))>250000 or
     jsonb_typeof(p_item->'tags')<>'array' or jsonb_array_length(p_item->'tags')>12 then raise exception 'invalid item'; end if;
  select * into v_previous from public.mind_items where id=v_upload.item_id for update;
  if found and v_previous.owner_id<>p_admin_id then raise exception 'item owner mismatch'; end if;
  insert into public.mind_items(id,owner_id,kind,title,topic,tags,description,content,favorite,file_name,file_size,storage_path,
    created_at,updated_at,video_url,poster_data_url,storage_provider,drive_file_id)
  values(v_upload.item_id,p_admin_id,'video',trim(p_item->>'title'),coalesce(nullif(trim(p_item->>'topic'),''),'Sem assunto'),
    array(select left(t.value,50) from jsonb_array_elements_text(p_item->'tags') with ordinality as t(value,ord) order by t.ord limit 12),
    coalesce(p_item->>'description',''),coalesce(p_item->>'content',''),coalesce((p_item->>'favorite')::boolean,false),
    v_upload.file_name,v_upload.confirmed_size,null,coalesce((p_item->>'created_at')::timestamptz,now()),
    coalesce((p_item->>'updated_at')::timestamptz,now()),null,p_item->>'poster_data_url','google-drive',v_upload.drive_file_id)
  on conflict(id) do update set kind='video',title=excluded.title,topic=excluded.topic,tags=excluded.tags,
    description=excluded.description,content=excluded.content,favorite=excluded.favorite,file_name=excluded.file_name,
    file_size=excluded.file_size,storage_path=null,updated_at=excluded.updated_at,video_url=null,
    poster_data_url=excluded.poster_data_url,storage_provider='google-drive',drive_file_id=excluded.drive_file_id
  where public.mind_items.owner_id=p_admin_id;
  update private.mind_drive_uploads set status='published',updated_at=now() where admin_id=p_admin_id and upload_id=p_upload_id;
  update private.mind_drive_assets set item_id=v_upload.item_id,updated_at=now() where admin_id=p_admin_id and drive_file_id=v_upload.drive_file_id;
  return jsonb_build_object('previous_storage_path',v_previous.storage_path,'previous_drive_file_id',v_previous.drive_file_id);
end $$;

create or replace function public.mind_drive_claim_asset_delete(p_admin_id uuid,p_file_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_admin_id::text,0));
  if exists(select 1 from public.mind_items where drive_file_id=p_file_id) then return false; end if;
  update private.mind_drive_assets set delete_claimed_at=now(),updated_at=now()
    where admin_id=p_admin_id and drive_file_id=p_file_id and missing_at is null and
      (delete_claimed_at is null or delete_claimed_at<now()-interval '5 minutes');
  return found;
end $$;

create or replace function public.mind_drive_release_asset_delete(p_admin_id uuid,p_file_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.mind_drive_assets set delete_claimed_at=null,updated_at=now()
    where admin_id=p_admin_id and drive_file_id=p_file_id and missing_at is null;
  return found;
end $$;

create or replace function public.mind_drive_mark_asset_deleted(p_admin_id uuid,p_file_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update private.mind_drive_assets set missing_at=now(),updated_at=now()
    where admin_id=p_admin_id and drive_file_id=p_file_id and delete_claimed_at is not null and not exists(select 1 from public.mind_items where drive_file_id=p_file_id);
  if not found then raise exception 'asset still referenced'; end if;
  return true;
end $$;

revoke all on function public.mind_drive_get_connection(uuid),public.mind_drive_save_connection(uuid,text,text,text,text),
  public.mind_drive_disconnect(uuid),public.mind_drive_reconcile(uuid,timestamptz,jsonb,text),
  public.mind_drive_reserve_upload(uuid,text,uuid,text,bigint,timestamptz,jsonb,bigint),
  public.mind_drive_claim_upload_session(uuid,text),
  public.mind_drive_set_upload_session(uuid,text,text,double precision),public.mind_drive_get_upload(uuid,text),
  public.mind_drive_release_upload(uuid,text),public.mind_drive_cancel_upload(uuid,text),
  public.mind_drive_finalize_upload(uuid,text,text,bigint,text),public.mind_drive_publish_video(uuid,text,jsonb),
  public.mind_drive_claim_asset_delete(uuid,text),public.mind_drive_release_asset_delete(uuid,text),public.mind_drive_mark_asset_deleted(uuid,text)
  from public,anon,authenticated;
grant execute on function public.mind_drive_get_connection(uuid),public.mind_drive_save_connection(uuid,text,text,text,text),
  public.mind_drive_disconnect(uuid),public.mind_drive_reconcile(uuid,timestamptz,jsonb,text),
  public.mind_drive_reserve_upload(uuid,text,uuid,text,bigint,timestamptz,jsonb,bigint),
  public.mind_drive_claim_upload_session(uuid,text),
  public.mind_drive_set_upload_session(uuid,text,text,double precision),public.mind_drive_get_upload(uuid,text),
  public.mind_drive_release_upload(uuid,text),public.mind_drive_cancel_upload(uuid,text),
  public.mind_drive_finalize_upload(uuid,text,text,bigint,text),public.mind_drive_publish_video(uuid,text,jsonb),
  public.mind_drive_claim_asset_delete(uuid,text),public.mind_drive_release_asset_delete(uuid,text),public.mind_drive_mark_asset_deleted(uuid,text) to service_role;

commit;
