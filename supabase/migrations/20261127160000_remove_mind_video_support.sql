-- Remove public Mente video support after the video catalog was retired.
-- Safety guards intentionally abort if any video records or Storage objects exist.
begin;

do $$
begin
  if exists (select 1 from public.mind_items where kind = 'video') then
    raise exception 'video cleanup aborted: public.mind_items still contains video records';
  end if;
  if exists (select 1 from storage.objects where bucket_id = 'mind-videos') then
    raise exception 'video cleanup aborted: mind-videos Storage bucket is not empty';
  end if;
end
$$;

drop policy if exists mind_video_storage_delete on storage.objects;
drop policy if exists mind_video_storage_insert on storage.objects;
drop policy if exists mind_video_storage_select on storage.objects;
drop policy if exists mind_video_storage_update on storage.objects;
delete from storage.buckets where id = 'mind-videos';

alter table public.mind_items
  drop constraint if exists mind_video_source_check,
  drop constraint if exists mind_items_poster_data_url_check,
  drop constraint if exists mind_items_file_size_check,
  drop constraint if exists mind_items_kind_check;

alter table public.mind_items
  add constraint mind_items_kind_check check (kind in ('note', 'pdf')),
  add constraint mind_items_file_size_check check (
    file_size is null or (kind = 'pdf' and file_size between 1 and 26214400)
  );

alter table public.mind_items
  drop column if exists video_url,
  drop column if exists poster_data_url;

commit;
