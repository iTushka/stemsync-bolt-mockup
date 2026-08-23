-- Demo-agent login: unique per-agent accounts for the freely-shared
-- /demo-fashion, /demo-craft, /demo-food sales-demo pilots, replacing the
-- single shared demo/demo123 password those pages used before. Mirrors the
-- pattern already built and confirmed working live in tuvara-faltagent
-- (tuvara-sales Krav 2 + Krav 5: phone + own password -> synthetic email ->
-- supabase.auth.signInWithPassword, plus a security-question-based
-- self-service reset) — not copied code (different repo, different
-- Supabase project, different data model), the same dataflow. See
-- claude-code-kravspec-demo-inloggning-agent-konton.md.
--
-- One demo-agent account gives access to all three demo pilots
-- (fashion/craft/food), not one account per pilot — so unlike
-- demo_products etc. there is no tenant_id column here.
--
-- Runs in the SAME tuvara-demo Supabase project as 0001_demo_schema.sql
-- (confirmed with Tushar before running this, per this kravspec's own
-- VIKTIGT #6) — never stem-savvy-seller's production project, never
-- tuvara-sales's own separate project.
--
-- SECURITY NOTE (flagged, deliberately NOT fixed here — out of scope for
-- this task): 0001_demo_schema.sql's existing "admin all ... to
-- authenticated using (true)" policies on demo_tenants/demo_categories/
-- demo_products grant ANY authenticated session in this project full
-- read/write on the demo catalog data. That was written when the only
-- authenticated identity in this project was the single /demo-admin
-- account. Adding demo_agents means every demo agent created here also
-- becomes "authenticated" and therefore ALSO gets that same catalog write
-- access under the existing policies — even though nothing in this
-- feature's app UI ever exercises it. This migration does not touch those
-- policies; see the delivery summary for why and what to do about it.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- demo_agents — one row per person allowed to log into the demo pilots,
-- 1:1 with an auth.users row in this project (created manually by Tushar,
-- see docs/adding-a-demo-agent.md — never via self-registration). Passwords
-- live in Supabase Auth (auth.users), not here — mirrors tuvara-faltagent's
-- agents table exactly on this point.
-- ---------------------------------------------------------------------
create table if not exists demo_agents (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  name text,
  created_at timestamptz not null default now(),

  -- self-service password reset via security question
  security_question text,
  security_answer_hash text,
  failed_reset_attempts int not null default 0,
  reset_locked_until timestamptz,
  reset_token_hash text,
  reset_token_expires_at timestamptz
);

comment on table demo_agents is
  'One row per person allowed to log into /demo-fashion|craft|food, 1:1 '
  'with auth.users. No direct SELECT grant reaches security_answer_hash/'
  'reset_token_hash from any role, including the owning agent — see the '
  'RPCs below, mirroring tuvara-faltagent''s agents table.';

alter table demo_agents enable row level security;

-- Supabase's default table privileges for `authenticated` are broader than
-- needed here, so revoke first and grant back nothing at all: no SELECT
-- policy exists, on purpose. The app has no need to read an agent's own
-- profile back today (unlike tuvara-faltagent, nothing here shows the
-- signed-in agent's name/phone), so there's no SECURITY DEFINER profile
-- RPC either — add one later only if a real need for it shows up.
revoke all on demo_agents from authenticated, anon;

-- ---------------------------------------------------------------------
-- get_security_question / request_password_reset / verify_reset_token /
-- clear_reset_token — same four-RPC design as tuvara-faltagent's Krav 5
-- (supabase/migrations/0004_krav5_password_reset.sql there), reproduced
-- here because this is a different Supabase project with its own schema,
-- not something importable across projects. See that file's comments for
-- the full reasoning behind the status values and the verify-then-update-
-- then-clear split; only reproduced briefly below.
-- ---------------------------------------------------------------------

-- get_security_question — step 1 of "Glömt lösenord": given a phone
-- number, tell the client what question to show (or why it can't
-- proceed), before any answer is submitted.
create or replace function get_security_question(p_phone text)
returns table (status text, question text)
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_agent record;
begin
  select a.security_question, a.security_answer_hash, a.reset_locked_until
    into v_agent
    from demo_agents a
    where a.phone = p_phone;

  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  if v_agent.reset_locked_until is not null and v_agent.reset_locked_until > now() then
    return query select 'locked_out'::text, null::text;
    return;
  end if;

  if v_agent.security_question is null or v_agent.security_answer_hash is null then
    return query select 'no_question_set'::text, null::text;
    return;
  end if;

  return query select 'ok'::text, v_agent.security_question;
end;
$$;

revoke execute on function get_security_question(text) from public;
grant execute on function get_security_question(text) to anon;

-- request_password_reset — step 2: verify the submitted answer. 5 wrong
-- answers locks further attempts for 30 minutes. On a correct answer,
-- issues a single-use, 10-minute token (returned in plaintext exactly
-- once — only its bcrypt hash is ever stored).
create or replace function request_password_reset(p_phone text, p_security_answer text)
returns table (status text, token text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_agent record;
  v_new_attempts int;
  v_token text;
begin
  select a.id, a.security_question, a.security_answer_hash, a.reset_locked_until, a.failed_reset_attempts
    into v_agent
    from demo_agents a
    where a.phone = p_phone;

  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  if v_agent.reset_locked_until is not null and v_agent.reset_locked_until > now() then
    return query select 'locked_out'::text, null::text;
    return;
  end if;

  if v_agent.security_question is null or v_agent.security_answer_hash is null then
    return query select 'no_question_set'::text, null::text;
    return;
  end if;

  -- Normalized the same way the answer is hashed when set (see
  -- docs/adding-a-demo-agent.md) — lower/trim so casing and stray
  -- whitespace don't cause a false mismatch.
  if crypt(lower(trim(p_security_answer)), v_agent.security_answer_hash) <> v_agent.security_answer_hash then
    update demo_agents
      set failed_reset_attempts = failed_reset_attempts + 1,
          reset_locked_until = case
            when failed_reset_attempts + 1 >= 5 then now() + interval '30 minutes'
            else reset_locked_until
          end
      where id = v_agent.id
      returning failed_reset_attempts into v_new_attempts;

    if v_new_attempts >= 5 then
      return query select 'locked_out'::text, null::text;
    else
      return query select 'wrong_answer'::text, null::text;
    end if;
    return;
  end if;

  v_token := encode(gen_random_bytes(32), 'hex');
  update demo_agents
    set failed_reset_attempts = 0,
        reset_locked_until = null,
        reset_token_hash = crypt(v_token, gen_salt('bf')),
        reset_token_expires_at = now() + interval '10 minutes'
    where id = v_agent.id;

  return query select 'success'::text, v_token;
end;
$$;

revoke execute on function request_password_reset(text, text) from public;
grant execute on function request_password_reset(text, text) to anon;

-- verify_reset_token / clear_reset_token — called only by the
-- reset-demo-agent-password Edge Function via its service_role client,
-- never directly by anon/authenticated. Split into a read-only check and a
-- separate clear step deliberately: the Edge Function verifies first, then
-- attempts auth.admin.updateUserById(), and only clears the token once
-- that succeeds — so a recoverable failure (e.g. a too-short password)
-- doesn't burn the agent's one-time token.
create or replace function verify_reset_token(p_phone text, p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select a.id
    from demo_agents a
    where a.phone = p_phone
      and a.reset_token_hash is not null
      and a.reset_token_expires_at > now()
      and crypt(p_token, a.reset_token_hash) = a.reset_token_hash;
$$;

create or replace function clear_reset_token(p_agent_id uuid)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  update demo_agents
    set reset_token_hash = null,
        reset_token_expires_at = null
    where id = p_agent_id;
$$;

-- Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION — these
-- two must not be callable by anon/authenticated at all, only by
-- service_role (used exclusively inside the Edge Function). Revoking from
-- PUBLIC without an explicit grant back to service_role would leave
-- service_role itself with permission denied too (its only route to these
-- functions is implicit PUBLIC membership) — see tuvara-faltagent's
-- 0004 migration comment for how this was caught during live testing there.
revoke execute on function verify_reset_token(text, text) from public;
revoke execute on function clear_reset_token(uuid) from public;
grant execute on function verify_reset_token(text, text) to service_role;
grant execute on function clear_reset_token(uuid) to service_role;

notify pgrst, 'reload schema';
