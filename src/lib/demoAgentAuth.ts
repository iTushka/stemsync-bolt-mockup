import { FunctionsHttpError } from '@supabase/supabase-js';
import { demoSupabase, demoSupabaseConfigured } from './demoSupabaseClient';
import { normalizePhone, isValidDemoAgentPhone, phoneToSyntheticEmail } from './demoAgentPhone';

const NOT_CONFIGURED_MESSAGE =
  "Demo login isn't configured yet — VITE_DEMO_SUPABASE_URL/VITE_DEMO_SUPABASE_ANON_KEY are missing.";

/** signInWithPassword against the same tuvara-demo project demo_products
 *  etc. already use — see demoSupabaseClient.ts. Mirrors tuvara-faltagent's
 *  useAuth.ts login(), minus its post-login my_agent_profile() check: every
 *  Auth user in this project with a synthetic @agents.demo.glocalunit.com
 *  email is created exclusively via docs/adding-a-demo-agent.md, so a
 *  successful signInWithPassword is sufficient proof of a real demo agent. */
export async function loginDemoAgent(phoneRaw: string, password: string): Promise<string | null> {
  if (!demoSupabaseConfigured || !demoSupabase) return NOT_CONFIGURED_MESSAGE;
  const phone = normalizePhone(phoneRaw);
  if (!isValidDemoAgentPhone(phone)) {
    return 'Enter your phone number with a country code, e.g. +46701234567.';
  }
  const email = phoneToSyntheticEmail(phone);
  const { error } = await demoSupabase.auth.signInWithPassword({ email, password });
  if (error) return 'Wrong phone number or password.';
  return null;
}

export type SecurityQuestionStatus = 'not_found' | 'no_question_set' | 'locked_out' | 'ok';
export type ResetAnswerStatus = 'not_found' | 'no_question_set' | 'locked_out' | 'wrong_answer' | 'success';

interface QuestionRow {
  status: SecurityQuestionStatus;
  question: string | null;
}
interface AnswerRow {
  status: ResetAnswerStatus;
  token: string | null;
}

/** Step 1 of "Forgot password" — see get_security_question in
 *  supabase/migrations/0002_demo_agents.sql. */
export async function fetchSecurityQuestion(
  phoneRaw: string
): Promise<{ status: SecurityQuestionStatus; question: string | null }> {
  if (!demoSupabase) return { status: 'not_found', question: null };
  const phone = normalizePhone(phoneRaw);
  const { data, error } = await demoSupabase.rpc('get_security_question', { p_phone: phone });
  if (error) throw error;
  const row = (data as QuestionRow[] | null)?.[0];
  return row ? { status: row.status, question: row.question } : { status: 'not_found', question: null };
}

/** Step 2 — verify the answer, get a one-time token back. See
 *  request_password_reset in the same migration. */
export async function submitSecurityAnswer(
  phoneRaw: string,
  answer: string
): Promise<{ status: ResetAnswerStatus; token: string | null }> {
  if (!demoSupabase) return { status: 'not_found', token: null };
  const phone = normalizePhone(phoneRaw);
  const { data, error } = await demoSupabase.rpc('request_password_reset', {
    p_phone: phone,
    p_security_answer: answer,
  });
  if (error) throw error;
  const row = (data as AnswerRow[] | null)?.[0];
  return row ? { status: row.status, token: row.token } : { status: 'not_found', token: null };
}

/** Step 3 — the only step that needs the deployed Edge Function; everything
 *  above is a plain RPC under the anon key. See
 *  supabase/functions/reset-demo-agent-password. */
export async function completePasswordReset(
  phoneRaw: string,
  token: string,
  newPassword: string
): Promise<string | null> {
  if (!demoSupabaseConfigured || !demoSupabase) return NOT_CONFIGURED_MESSAGE;
  const phone = normalizePhone(phoneRaw);
  const { data, error } = await demoSupabase.functions.invoke('reset-demo-agent-password', {
    body: { phone, token, newPassword },
  });
  if (error) {
    // supabase-js turns any non-2xx response into a FunctionsHttpError and
    // leaves `data` empty — the Edge Function's real JSON error message
    // only reaches us via error.context, a raw Response.
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        if (typeof body?.error === 'string') return body.error;
      } catch {
        // Body wasn't JSON (or already consumed) — fall through.
      }
    }
    return error.message;
  }
  if (data?.error) return data.error as string;
  return null;
}

/** Checks a ?share=<token> link (see docs/demo-share-links.md) — the third,
 *  account-free way into a demo pilot, for prospects who shouldn't get the
 *  Basic Auth password or their own agent account. Callable by anon (a
 *  prospect isn't signed in as anything): validate_demo_share_link() is
 *  granted to anon explicitly (see supabase/migrations/0004_demo_share_links.sql).
 *  Any error (bad token format, network failure) is treated as invalid,
 *  same fail-closed stance as the middleware's own check. */
export async function validateDemoShareLink(token: string, tenantSlug: string): Promise<boolean> {
  if (!demoSupabase) return false;
  const { data, error } = await demoSupabase.rpc('validate_demo_share_link', {
    p_token: token,
    p_tenant_slug: tenantSlug,
  });
  if (error) return false;
  return data === true;
}
