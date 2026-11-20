-- Additive migration for the optional Cloudflare R2 video provider.
-- Existing Supabase Storage MP4s stay individually capped at 50 MB; PDF and link rows are unchanged.
alter table public.mind_items
  add column if not exists video_storage_provider text;

update public.mind_items
set video_storage_provider = 'supabase'
where kind = 'video'
  and video_url is null
  and storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?[.]mp4$'
  and video_storage_provider is null;

alter table public.mind_items
  drop constraint if exists mind_items_file_size_check;
alter table public.mind_items
  add constraint mind_items_file_size_check check (
    file_size is null or
    (file_size > 0 and (
      (kind = 'pdf' and file_size <= 26214400) or
      (kind = 'video' and video_url is null and (
        (video_storage_provider = 'supabase' and file_size <= 50000000) or
        (video_storage_provider = 'r2' and file_size <= 5000000000)
      ))
    ))
  );

alter table public.mind_items
  drop constraint if exists mind_video_source_check;
alter table public.mind_items
  add constraint mind_video_source_check check (
    (kind <> 'video' and video_url is null and video_storage_provider is null) or
    (kind = 'video' and (
      (video_url is not null and
       (video_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$' or
        video_url ~ '^https://vimeo[.]com/[0-9]{1,18}$') and
       storage_path is null and file_name is null and file_size is null and video_storage_provider is null) or
      (video_url is null and video_storage_provider = 'supabase' and
       storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?[.]mp4$' and
       file_name is not null and file_size between 1 and 50000000) or
      (video_url is null and video_storage_provider = 'r2' and
       storage_path ~ '^videos/[0-9a-f-]{36}/[0-9a-f-]{36}-[0-9a-f-]{36}[.]mp4$' and
       file_name is not null and file_size between 1 and 5000000000)
    ))
  );
