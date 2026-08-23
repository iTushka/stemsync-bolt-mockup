// Self-service demo-agent password reset — the only place the tuvara-demo
// project's service_role key is ever used. Runs server-side in Supabase's
// Edge Function runtime, never in a browser. Bridges
// verify_reset_token()/clear_reset_token() (Postgres, checks the single-use
// token — see supabase/migrations/0002_demo_agents.sql) and
// supabase.auth.admin.updateUserById() (the only Supabase-supported way to
// set a user's password programmatically — direct writes to auth.users
// aren't supported).
//
// Mirrors tuvara-faltagent's reset-agent-password Edge Function (same
// pattern, different Supabase project/schema — not shared code).
//
// Deliberately verify-then-update-then-clear, not verify-and-consume in one
// step: if updateUserById fails for a recoverable reason (e.g. too short a
// password), the token stays valid so the agent can retry with a different
// password instead of restarting the whole security-question flow.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let phone: unknown, token: unknown, newPassword: unknown;
  try {
    ({ phone, token, newPassword } = await req.json());
  } catch {
    return jsonResponse({ error: 'Invalid request.' }, 400);
  }

  if (
    typeof phone !== 'string' ||
    typeof token !== 'string' ||
    typeof newPassword !== 'string' ||
    !phone ||
    !token ||
    !newPassword
  ) {
    return jsonResponse({ error: 'Phone number, token, and new password are required.' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: agentId, error: verifyError } = await admin.rpc('verify_reset_token', {
    p_phone: phone,
    p_token: token,
  });

  if (verifyError || !agentId) {
    return jsonResponse({ error: 'Invalid or expired reset code. Start over.' }, 400);
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(agentId as string, {
    password: newPassword,
  });

  if (updateError) {
    // Token deliberately NOT cleared here — see the file header comment.
    return jsonResponse({ error: updateError.message }, 500);
  }

  await admin.rpc('clear_reset_token', { p_agent_id: agentId });

  return jsonResponse({ success: true }, 200);
});
