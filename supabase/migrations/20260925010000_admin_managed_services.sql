-- Admin-managed service providers.
--
-- Until now a service provider row always belonged to a registered user
-- (user_id not null unique => one service per account). The platform admin
-- visits workshops in person and publishes them in the directory, so a listing
-- must be able to exist without an account behind it.
--
-- Dropping NOT NULL is enough to allow many such rows: a UNIQUE constraint in
-- Postgres treats NULLs as distinct, so unlimited unclaimed listings coexist
-- while a registered user is still capped at one service.
--
-- A workshop can later claim its listing by setting user_id to its own account.

alter table public.service_providers
  alter column user_id drop not null;

alter table public.service_providers
  add column if not exists created_by uuid references auth.users(id) on delete set null;

comment on column public.service_providers.user_id is
  'Owner account. NULL when the platform admin published the listing on behalf of a workshop that has no account yet.';

comment on column public.service_providers.created_by is
  'User who created the row. Set for admin-published listings so we know who added them.';

-- Owner policies compare user_id = auth.uid(); with a NULL user_id that
-- evaluates to NULL (never true), so unclaimed listings stay invisible to
-- every authenticated user except through the service role used by the admin
-- panel. Public read is unchanged: active listings are visible to everyone.
