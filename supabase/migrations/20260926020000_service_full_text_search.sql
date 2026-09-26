-- Free-text search over the service directory.
--
-- Until now /servicios matched the raw query against name and description with
-- ILIKE, which fails on the two things people actually type: accents ("motos
-- electricas" never matched "motos eléctricas", since ILIKE folds case but not
-- diacritics) and several words ("motos electricas" was matched as one literal
-- phrase).
--
-- The fix is a stored, generated `search_text` holding everything searchable in
-- lowercase and without accents. The application normalizes the query the same
-- way, splits it into words and requires every word to appear, in any order.
--
-- `especialidades` is a new free-text field: the keywords a workshop should be
-- found by ("motos eléctricas, scooters, cuatriciclos"), without having to bend
-- the description to include them.

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- A generated column needs an IMMUTABLE expression, but unaccent(text) is only
-- STABLE: it resolves the default dictionary at call time. Pinning the
-- dictionary explicitly makes it deterministic, which is what this wrapper
-- does. The extension schema is looked up rather than assumed, since it differs
-- between hosted Supabase (extensions) and a plain database (public).
do $$
declare
  ext_schema text;
begin
  select n.nspname
    into ext_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'unaccent';

  execute format(
    $fn$
      create or replace function public.immutable_unaccent(text)
      returns text
      language sql
      immutable
      parallel safe
      strict
      as $body$ select %I.unaccent('%I.unaccent'::regdictionary, $1) $body$
    $fn$,
    ext_schema, ext_schema
  );
end $$;

alter table public.service_providers
  add column if not exists especialidades text;

comment on column public.service_providers.especialidades is
  'Free-text keywords the workshop should be found by. Feeds search_text only; not shown as a separate field in the public listing.';

-- Dropped first so re-running the migration picks up a changed expression.
alter table public.service_providers
  drop column if exists search_text;

alter table public.service_providers
  add column search_text text
  generated always as (
    public.immutable_unaccent(lower(
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(especialidades, '') || ' ' ||
      coalesce(municipio, '') || ' ' ||
      coalesce(direccion, '') || ' ' ||
      replace(coalesce(category, ''), '_', ' ')
    ))
  ) stored;

-- Trigram index: ILIKE '%word%' cannot use a b-tree, and every term in a query
-- is one such match.
do $$
declare
  ext_schema text;
begin
  select n.nspname
    into ext_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'pg_trgm';

  execute format(
    'create index if not exists idx_service_providers_search_text
       on public.service_providers using gin (search_text %I.gin_trgm_ops)',
    ext_schema
  );
end $$;
