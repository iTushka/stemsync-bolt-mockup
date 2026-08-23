import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoSupabase } from '../lib/demoSupabaseClient';
import { validateDemoShareLink } from '../lib/demoAgentAuth';
import { PILOT_SLUG, isDemoPilot } from '../config';
import { DemoAgentLogin } from './DemoAgentLogin';

interface Props {
  children: ReactNode;
}

/**
 * Wraps the main app for the three sales-demo pilots (/demo-fashion|craft|
 * food) with an access check. A no-op for every other pilot (flowertot/
 * jhums/moja/shoilee), which keep using functions/_middleware.js's
 * APP_AUTH_* Basic Auth exactly as before — this feature is strictly
 * additive on top of the existing demo-tenant cloud sync (613c4cc), not a
 * change to real-pilot auth.
 *
 * Two ways in for a gated pilot, checked in this order:
 * 1. A valid ?share=<token> link (see docs/demo-share-links.md) — a
 *    prospect-facing, account-free, time-limited link. Skips
 *    DemoAgentLogin entirely; the visitor stays `anon`, which is enough
 *    since the catalog data is already anonymously readable via RLS. Same
 *    validate_demo_share_link() RPC functions/_middleware.js's own
 *    server-side Basic Auth exception calls — this is the client-side
 *    check for the (much more common) case where the share link visitor
 *    never even sees a Basic Auth prompt, e.g. because the middleware
 *    exception already let them through.
 * 2. The existing per-agent Supabase Auth session (phone+password login,
 *    see claude-code-kravspec-demo-inloggning-agent-konton.md) —
 *    unchanged, falls back to DemoAgentLogin when there's no session and
 *    no valid share token.
 *
 * Reuses the same tuvara-demo Supabase project/client demo_products etc.
 * already use (demoSupabaseClient.ts).
 */
export function DemoAgentGate({ children }: Props) {
  const gated = isDemoPilot(PILOT_SLUG);
  const shareToken = gated ? new URLSearchParams(window.location.search).get('share') : null;

  const [session, setSession] = useState<Session | null | 'loading'>(gated ? 'loading' : null);
  const [shareValid, setShareValid] = useState<boolean | 'checking'>(shareToken ? 'checking' : false);

  useEffect(() => {
    if (!gated || !shareToken) return;
    let cancelled = false;
    validateDemoShareLink(shareToken, PILOT_SLUG).then((valid) => {
      if (!cancelled) setShareValid(valid);
    });
    return () => {
      cancelled = true;
    };
  }, [gated, shareToken]);

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

  if (shareToken && shareValid === 'checking') {
    return <div className="p-6 text-sm text-stone-400">Loading…</div>;
  }

  if (shareToken && shareValid === true) {
    return (
      <>
        <div className="shrink-0 px-4 py-1.5 bg-stone-800 text-stone-200 text-[11px] text-center">
          Temporary preview link — not signed in as an account
        </div>
        {children}
      </>
    );
  }

  // No share token, or an invalid/expired/revoked one — falls back to the
  // normal per-agent login exactly as before.
  if (session === 'loading') {
    return <div className="p-6 text-sm text-stone-400">Loading…</div>;
  }

  if (!session) {
    return <DemoAgentLogin onSignedIn={() => { /* onAuthStateChange updates session */ }} />;
  }

  return <>{children}</>;
}
