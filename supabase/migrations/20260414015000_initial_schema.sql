create extension if not exists pgcrypto;

do $$
begin
  create type public.store_role as enum ('owner', 'admin', 'staff');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.inventory_movement_type as enum ('stock_in', 'stock_out', 'sale', 'return', 'adjustment');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sales_order_status as enum ('draft', 'confirmed', 'paid', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.subscription_status as enum ('trialing', 'pending_manual_payment', 'active', 'past_due', 'canceled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.manual_payment_status as enum ('pending', 'verified', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.manual_receipt_status as enum ('submitted', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  whatsapp_number text,
  country_code text not null default 'CU',
  currency_code text not null default 'CUP',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  trial_starts_at timestamptz not null default timezone('utc'::text, now()),
  trial_ends_at timestamptz not null default (timezone('utc'::text, now()) + interval '90 days'),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.store_role not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (store_id, user_id)
);

create table if not exists public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  show_public_contact boolean not null default true,
  accepts_manual_payments boolean not null default true,
  manual_payment_channel text not null default 'whatsapp' check (manual_payment_channel in ('whatsapp')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  brand text not null,
  vehicle_make text not null,
  vehicle_model text not null,
  vehicle_year_from integer,
  vehicle_year_to integer,
  price numeric(12, 2) not null check (price >= 0),
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  is_public boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (store_id, sku),
  constraint parts_vehicle_years_valid check (
    (
      vehicle_year_from is null
      and vehicle_year_to is null
    ) or (
      vehicle_year_from is not null
      and vehicle_year_to is not null
      and vehicle_year_from between 1950 and 2100
      and vehicle_year_to between 1950 and 2100
      and vehicle_year_from <= vehicle_year_to
    )
  )
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity integer not null check (quantity > 0),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_number text not null,
  status public.sales_order_status not null default 'draft',
  customer_name text,
  customer_phone text,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (store_id, order_number)
);

create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  monthly_price numeric(12, 2) not null check (monthly_price >= 0),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.store_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trialing',
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly')),
  trial_starts_at timestamptz not null,
  trial_ends_at timestamptz not null,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  active_until timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.manual_payment_requests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  subscription_id uuid not null references public.store_subscriptions(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency_code text not null,
  due_date date not null,
  status public.manual_payment_status not null default 'pending',
  whatsapp_reference text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.manual_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.manual_payment_requests(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  receipt_url text,
  bank_reference text,
  paid_at timestamptz not null default timezone('utc'::text, now()),
  status public.manual_receipt_status not null default 'submitted',
  submitted_by uuid references auth.users(id) on delete set null,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_store_memberships_user_store
  on public.store_memberships (user_id, store_id);

create index if not exists idx_parts_store_public_active
  on public.parts (store_id, is_public, is_active);

create index if not exists idx_parts_vehicle_lookup
  on public.parts (vehicle_make, vehicle_model, vehicle_year_from, vehicle_year_to);

create index if not exists idx_inventory_movements_store_part_created
  on public.inventory_movements (store_id, part_id, created_at desc);

create index if not exists idx_sales_orders_store_created
  on public.sales_orders (store_id, created_at desc);

create index if not exists idx_manual_payment_requests_store_status_due
  on public.manual_payment_requests (store_id, status, due_date);

create trigger trg_stores_set_updated_at
before update on public.stores
for each row
execute function public.set_updated_at();

create trigger trg_store_memberships_set_updated_at
before update on public.store_memberships
for each row
execute function public.set_updated_at();

create trigger trg_store_settings_set_updated_at
before update on public.store_settings
for each row
execute function public.set_updated_at();

create trigger trg_parts_set_updated_at
before update on public.parts
for each row
execute function public.set_updated_at();

create trigger trg_sales_orders_set_updated_at
before update on public.sales_orders
for each row
execute function public.set_updated_at();

create trigger trg_plans_set_updated_at
before update on public.plans
for each row
execute function public.set_updated_at();

create trigger trg_store_subscriptions_set_updated_at
before update on public.store_subscriptions
for each row
execute function public.set_updated_at();

create trigger trg_manual_payment_requests_set_updated_at
before update on public.manual_payment_requests
for each row
execute function public.set_updated_at();

create trigger trg_manual_payment_receipts_set_updated_at
before update on public.manual_payment_receipts
for each row
execute function public.set_updated_at();

create or replace function public.is_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
  );
$$;

create or replace function public.has_store_role(
  target_store_id uuid,
  allowed_roles public.store_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.store_memberships sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.is_active = true
      and sm.role = any(allowed_roles)
  );
$$;

grant execute on function public.is_store_member(uuid) to authenticated;
grant execute on function public.has_store_role(uuid, public.store_role[]) to authenticated;

alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.store_settings enable row level security;
alter table public.parts enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.plans enable row level security;
alter table public.store_subscriptions enable row level security;
alter table public.manual_payment_requests enable row level security;
alter table public.manual_payment_receipts enable row level security;

drop policy if exists "stores_select_member" on public.stores;
create policy "stores_select_member"
on public.stores
for select
to authenticated
using (public.is_store_member(id));

drop policy if exists "stores_insert_creator" on public.stores;
create policy "stores_insert_creator"
on public.stores
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "stores_update_owner_admin" on public.stores;
create policy "stores_update_owner_admin"
on public.stores
for update
to authenticated
using (public.has_store_role(id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "store_memberships_select_member" on public.store_memberships;
create policy "store_memberships_select_member"
on public.store_memberships
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "store_memberships_insert_owner_admin" on public.store_memberships;
create policy "store_memberships_insert_owner_admin"
on public.store_memberships
for insert
to authenticated
with check (
  (
    exists (
      select 1
      from public.stores s
      where s.id = store_id
        and s.created_by = auth.uid()
    )
    and user_id = auth.uid()
    and role = 'owner'
  ) or public.has_store_role(store_id, array['owner', 'admin']::public.store_role[])
);

drop policy if exists "store_memberships_update_owner_admin" on public.store_memberships;
create policy "store_memberships_update_owner_admin"
on public.store_memberships
for update
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "store_settings_select_member" on public.store_settings;
create policy "store_settings_select_member"
on public.store_settings
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "store_settings_write_owner_admin" on public.store_settings;
create policy "store_settings_write_owner_admin"
on public.store_settings
for all
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "parts_public_read" on public.parts;
create policy "parts_public_read"
on public.parts
for select
to anon, authenticated
using (
  is_public = true
  and is_active = true
  and exists (
    select 1
    from public.stores s
    where s.id = store_id
      and s.is_active = true
  )
);

drop policy if exists "parts_member_read" on public.parts;
create policy "parts_member_read"
on public.parts
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "parts_insert_store_staff" on public.parts;
create policy "parts_insert_store_staff"
on public.parts
for insert
to authenticated
with check (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]));

drop policy if exists "parts_update_store_staff" on public.parts;
create policy "parts_update_store_staff"
on public.parts
for update
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]));

drop policy if exists "parts_delete_owner_admin" on public.parts;
create policy "parts_delete_owner_admin"
on public.parts
for delete
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "inventory_movements_member_manage" on public.inventory_movements;
create policy "inventory_movements_member_manage"
on public.inventory_movements
for all
to authenticated
using (public.is_store_member(store_id))
with check (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]));

drop policy if exists "sales_orders_member_manage" on public.sales_orders;
create policy "sales_orders_member_manage"
on public.sales_orders
for all
to authenticated
using (public.is_store_member(store_id))
with check (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]));

drop policy if exists "sales_order_items_member_manage" on public.sales_order_items;
create policy "sales_order_items_member_manage"
on public.sales_order_items
for all
to authenticated
using (public.is_store_member(store_id))
with check (public.has_store_role(store_id, array['owner', 'admin', 'staff']::public.store_role[]));

drop policy if exists "plans_public_read_active" on public.plans;
create policy "plans_public_read_active"
on public.plans
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "store_subscriptions_member_read" on public.store_subscriptions;
create policy "store_subscriptions_member_read"
on public.store_subscriptions
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "store_subscriptions_owner_admin_manage" on public.store_subscriptions;
create policy "store_subscriptions_owner_admin_manage"
on public.store_subscriptions
for all
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "manual_payment_requests_member_read" on public.manual_payment_requests;
create policy "manual_payment_requests_member_read"
on public.manual_payment_requests
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "manual_payment_requests_owner_admin_manage" on public.manual_payment_requests;
create policy "manual_payment_requests_owner_admin_manage"
on public.manual_payment_requests
for all
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

drop policy if exists "manual_payment_receipts_member_read" on public.manual_payment_receipts;
create policy "manual_payment_receipts_member_read"
on public.manual_payment_receipts
for select
to authenticated
using (public.is_store_member(store_id));

drop policy if exists "manual_payment_receipts_owner_admin_manage" on public.manual_payment_receipts;
create policy "manual_payment_receipts_owner_admin_manage"
on public.manual_payment_receipts
for all
to authenticated
using (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]))
with check (public.has_store_role(store_id, array['owner', 'admin']::public.store_role[]));

insert into public.plans (name, monthly_price, description, is_active)
values ('Plan Mensual Base', 0, 'Plan inicial para operación con cobro manual por transferencia.', true)
on conflict (name) do nothing;
