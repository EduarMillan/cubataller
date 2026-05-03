-- Service providers (mechanics, tornería, electricians, etc.)
-- These are NOT stores: no inventory, no sales, no subscription, free forever.
-- One user = one service provider (or one store, but not both — enforced in server actions).

create table if not exists public.service_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null check (category in (
    'mecanica_general',
    'mecanica_especializada',
    'electricidad_automotriz',
    'torneria',
    'desabolladura_pintura',
    'gomeria',
    'alineacion_balanceo',
    'aire_acondicionado',
    'frenos_embragues',
    'escape',
    'lavado_detailing',
    'tapiceria',
    'polarizado_accesorios',
    'gruas_auxilio',
    'lubricentro',
    'scanner_diagnostico'
  )),
  description text,
  whatsapp_number text,
  provincia text,
  municipio text,
  direccion text,
  logo_url text,
  hours jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_service_providers_category_active
  on public.service_providers (category)
  where is_active = true;

create index if not exists idx_service_providers_provincia_municipio
  on public.service_providers (provincia, municipio)
  where is_active = true;

drop trigger if exists trg_service_providers_set_updated_at on public.service_providers;
create trigger trg_service_providers_set_updated_at
before update on public.service_providers
for each row
execute function public.set_updated_at();

alter table public.service_providers enable row level security;

-- Public (anon + authenticated) can read active providers
drop policy if exists "service_providers_public_read" on public.service_providers;
create policy "service_providers_public_read"
on public.service_providers
for select
to anon, authenticated
using (is_active = true);

-- Owner can read their own record regardless of active state
drop policy if exists "service_providers_owner_read" on public.service_providers;
create policy "service_providers_owner_read"
on public.service_providers
for select
to authenticated
using (user_id = auth.uid());

-- Owner can insert their own record
drop policy if exists "service_providers_owner_insert" on public.service_providers;
create policy "service_providers_owner_insert"
on public.service_providers
for insert
to authenticated
with check (user_id = auth.uid());

-- Owner can update their own record
drop policy if exists "service_providers_owner_update" on public.service_providers;
create policy "service_providers_owner_update"
on public.service_providers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Owner can delete their own record
drop policy if exists "service_providers_owner_delete" on public.service_providers;
create policy "service_providers_owner_delete"
on public.service_providers
for delete
to authenticated
using (user_id = auth.uid());

-- ============================================================
-- Storage bucket for service provider logos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('service-logos', 'service-logos', true)
on conflict (id) do nothing;

drop policy if exists "service_logos_public_read" on storage.objects;
create policy "service_logos_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'service-logos');

-- Owner uploads logo under their user_id folder
drop policy if exists "service_logos_owner_insert" on storage.objects;
create policy "service_logos_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'service-logos'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);

drop policy if exists "service_logos_owner_delete" on storage.objects;
create policy "service_logos_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'service-logos'
  and (storage.foldername(name))[1]::uuid = auth.uid()
);
