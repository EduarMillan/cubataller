-- Add provincia and municipio to stores for location-based search
alter table public.stores add column if not exists provincia text;
alter table public.stores add column if not exists municipio text;

-- Defaults for Cuban market
alter table public.stores alter column country_code set default 'CU';
alter table public.stores alter column currency_code set default 'CUP';

-- Index for location-based filtering
create index if not exists idx_stores_provincia_municipio
  on public.stores (provincia, municipio)
  where is_active = true;

-- Allow anonymous users to read active stores (needed for public search to join store location)
drop policy if exists "stores_public_read_active" on public.stores;
create policy "stores_public_read_active"
on public.stores
for select
to anon, authenticated
using (is_active = true);
