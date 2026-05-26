-- Schedule the daily auto-suspension job via pg_cron.
--
-- Runs every day at 03:00 UTC (≈ 22:00–23:00 in Cuba depending on DST) and
-- processes every store in one pass. Idempotent: re-running this migration
-- replaces the existing schedule instead of duplicating it.

create extension if not exists pg_cron;

-- Drop any previous schedule with the same name so this migration can be
-- re-applied safely (e.g. when the cron expression or job body changes).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'cubamecanica-auto-suspend-daily') then
    perform cron.unschedule('cubamecanica-auto-suspend-daily');
  end if;
end $$;

select cron.schedule(
  'cubamecanica-auto-suspend-daily',
  '0 3 * * *',
  $cron$ select public.suspend_expired_stores(); $cron$
);
