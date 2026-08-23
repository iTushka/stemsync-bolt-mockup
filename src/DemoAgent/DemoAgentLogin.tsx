import { useState } from 'react';
import { demoSupabaseConfigured } from '../lib/demoSupabaseClient';
import { loginDemoAgent } from '../lib/demoAgentAuth';
import { ForgotDemoAgentPasswordSheet } from './ForgotDemoAgentPasswordSheet';

interface Props {
  onSignedIn: () => void;
}

/**
 * App-rendered login for /demo-fashion|craft|food, replacing the shared
 * demo/demo123 password with unique per-agent accounts (phone + own
 * password). Same UX pattern as DemoAdminLogin.tsx — the proven fix for the
 * native Basic Auth dialog bug (unreliable in Brave, no "wrong password"
 * feedback, just a silent re-prompt): a plain in-app form with explicit
 * error text instead. See claude-code-kravspec-demo-inloggning-agent-konton.md.
 *
 * functions/_middleware.js's Basic Auth gate for /demo-* is deliberately
 * left untouched for now (see that kravspec's Krav 4) — this login is an
 * additional, inner layer today, same two-layer shape /demo-admin already
 * has. Removing the outer Basic Auth gate is a small follow-up commit once
 * Tushar has verified this screen live.
 */
export function DemoAgentLogin({ onSignedIn }: Props) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  if (!demoSupabaseConfigured) {
    return (
      <div className="max-w-sm mx-auto mt-24 p-6 text-sm text-stone-600">
        <p className="font-medium text-stone-800 mb-2">Demo login isn't configured yet.</p>
        <p>
          Set <code className="text-xs bg-stone-100 px-1 rounded">VITE_DEMO_SUPABASE_URL</code> and{' '}
          <code className="text-xs bg-stone-100 px-1 rounded">VITE_DEMO_SUPABASE_ANON_KEY</code> as
          Cloudflare Pages build environment variables, then redeploy.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const signInError = await loginDemoAgent(phone, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    onSignedIn();
  };

  return (
    <div className="max-w-sm mx-auto mt-24 p-6">
      <h1 className="text-lg font-semibold text-stone-800 mb-1">Demo sign-in</h1>
      <p className="text-xs text-stone-500 mb-6">
        Sign in with your phone number and password to view this demo.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="tel"
          required
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+46701234567"
          className="input"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="input"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-accent-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowForgotPassword(true)}
        className="mt-4 text-xs text-stone-400 hover:text-stone-600 underline"
      >
        Forgot password?
      </button>
      {showForgotPassword && (
        <ForgotDemoAgentPasswordSheet onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}
