do $$
declare v_count integer; v_enabled integer; v_result jsonb; v_bad record;
begin
  select count(*) into v_count from public.mind_items;
  if v_count <> 4 then raise exception 'legacy rows changed: %', v_count; end if;
  if exists(select 1 from public.mind_items where title like 'Legacy%' and (storage_provider is not null or drive_file_id is not null)) then
    raise exception 'legacy rows received Drive metadata';
  end if;
  select count(*) into v_enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname in ('mind_drive_connections','mind_drive_uploads','mind_drive_assets') and c.relrowsecurity;
  if v_enabled <> 3 then raise exception 'RLS missing from Drive tables'; end if;
  if has_table_privilege('anon','private.mind_drive_uploads','select') or has_table_privilege('authenticated','private.mind_drive_uploads','select') or has_table_privilege('service_role','private.mind_drive_uploads','select') then
    raise exception 'direct table access unexpectedly granted';
  end if;
  if has_function_privilege('anon','public.mind_drive_get_connection(uuid)','execute') or has_function_privilege('authenticated','public.mind_drive_get_connection(uuid)','execute') then
    raise exception 'Drive RPC exposed to public roles';
  end if;
  if not has_function_privilege('service_role','public.mind_drive_get_connection(uuid)','execute') then raise exception 'service_role cannot execute Drive RPC'; end if;
  insert into public.mind_items(id,owner_id,kind,title,file_name,file_size,storage_provider,drive_file_id)
  values('00000000-0000-4000-8000-000000000005','11111111-2222-4333-8444-555555555555','video','Drive video','sample.mp4',8,'google-drive','abcdefghij123456');
  for v_bad in select * from (values
    (null::text, 'abcdefghij123457', null::text, 8::bigint),
    ('google-drive', 'abcdefghij123457', null, null),
    (null, null, null, 8)
  ) as x(provider, drive_file, storage_file, size_bytes) loop
    begin
      insert into public.mind_items(id,owner_id,kind,title,file_name,file_size,storage_provider,drive_file_id,storage_path)
      values('00000000-0000-4000-8000-000000000006','11111111-2222-4333-8444-555555555555',
        'video','Invalid video','sample.mp4',v_bad.size_bytes,v_bad.provider,v_bad.drive_file,v_bad.storage_file);
      raise exception 'invalid video source was accepted';
    exception when check_violation then null;
    end;
  end loop;
  v_result := public.mind_drive_reserve_upload('11111111-2222-4333-8444-555555555555','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','10000000-0000-4000-8000-000000000001','a.mp4',3000000000,now(),'[]'::jsonb,5000000000);
  v_result := public.mind_drive_reserve_upload('11111111-2222-4333-8444-555555555555','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','10000000-0000-4000-8000-000000000002','b.mp4',2000000000,now(),'[]'::jsonb,5000000000);
  if (v_result->>'reserved_bytes')::bigint <> 5000000000 then raise exception 'exact cap reservation mismatch'; end if;
  begin
    perform public.mind_drive_reserve_upload('11111111-2222-4333-8444-555555555555','cccccccccccccccccccccccccccccccc','10000000-0000-4000-8000-000000000003','c.mp4',1,now(),'[]'::jsonb,5000000000);
    raise exception 'managed cap accepted excess reservation';
  exception when others then
    if sqlerrm not like 'managed cap exceeded%' then raise; end if;
  end;
  perform public.mind_drive_release_upload('11111111-2222-4333-8444-555555555555','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  perform public.mind_drive_release_upload('11111111-2222-4333-8444-555555555555','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
  begin
    perform public.mind_drive_reserve_upload('11111111-2222-4333-8444-555555555555','dddddddddddddddddddddddddddddddd','10000000-0000-4000-8000-000000000004','quota.mp4',100,now(),'[]'::jsonb,99);
    raise exception 'Google quota accepted excess reservation';
  exception when others then
    if sqlerrm not like 'Google account quota exceeded%' then raise; end if;
  end;
  if exists(select 1 from private.mind_drive_uploads where upload_id='dddddddddddddddddddddddddddddddd') then raise exception 'failed quota reservation persisted'; end if;
end $$;
