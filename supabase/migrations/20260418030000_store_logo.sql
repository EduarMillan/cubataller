-- Add logo URL column to stores
alter table public.stores add column if not exists logo_url text;

-- ============================================================
-- Storage bucket for store logos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

-- Anyone can view logos (bucket is public)
drop policy if exists "store_logos_public_read" on storage.objects;
create policy "store_logos_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'store-logos');

-- Authenticated store members can upload their logo
drop policy if exists "store_logos_member_insert" on storage.objects;
create policy "store_logos_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'store-logos'
  and public.is_store_member((storage.foldername(name))[1]::uuid)
);

-- Authenticated store members can delete their logo
drop policy if exists "store_logos_member_delete" on storage.objects;
create policy "store_logos_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'store-logos'
  and public.is_store_member((storage.foldername(name))[1]::uuid)
);
