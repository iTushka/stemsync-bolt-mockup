import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { demoSupabase } from '../lib/demoSupabaseClient';
import { DEMO_PILOT_SLUGS, TENANT_CONFIGS, type PilotSlug } from '../config';
import { DemoAdminLogin } from './DemoAdminLogin';
import { DemoAdminTenantPanel } from './DemoAdminTenantPanel';

/**
 * /demo-admin — a single-person tool for Tushar to edit what the three
 * sales-demo pilots show, stored in the standalone tuvara-demo Supabase
 * project. Gated twice: Cloudflare Basic Auth on the page load itself
 * (functions/_middleware.js, DEMO_ADMIN_USER/PASS), and a real Supabase
 * Auth session for every write (RLS in
 * supabase/migrations/0001_demo_schema.sql only allows writes to an
 * `authenticated` role, never `anon` — see DemoAdminLogin.tsx for why).
 * No roles, no other accounts — deliberately the smallest possible tool.
 */
export function DemoAdminApp() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');
  const [activeSlug, setActiveSlug] = useState<PilotSlug>(DEMO_PILOT_SLUGS[0]);

  useEffect(() => {
    if (!demoSupabase) {
      setSession(null);
      return;
    }
    demoSupabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = demoSupabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === 'loading') {
    return <div className="p-6 text-sm text-stone-400">Loading…</div>;
  }

  if (!session) {
    return <DemoAdminLogin onSignedIn={() => { /* onAuthStateChange updates session */ }} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-stone-800">Demo admin</h1>
        <button
          onClick={() => demoSupabase?.auth.signOut()}
          className="text-xs text-stone-400 hover:text-red-500"
        >
          Sign out
        </button>
      </div>

      <div className="flex gap-1.5 mb-6 border-b border-stone-200">
        {DEMO_PILOT_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => setActiveSlug(slug)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              activeSlug === slug
                ? 'border-accent-500 text-accent-600'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {TENANT_CONFIGS[slug].displayName}
          </button>
        ))}
      </div>

      <DemoAdminTenantPanel key={activeSlug} slug={activeSlug} />
    </div>
  );
}
