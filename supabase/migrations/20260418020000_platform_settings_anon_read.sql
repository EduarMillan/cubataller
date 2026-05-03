-- Allow anonymous users to read platform settings (for trial_days on landing page)
drop policy if exists "platform_settings_public_read" on public.platform_settings;
create policy "platform_settings_public_read"
on public.platform_settings
for select
to anon, authenticated
using (true);
