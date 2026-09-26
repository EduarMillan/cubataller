-- Adds the "otro" service category, for workshops that do not fit any of the
-- listed ones. The column is guarded by a CHECK listing every allowed code, so
-- the application list alone is not enough: without this the insert fails with
-- a check violation.
--
-- The existing constraint is looked up by definition instead of by name: it was
-- created inline with the table, so its name is auto-generated and not
-- guaranteed to be the conventional one.

do $$
declare
  existing_name text;
begin
  select conname
    into existing_name
    from pg_constraint
   where conrelid = 'public.service_providers'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%category%';

  if existing_name is not null then
    execute format(
      'alter table public.service_providers drop constraint %I',
      existing_name
    );
  end if;
end $$;

alter table public.service_providers
  add constraint service_providers_category_check
  check (category in (
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
    'scanner_diagnostico',
    'otro'
  ));
