import { useState } from 'react';
import { demoSupabase } from '../lib/demoSupabaseClient';

interface Props {
  onSignedIn: () => void;
}

/**
 * Second layer of protection on top of Cloudflare's Basic Auth gate on
 * /demo-admin (DEMO_ADMIN_USER/DEMO_ADMIN_PASS, see functions/_middleware.js):
 * a real Supabase Auth session is what RLS actually checks before allowing
 * any write to the demo_* tables (see supabase/migrations/0001_demo_schema.sql).
 * One hardcoded admin account, created directly in the tuvara-demo project's
 * Supabase Auth dashboard — no signup flow, no roles.
 */
export function DemoAdminLogin({ onSignedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!demoSupabase) {
    return (
      <div className="max-w-sm mx-auto mt-24 p-6 text-sm text-stone-600">
        <p className="font-medium text-stone-800 mb-2">Demo admin isn't configured yet.</p>
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
    if (!demoSupabase) return;
    setError(null);
    setLoading(true);
    const { error: signInError } = await demoSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError('Sign-in failed — check the admin email and password.');
      return;
    }
    onSignedIn();
  };

  return (
    <div className="max-w-sm mx-auto mt-24 p-6">
      <h1 className="text-lg font-semibold text-stone-800 mb-1">Demo admin</h1>
      <p className="text-xs text-stone-500 mb-6">
        Sign in with the demo admin account to edit tenant/category/product content.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
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
    </div>
  );
}
