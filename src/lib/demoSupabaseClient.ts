import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client for the standalone `tuvara-demo` Supabase project — separate from
 * any other Supabase project this app or its sibling repos touch. Only the
 * anon key ever ships here; it's read-only for anonymous requests (see the
 * RLS policies in supabase/migrations/0001_demo_schema.sql). Admin writes
 * additionally sign in via supabase.auth.signInWithPassword() before
 * writing — see src/DemoAdmin/DemoAdminApp.tsx.
 *
 * Both env vars must be VITE_-prefixed to be embedded in the client bundle
 * by Vite — set them as Cloudflare Pages build environment variables.
 */
const url = import.meta.env?.VITE_DEMO_SUPABASE_URL;
const anonKey = import.meta.env?.VITE_DEMO_SUPABASE_ANON_KEY;

export const demoSupabaseConfigured = Boolean(url && anonKey);

export const demoSupabase: SupabaseClient | null = demoSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

if (!demoSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    'VITE_DEMO_SUPABASE_URL / VITE_DEMO_SUPABASE_ANON_KEY are not set — demo tenants will fall back to their built-in seed data.'
  );
}
