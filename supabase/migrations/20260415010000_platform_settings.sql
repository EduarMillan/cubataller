-- Platform-wide settings (single-row table)
create table if not exists public.platform_settings (
  id boolean primary key default true check (id = true),  -- ensures only one row
  trial_days integer not null default 90 check (trial_days >= 1 and trial_days <= 365),
  admin_whatsapp text,
  grace_period_days integer not null default 5 check (grace_period_days >= 0 and grace_period_days <= 30),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Seed the single row
insert into public.platform_settings (id, trial_days)
values (true, 90)
on conflict (id) do nothing;

-- Allow admin (service_role) full access; no RLS needed since only admin client uses it
alter table public.platform_settings enable row level security;

-- Authenticated users can read (to use during store creation)
drop policy if exists "platform_settings_public_read" on public.platform_settings;
create policy "platform_settings_public_read"
on public.platform_settings
for select
to authenticated
using (true);

create trigger trg_platform_settings_set_updated_at
before update on public.platform_settings
for each row
execute function public.set_updated_at();
