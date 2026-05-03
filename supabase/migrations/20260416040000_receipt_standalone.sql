-- Allow receipts to be submitted directly against a subscription,
-- without requiring an admin-created payment request.

-- Make payment_request_id optional
alter table public.manual_payment_receipts
  alter column payment_request_id drop not null;

-- Add direct subscription reference
alter table public.manual_payment_receipts
  add column if not exists subscription_id uuid references public.store_subscriptions(id) on delete cascade;

-- Add amount so the user can state how much they transferred
alter table public.manual_payment_receipts
  add column if not exists amount numeric(12, 2) check (amount >= 0);

-- Index for quick lookup by store
create index if not exists idx_manual_payment_receipts_store
  on public.manual_payment_receipts (store_id, created_at desc);
