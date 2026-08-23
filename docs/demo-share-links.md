# Temporary demo share links

A third, separate way into `/demo-fashion`, `/demo-craft`, `/demo-food` —
alongside Basic Auth (outer, Cloudflare-level) and demo-agent accounts
(inner, phone+password, see `docs/adding-a-demo-agent.md`) — for a prospect
who should be able to click around a demo themselves after a sales call,
without getting the Basic Auth password or their own agent account.

A link is a random token tied to **one specific demo tenant**, valid for
**45 days from generation**, with **unlimited opens** during that window.
Generated manually, one row at a time, same "SQL Editor is enough for this
volume" model as `docs/adding-a-demo-agent.md` already established for
agent accounts — no in-app admin UI for this yet.

## Generating a link

**SQL Editor** (tuvara-demo project, ref `sayevroojvxsclfnrykg`):
```sql
insert into demo_share_links (tenant_slug, label)
values ('demo-fashion', 'Jhum Fashion — prospekt aug 2026')
returning token;
```
`tenant_slug` must be exactly one of `demo-fashion`, `demo-craft`,
`demo-food`. `label` is optional but recommended — a short note so you can
find the right row again later when revoking; it's admin bookkeeping only,
never shown to the prospect.

Build the full link from the returned `token`:
```
https://tuvara.glocalunit.com/demo-fashion?share=<token>
```
(swap the path for `/demo-craft` or `/demo-food` to match the `tenant_slug`
you inserted — the token only validates against the one tenant it was
created for).

## Revoking a link

```sql
update demo_share_links set revoked_at = now() where token = '<token>';
-- or, if you only remember the label:
update demo_share_links set revoked_at = now() where label = 'Jhum Fashion — prospekt aug 2026';
```
Takes effect immediately — both `functions/_middleware.js`'s server-side
check and the app's own client-side check call the same
`validate_demo_share_link()` RPC on every request, so there's no caching to
work around. This includes the `demo_share` cookie the middleware sets
after the first successful `?share=` request (see the file's own comments)
so the browser's asset requests — `/assets/*.js`, `/assets/*.css`,
`/favicon.svg`, which never carry the page's query string — can also get
past Basic Auth: the cookie only ever carries the token, it's re-validated
against Postgres on every single request, so a revoked/expired token is
rejected on the very next request even if the (HttpOnly, non-JS-readable)
cookie is technically still sitting in the browser.

## What this does and doesn't protect against

- The link works for **anyone who has it**, for the full 45 days — sending
  it counts as authorizing whoever receives it. It doesn't stop the
  prospect from forwarding it to someone else; that's the accepted
  trade-off of a simple share link, not a bug. Revoke it if that becomes a
  problem for a specific link.
- It grants access to exactly the one demo tenant it was generated for —
  a `demo-fashion` link does not work on `/demo-craft` or `/demo-food`.
- No open/visit counting or other tracking is attached to a link.
- A prospect using a share link is never signed in as anything (stays
  `anon`) — that's sufficient because the demo catalog data itself is
  already anonymously readable (see `supabase/migrations/0001_demo_schema.sql`);
  the link only needs to get them past the Basic Auth / agent-login layers,
  not grant any additional data access.

## One-time setup this depends on

Cloudflare Pages needs two **Functions runtime** environment variables
(separate from the `VITE_`-prefixed build-time ones, and never entering the
client bundle) so `functions/_middleware.js` can call
`validate_demo_share_link()` server-side before ever showing the Basic Auth
prompt:
```
DEMO_SUPABASE_URL=<same URL as VITE_DEMO_SUPABASE_URL>
DEMO_SUPABASE_ANON_KEY=<same key as VITE_DEMO_SUPABASE_ANON_KEY>
```
Set both in the Cloudflare Pages project settings (Settings → Environment
variables → Production/Preview, Functions section) — see `.env.example`
for the fuller note. If these aren't set, the middleware's share-link check
always fails closed and every `/demo-*` request falls back to Basic Auth as
usual — a missing/misconfigured pair degrades to "share links don't work
yet," never to "Basic Auth is skipped by accident."
