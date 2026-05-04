-- Enforce uniqueness of whatsapp_number within stores and within service_providers.
-- The application normalizes the number (digits-only, with "53" country code) before insert,
-- so two users entering the same number in different formats end up with the same value.
-- Cross-table uniqueness (a store cannot reuse a service_providers number and vice versa)
-- is enforced in the server actions, since PostgreSQL does not support cross-table UNIQUE.

create unique index if not exists ux_stores_whatsapp_number
  on public.stores (whatsapp_number)
  where whatsapp_number is not null;

create unique index if not exists ux_service_providers_whatsapp_number
  on public.service_providers (whatsapp_number)
  where whatsapp_number is not null;
