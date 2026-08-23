-- Tightens catalog write access on demo_tenants/demo_categories/
-- demo_category_keywords/demo_products to the single /demo-admin identity
-- only, instead of "any authenticated session in this project."
--
-- This is a direct consequence of 0002_demo_agents.sql, not separate scope:
-- 0001_demo_schema.sql's "admin all ... to authenticated using (true)"
-- policies were written when the only authenticated identity in the
-- tuvara-demo project was ever going to be the single hardcoded
-- /demo-admin account (see DemoAdminLogin.tsx). Adding demo_agents means
-- every demo agent is now ALSO "authenticated" in the same project — under
-- the old policies, every demo agent would therefore also get full write
-- access to the demo catalog data, even though the app UI never exercises
-- that. This migration closes the gap.
--
-- Run in the tuvara-demo project, after 0002_demo_agents.sql.

-- ---------------------------------------------------------------------
-- demo_admins — allowlist of the (today: one) /demo-admin identity.
-- Populated by hand, same "Tushar does one manual insert" model as
-- demo_agents (see docs/adding-a-demo-agent.md) — not self-service, and
-- deliberately not readable/writable by any client session, including the
-- admin's own: only is_demo_admin() below ever reads it, as the function
-- owner (SECURITY DEFINER), bypassing RLS.
-- ---------------------------------------------------------------------
create table if not exists demo_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table demo_admins is
  'Allowlist of who may write to demo_tenants/categories/products — '
  'today just the single /demo-admin account. Add its auth.users UUID '
  'here manually (see docs/adding-a-demo-agent.md); demo_agents rows must '
  'never be added here — an agent account is view-only by design.';

alter table demo_admins enable row level security;
revoke all on demo_admins from authenticated, anon;
-- No policies at all: nobody can read or write this table directly from
-- any client role, full stop.

create or replace function is_demo_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from demo_admins where id = auth.uid());
$$;

revoke execute on function is_demo_admin() from public;
grant execute on function is_demo_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Replace the old "any authenticated" write policies with admin-only ones.
-- Anon read access (0001_demo_schema.sql's "anon read ..." policies) is
-- untouched — the demo catalog data itself stays freely, publicly
-- readable, exactly as originally decided; only who may WRITE it changes.
-- ---------------------------------------------------------------------
drop policy if exists "admin all demo_tenants" on demo_tenants;
drop policy if exists "admin all demo_categories" on demo_categories;
drop policy if exists "admin all demo_category_keywords" on demo_category_keywords;
drop policy if exists "admin all demo_products" on demo_products;

create policy "demo admin only write demo_tenants" on demo_tenants
  for all to authenticated using (is_demo_admin()) with check (is_demo_admin());
create policy "demo admin only write demo_categories" on demo_categories
  for all to authenticated using (is_demo_admin()) with check (is_demo_admin());
create policy "demo admin only write demo_category_keywords" on demo_category_keywords
  for all to authenticated using (is_demo_admin()) with check (is_demo_admin());
create policy "demo admin only write demo_products" on demo_products
  for all to authenticated using (is_demo_admin()) with check (is_demo_admin());

notify pgrst, 'reload schema';
