-- Add admin-managed monthly subscription price (CLP) to platform settings.
alter table public.platform_settings
  add column if not exists monthly_subscription_price integer not null default 15000
  check (monthly_subscription_price >= 0);
