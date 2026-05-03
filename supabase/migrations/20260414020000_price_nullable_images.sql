-- Make price optional (nullable) so parts can show "Consultar precio"
alter table public.parts
  alter column price drop not null,
  alter column price set default null;

-- Drop the old check that requires price >= 0 and re-create allowing null
alter table public.parts drop constraint if exists parts_price_check;
alter table public.parts add constraint parts_price_check check (price is null or price >= 0);

-- Add image URLs array (up to 3 paths in storage)
alter table public.parts add column if not exists image_urls text[] not null default '{}';

-- ============================================================
-- Storage bucket for part images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('parts-images', 'parts-images', true)
on conflict (id) do nothing;

-- Anyone can view images (bucket is public)
drop policy if exists "parts_images_public_read" on storage.objects;
create policy "parts_images_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'parts-images');

-- Authenticated store members can upload images
drop policy if exists "parts_images_member_insert" on storage.objects;
create policy "parts_images_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'parts-images'
  and public.is_store_member((storage.foldername(name))[1]::uuid)
);

-- Authenticated store members can delete their images
drop policy if exists "parts_images_member_delete" on storage.objects;
create policy "parts_images_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'parts-images'
  and public.is_store_member((storage.foldername(name))[1]::uuid)
);
