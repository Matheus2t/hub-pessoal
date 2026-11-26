-- Preserve previous media pointers so a retried publish can complete UI cleanup
-- after the database commit succeeded but its PostgREST response was lost.
begin;

alter table private.mind_drive_uploads
  add column if not exists previous_storage_path text,
  add column if not exists previous_drive_file_id text;

create or replace function public.mind_drive_get_upload(p_admin_id uuid,p_upload_id text)
returns jsonb language sql security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('upload_id',upload_id,'item_id',item_id,'file_name',file_name,
    'expected_size',expected_size,'confirmed_size',confirmed_size,'drive_file_id',drive_file_id,
    'session_uri_cipher',session_uri_cipher,'status',status,'session_expires_at',session_expires_at,
    'previous_storage_path',previous_storage_path,'previous_drive_file_id',previous_drive_file_id)
    from private.mind_drive_uploads where admin_id=p_admin_id and upload_id=p_upload_id),'{}'::jsonb)
$$;

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
  update private.mind_drive_uploads set status='published',
    previous_storage_path=v_previous.storage_path,previous_drive_file_id=v_previous.drive_file_id,updated_at=now()
    where admin_id=p_admin_id and upload_id=p_upload_id;
  update private.mind_drive_assets set item_id=v_upload.item_id,updated_at=now() where admin_id=p_admin_id and drive_file_id=v_upload.drive_file_id;
  return jsonb_build_object('previous_storage_path',v_previous.storage_path,'previous_drive_file_id',v_previous.drive_file_id);
end $$;

commit;
