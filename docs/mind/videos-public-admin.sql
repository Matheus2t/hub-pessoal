-- 2T Mente: support public video playback and admin-only MP4 uploads.
-- Apply once to existing Supabase project 2T'Site using a recorded migration.
-- Preserve all mind_items rows and mind-pdfs bucket. Never expose service_role.
begin;

alter table public.mind_items add column if not exists video_url text;
alter table public.mind_items drop constraint if exists mind_items_kind_check;
alter table public.mind_items add constraint mind_items_kind_check
  check (kind in ('note', 'pdf', 'video'));
alter table public.mind_items add constraint mind_video_source_check
  check (
    (kind <> 'video' and video_url is null)
    or
    (kind = 'video' and
      (
        (video_url is not null and
          (video_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$'
           or video_url ~ '^https://vimeo[.]com/[0-9]{1,18}$')
          and storage_path is null and file_name is null and file_size is null)
        or
        (video_url is null and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?[.]mp4$'
          and file_name is not null and file_size between 1 and 26214400)
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mind-videos', 'mind-videos', true, 26214400, array['video/mp4']::text[])
on conflict (id) do nothing;

create policy mind_video_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mind-videos'
    and (select private.is_mind_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) = 'mp4');

create policy mind_video_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'mind-videos'
    and (select private.is_mind_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy mind_video_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'mind-videos'
    and (select private.is_mind_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'mind-videos'
    and (select private.is_mind_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) = 'mp4');

create policy mind_video_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'mind-videos'
    and (select private.is_mind_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
