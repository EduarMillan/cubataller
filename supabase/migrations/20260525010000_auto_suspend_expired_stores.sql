-- Auto-suspension of stores whose subscription has expired past the grace period.
--
-- A store is suspended (stores.is_active = false, subscription.status = 'past_due') when:
--   * status = 'trialing' and trial_ends_at + grace_period_days < now()
--   * status = 'active'   and current_period_ends_at + grace_period_days < now()
--   * status = 'past_due' and the expiration reference + grace_period_days < now()
--
-- Stores with a manual payment receipt currently 'submitted' (awaiting admin
-- review) are NEVER auto-suspended — the admin must approve/reject the receipt
-- first. This avoids deactivating a store while a payment is in flight.
--
-- The function returns the number of stores it just suspended.

create or replace function public.suspend_expired_stores(target_store_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  grace_days integer;
  suspended_count integer := 0;
begin
  select coalesce(grace_period_days, 5)
    into grace_days
    from public.platform_settings
   where id = true;

  if grace_days is null then
    grace_days := 5;
  end if;

  with candidates as (
    select s.id as store_id, sub.id as subscription_id
      from public.stores s
      join public.store_subscriptions sub on sub.store_id = s.id
     where s.is_active = true
       and (target_store_id is null or s.id = target_store_id)
       and (
         (sub.status = 'trialing'
           and sub.trial_ends_at + make_interval(days => grace_days) < now())
         or (sub.status = 'active'
           and sub.current_period_ends_at is not null
           and sub.current_period_ends_at + make_interval(days => grace_days) < now())
         or (sub.status = 'past_due'
           and coalesce(sub.current_period_ends_at, sub.trial_ends_at) + make_interval(days => grace_days) < now())
       )
       and not exists (
         select 1
           from public.manual_payment_receipts r
          where r.store_id = s.id
            and r.status = 'submitted'
       )
  ),
  deactivated as (
    update public.stores
       set is_active = false
     where id in (select store_id from candidates)
    returning id
  ),
  marked_past_due as (
    update public.store_subscriptions
       set status = 'past_due'
     where id in (select subscription_id from candidates)
       and status <> 'past_due'
    returning id
  )
  select count(*) into suspended_count from deactivated;

  return suspended_count;
end;
$$;

-- Allow the service role to call it (used by the Next.js server actions / admin client)
revoke all on function public.suspend_expired_stores(uuid) from public;
grant execute on function public.suspend_expired_stores(uuid) to service_role;

-- Optional pg_cron schedule (requires the pg_cron extension):
--
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'cubamecanica-auto-suspend-daily',
--     '0 3 * * *',                       -- 03:00 UTC every day
--     $$ select public.suspend_expired_stores(); $$
--   );
--
-- Without pg_cron, the function is also invoked lazily from the dashboard
-- layout whenever a store owner loads /dashboard, which is enough to keep the
-- "owner sees suspended view" UX correct.
