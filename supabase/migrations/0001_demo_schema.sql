-- Demo-tenant cloud baseline schema, for the standalone `tuvara-demo`
-- Supabase project (NOT stem-savvy-seller's production DB, NOT tuvara-sales).
--
-- Scope: read-only cloud baseline for the three sales-demo pilots
-- (demo-fashion, demo-craft, demo-food) so every device fetches the same,
-- admin-curated catalog on page load. No realtime, no per-visit history,
-- no linkage to any real pilot's data. See
-- docs/context (or the kravspec this migration was written against) for
-- the full "cloud baseline, no session persistence" rationale.
--
-- Run this once against a fresh tuvara-demo project (SQL editor, or the
-- Supabase CLI). Idempotent-ish via `if not exists`, but not designed to be
-- re-run against a project that already has divergent admin edits.

create extension if not exists pgcrypto;

create table if not exists demo_tenants (
  id text primary key,                 -- 'demo-fashion' | 'demo-craft' | 'demo-food' (matches PilotSlug)
  display_name text not null,
  default_currency text not null,      -- e.g. '৳', '€' — matches TENANT_CONFIGS[slug].currency
  updated_at timestamptz not null default now()
);

create table if not exists demo_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references demo_tenants(id) on delete cascade,
  name text not null,                  -- matches the app's `Category` union, e.g. 'Three-piece'
  environment_label text,              -- categoryFieldConfig().environmentLabel
  environment_placeholder text,        -- categoryFieldConfig().environmentPlaceholder
  name_hint text,                      -- categoryFieldConfig().nameHint
  sort_order int not null default 0,
  unique (tenant_id, name)
);

create table if not exists demo_category_keywords (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references demo_tenants(id) on delete cascade,
  category_id uuid not null references demo_categories(id) on delete cascade,
  keyword text not null
);

-- Full StockItem parity (see src/types.ts) so the admin view can edit every
-- field the app actually renders per item, not just the name/price/sold
-- subset. period_id/color/bulk_*/season/item_group are included for parity
-- but unused by today's seed data (demoSeeds.ts never sets them) — nullable,
-- free for the admin view or a later seed to use.
create table if not exists demo_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references demo_tenants(id) on delete cascade,
  category_id uuid references demo_categories(id) on delete set null,
  name text not null,
  quantity int not null default 0,
  purchase_price numeric not null default 0,
  sale_price numeric not null default 0,
  currency text not null,
  supplier text,
  tags text[] not null default '{}',
  image_url text,
  environment text,
  channels jsonb not null default '[]',  -- SalesChannel[] — [{ id, name, price? }]
  aging boolean not null default false,
  sold_out boolean not null default false,
  aging_action text check (aging_action in ('markdown', 'bundle', 'donate', 'other')),
  aging_action_note text,
  period_id text,
  color text,
  bulk_threshold numeric,
  bulk_unit_price numeric,
  season text,
  variant_group text,                   -- StockItem.variantGroup
  shop text,                            -- StockItem.shop
  sort_order int not null default 0,
  created_at_ms bigint not null,        -- mirrors StockItem.createdAt (epoch ms) so sort-by-newest matches today's behaviour
  updated_at timestamptz not null default now()
);

create index if not exists demo_categories_tenant_idx on demo_categories(tenant_id, sort_order);
create index if not exists demo_category_keywords_category_idx on demo_category_keywords(category_id);
create index if not exists demo_products_tenant_idx on demo_products(tenant_id, sort_order);

-- RLS: anonymous (the public demo pages) can only ever read. Writes require
-- an authenticated Supabase session — see the admin view, which signs in
-- with one hardcoded admin account via supabase.auth.signInWithPassword().
-- This is deliberate: the anon key ships in every /demo-* page's JS bundle
-- (needed there for reads), and those pages sit behind a freely-shared
-- password (demo/demo123, meant to be given to prospects) — so anon writes
-- would let anyone who opens devtools on a demo page write directly to
-- these tables via the Supabase REST API, bypassing the Cloudflare
-- password gate on /demo-admin entirely. Authenticated-only writes close
-- that gap regardless of what leaks from the client bundle.
alter table demo_tenants enable row level security;
alter table demo_categories enable row level security;
alter table demo_category_keywords enable row level security;
alter table demo_products enable row level security;

create policy "anon read demo_tenants" on demo_tenants for select to anon using (true);
create policy "anon read demo_categories" on demo_categories for select to anon using (true);
create policy "anon read demo_category_keywords" on demo_category_keywords for select to anon using (true);
create policy "anon read demo_products" on demo_products for select to anon using (true);

-- "for all" covers select/insert/update/delete, so the authenticated admin
-- session gets both read and write from these single policies.
create policy "admin all demo_tenants" on demo_tenants for all to authenticated using (true) with check (true);
create policy "admin all demo_categories" on demo_categories for all to authenticated using (true) with check (true);
create policy "admin all demo_category_keywords" on demo_category_keywords for all to authenticated using (true) with check (true);
create policy "admin all demo_products" on demo_products for all to authenticated using (true) with check (true);
