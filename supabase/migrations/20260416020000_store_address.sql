-- Add street address to stores for precise GPS navigation
alter table public.stores add column if not exists direccion text;
