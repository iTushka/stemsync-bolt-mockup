# Adding a new demo agent

No self-registration and no in-app admin UI for this — the kravspec asked
for whichever of "dashboard" or "a minimal admin function" was simplest;
this is it: manual steps in the **tuvara-demo** Supabase project's
dashboard, no new app code, no Edge Function deploy needed for account
creation (only the password-reset flow needs a deployed Edge Function —
see the bottom of this file).

One demo-agent account gives access to **all three** demo pilots
(/demo-fashion, /demo-craft, /demo-food) — there's no per-pilot account.

Agents log in with **phone number + their own password**. Supabase Auth
needs an email-shaped identifier internally, so each phone number maps to a
synthetic, non-deliverable address — see `phoneToSyntheticEmail` in
`src/lib/demoAgentPhone.ts`. You never need to compute this by hand except
when creating the user below.

## One-time setup: DNS

Before creating the first agent, `agents.demo.glocalunit.com` needs a
placeholder MX record (DNS only, no real mailbox behind it) — Supabase's
GoTrue rejects a from-scratch made-up domain outright unless it resolves
with an MX record. This mirrors the same one-time step already done for
`agents.samcrm.glocalunit.com` (tuvara-faltagent) — same idea, a distinct
subdomain so the two projects' synthetic addresses can never collide.

Add (via wherever glocalunit.com's DNS is managed, e.g. Cloudflare):
```
Type: MX
Name: agents.demo
Priority: 10
Target: mail.agents.demo.glocalunit.com
```
No corresponding A/AAAA record is needed for the target — it never needs to
actually receive mail, only resolve at the DNS level. Skip this step if
it's already there from a previous session.

## Steps

1. **Normalize the agent's phone number** to international `+`-prefixed
   form (see `normalizePhone` in `src/lib/demoAgentPhone.ts`) — e.g.
   `+46701234567`. Unlike tuvara-faltagent, there's no default country
   assumed here (the four demo agents aren't all in one country), so make
   sure you have the full number with country code up front.

2. **Supabase Dashboard (tuvara-demo project) → Authentication → Add
   user**:
   - Email: the digits of the normalized phone (no `+`), followed by
     `@agents.demo.glocalunit.com` — e.g.
     `46701234567@agents.demo.glocalunit.com`.
   - Password: pick an initial password and share it with the agent
     directly (WhatsApp/in person) — this is what they'll type into the
     app's password field.
   - **Auto Confirm User must be checked** — without it, login fails with
     "Email not confirmed" since there's no real inbox behind this address.
   - Copy the new user's UUID after creation.

3. **SQL Editor** (tuvara-demo project) — link the auth user to a
   `demo_agents` row:
   ```sql
   insert into demo_agents (id, phone, name) values
     ('<uuid from step 2>', '+46701234567', 'Agent name here');
   ```

4. **SQL Editor** — set a security question, for self-service password
   reset. Agree on the question/answer with the agent verbally when they
   start:
   ```sql
   update demo_agents
   set security_question = 'Din fråga här',
       security_answer_hash = crypt(lower(trim('svaret')), gen_salt('bf'))
   where phone = '+46701234567';
   ```
   Note `lower(trim(...))` around the answer — the reset flow normalizes
   the submitted answer the same way, so casing/whitespace differences
   don't cause a false mismatch. This step is optional, but skipping it
   means the agent can never use "Forgot password" themselves — the reset
   screen will tell them there's no security question set instead of
   guessing or failing silently.

The agent can now log in at `/demo-fashion`, `/demo-craft`, or
`/demo-food` with `+46701234567` (or any equivalent formatting —
`normalizePhone` handles that) and the password you set in step 2.

## Self-service password reset

"Forgot password" on the demo login screen lets an agent with a security
question set (step 4 above) change their own password without contacting
you. **This requires the `reset-demo-agent-password` Edge Function to be
deployed** (`supabase/functions/reset-demo-agent-password/`) — deploy it
once with the Supabase CLI:
```
supabase functions deploy reset-demo-agent-password --project-ref <tuvara-demo project ref>
```
The function needs `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` — Supabase
sets both automatically for every Edge Function in the project, no manual
secret configuration needed.

For an agent with no question set (step 4 skipped), or as a fallback any
time, resetting a forgotten password still means repeating step 2 with the
same phone number's email and a new password (no need to touch the
`demo_agents` row again, it's already linked by `id`).

## One-time setup: registering the /demo-admin account for writes

`supabase/migrations/0003_demo_admin_only_writes.sql` scopes writes on
`demo_tenants`/`demo_categories`/`demo_category_keywords`/`demo_products` to
a `demo_admins` allowlist, instead of any authenticated session — otherwise
every demo agent created above would *also* get write access to the demo
catalog, just by virtue of being an authenticated user in the same project.

After running that migration, register the existing `/demo-admin` account
(the one `DemoAdminLogin.tsx` signs in) once:
1. Supabase Dashboard (tuvara-demo project) → Authentication → find that
   admin user → copy its UUID.
2. SQL Editor:
   ```sql
   insert into demo_admins (id) values ('<admin uuid>');
   ```

**Never add a demo_agents UUID here** — agent accounts are view-only by
design; only the single admin account should ever be in `demo_admins`. If
`/demo-admin` stops being able to save changes after this migration runs,
this step was skipped.
