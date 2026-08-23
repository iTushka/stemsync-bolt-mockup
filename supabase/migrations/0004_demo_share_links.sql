-- Temporary, tokenized share links for the three sales-demo pilots — a
-- third, separate way in alongside Basic Auth (outer, Cloudflare-level) and
-- demo-agent accounts (inner, phone+password): a link a prospect can open
-- directly, with no Basic Auth password and no account of their own. See
-- claude-code-kravspec-demo-delningslank.md.
--
-- Same pattern as demo_agents/demo_admins (0002/0003): RLS enabled, all
-- direct client access revoked, and a single SECURITY DEFINER RPC as the
-- only way in — anon must be able to call it, since a prospect opening a
-- share link is by definition not signed in as anything.
--
-- Runs in the tuvara-demo project (ref sayevroojvxsclfnrykg) — confirmed
-- before running, per this kravspec's own VIKTIGT.

create table if not exists demo_share_links (
  token uuid primary key default gen_random_uuid(),
  tenant_slug text not null check (tenant_slug in ('demo-fashion', 'demo-craft', 'demo-food')),
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 days'),
  revoked_at timestamptz
);

comment on table demo_share_links is
  'Manually generated (SQL Editor, see docs/demo-share-links.md), one row '
  'per shared link. label is admin-only bookkeeping to find the right row '
  'when revoking later, no business logic reads it. No direct SELECT/write '
  'from any client role — validate_demo_share_link() is the only access '
  'path, mirroring demo_agents/demo_admins.';

alter table demo_share_links enable row level security;
revoke all on demo_share_links from authenticated, anon;
-- No policies at all: token/label/expiry must never be directly listable
-- by a client session — that would let anyone enumerate every live share
-- link, not just the one they were given.

-- ---------------------------------------------------------------------
-- validate_demo_share_link — the only way a client (always anon here; a
-- prospect opening a share link isn't signed in as anything) can check a
-- token. True only if the token exists, matches the requested tenant,
-- hasn't been revoked, and hasn't expired.
-- ---------------------------------------------------------------------
create or replace function validate_demo_share_link(p_token uuid, p_tenant_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from demo_share_links
    where token = p_token
      and tenant_slug = p_tenant_slug
      and revoked_at is null
      and expires_at > now()
  );
$$;

revoke execute on function validate_demo_share_link(uuid, text) from public;
grant execute on function validate_demo_share_link(uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';
