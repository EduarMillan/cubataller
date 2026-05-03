-- Storage bucket for payment receipt images/PDFs
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

-- Anyone can view receipts (public bucket, URLs are unguessable)
drop policy if exists "receipts_public_read" on storage.objects;
create policy "receipts_public_read"
on storage.objects
for select
to public
using (bucket_id = 'receipts');

-- Store members can upload receipts to their store folder
drop policy if exists "receipts_member_insert" on storage.objects;
create policy "receipts_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and public.is_store_member((storage.foldername(name))[1]::uuid)
);
