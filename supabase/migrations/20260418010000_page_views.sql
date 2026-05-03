-- Page views tracking for visibility statistics
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  part_id uuid references public.parts(id) on delete set null,
  page_type text not null check (page_type in ('store', 'part')),
  viewed_at timestamptz not null default timezone('utc'::text, now())
);

-- Index for querying by store and date range
create index idx_page_views_store_date on public.page_views (store_id, viewed_at desc);
create index idx_page_views_part on public.page_views (part_id) where part_id is not null;

-- RLS
alter table public.page_views enable row level security;

-- Anon users can insert views (public pages)
drop policy if exists "page_views_anon_insert" on public.page_views;
create policy "page_views_anon_insert"
on public.page_views
for insert
to anon, authenticated
with check (true);

-- Store members can read their own store's views
drop policy if exists "page_views_store_read" on public.page_views;
create policy "page_views_store_read"
on public.page_views
for select
to authenticated
using (
  exists (
    select 1 from public.store_memberships sm
    where sm.store_id = page_views.store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
  )
);
