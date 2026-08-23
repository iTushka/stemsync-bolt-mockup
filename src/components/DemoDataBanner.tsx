import { Info } from 'lucide-react';
import { PILOT_SLUG, isDemoPilot } from '../config';
import { demoSupabase } from '../lib/demoSupabaseClient';

/**
 * Persistent, non-dismissible label shown only on the three sales-demo
 * pilots (see config.ts DEMO_PILOT_SLUGS / demoSeeds.ts) — makes it
 * impossible to mistake this fictional example inventory for a real
 * pilot's live stock, the same honesty principle the app applies to
 * AI-drafted content via AiBadge. Not dismissible: it should stay visible
 * for the whole demo, not just the first screen.
 *
 * Also the sign-out affordance for the per-agent login added by
 * claude-code-kravspec-demo-inloggning-agent-konton.md — already the one
 * persistent, demo-only piece of UI, so it's the natural place rather than
 * adding a new always-present element elsewhere. Signing out just clears
 * the Supabase session; DemoAgentGate's onAuthStateChange listener takes
 * it from there and re-shows the login screen.
 */
export function DemoDataBanner() {
  if (!isDemoPilot(PILOT_SLUG)) return null;

  return (
    <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 text-xs font-medium border-b border-amber-200">
      <Info size={14} className="shrink-0" />
      <span className="leading-snug flex-1">
        Demo data — fictional example inventory for sales walkthroughs, not a real customer's stock.
      </span>
      <button
        onClick={() => demoSupabase?.auth.signOut()}
        className="shrink-0 underline hover:text-amber-900"
      >
        Sign out
      </button>
    </div>
  );
}
