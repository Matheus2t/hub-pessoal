-- Supabase Free caps individual uploads at 50 MB. Keep PDFs capped at 25 MiB.
update storage.buckets
set file_size_limit = 50000000
where id = 'mind-videos';

alter table public.mind_items
  add column if not exists poster_data_url text;

alter table public.mind_items
  drop constraint if exists mind_items_file_size_check;
alter table public.mind_items
  add constraint mind_items_file_size_check check (
    file_size is null or
    (file_size > 0 and (
      (kind = 'pdf' and file_size <= 26214400) or
      (kind = 'video' and video_url is null and file_size <= 50000000)
    ))
  );

alter table public.mind_items
  drop constraint if exists mind_video_source_check;
alter table public.mind_items
  add constraint mind_video_source_check check (
    (kind <> 'video' and video_url is null) or
    (kind = 'video' and (
      (video_url is not null and
       (video_url ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$' or
        video_url ~ '^https://vimeo[.]com/[0-9]{1,18}$') and
       storage_path is null and file_name is null and file_size is null) or
      (video_url is null and
       storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}(-[0-9a-f-]{36})?[.]mp4$' and
       file_name is not null and file_size between 1 and 50000000)
    ))
  );

alter table public.mind_items
  add constraint mind_items_poster_data_url_check check (
    poster_data_url is null or
    (kind = 'video' and length(poster_data_url) <= 65536 and
     poster_data_url ~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$')
  );
