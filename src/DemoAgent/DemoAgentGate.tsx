import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoSupabase } from '../lib/demoSupabaseClient';
import { PILOT_SLUG, isDemoPilot } from '../config';
import { DemoAgentLogin } from './DemoAgentLogin';

interface Props {
  children: ReactNode;
}

/**
 * Wraps the main app for the three sales-demo pilots (/demo-fashion|craft|
 * food) with a per-agent Supabase Auth session requirement — see
 * claude-code-kravspec-demo-inloggning-agent-konton.md. A no-op for every
 * other pilot (flowertot/jhums/moja/shoilee), which keep using
 * functions/_middleware.js's APP_AUTH_* Basic Auth exactly as before —
 * this feature is strictly additive on top of the existing demo-tenant
 * cloud sync (613c4cc), not a change to real-pilot auth.
 *
 * Reuses the same tuvara-demo Supabase project/client demo_products etc.
 * already use (demoSupabaseClient.ts) — demo_agents lives there too (see
 * supabase/migrations/0002_demo_agents.sql).
 */
export function DemoAgentGate({ children }: Props) {
  const gated = isDemoPilot(PILOT_SLUG);
  const [session, setSession] = useState<Session | null | 'loading'>(gated ? 'loading' : null);

  useEffect(() => {
    if (!gated) return;
    if (!demoSupabase) {
      setSession(null);
      return;
    }
    demoSupabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = demoSupabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [gated]);

  if (!gated) return <>{children}</>;

  if (session === 'loading') {
    return <div className="p-6 text-sm text-stone-400">Loading…</div>;
  }

  if (!session) {
    return <DemoAgentLogin onSignedIn={() => { /* onAuthStateChange updates session */ }} />;
  }

  return <>{children}</>;
}
