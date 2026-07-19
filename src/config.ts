/**
 * Very small tenant-detection layer for running two separate pilot
 * instances from the same codebase: which tenant is active is picked from
 * (in priority order) a ?tenant= query param, then the URL path
 * (tuvara.glocalunit.com/flowertot), then the hostname, falling back to
 * Flowertot as the default. This lets us deploy the exact same build to a
 * single domain with both pilots living at their own path, to two
 * different subdomains, or test both locally via a query param — no
 * divergent code branches to keep in sync.
 *
 * Path-based routing needs one thing on the hosting side: a catch-all
 * rewrite so a direct visit or refresh at /flowertot or /jhums still
 * serves index.html instead of 404ing (this app has no server-side
 * routing — see public/_redirects for the Cloudflare Pages version of
 * that rule).
 */
export type TenantId = 'flowertot' | 'jhums';

function detectTenant(): TenantId {
  if (typeof window === 'undefined') return 'flowertot';

  const fromQuery = new URLSearchParams(window.location.search).get('tenant');
  if (fromQuery === 'jhums' || fromQuery === 'flowertot') return fromQuery;

  const firstPathSegment = window.location.pathname.split('/')[1]?.toLowerCase();
  if (firstPathSegment === 'jhums' || firstPathSegment === 'flowertot') {
    return firstPathSegment;
  }

  if (window.location.hostname.includes('jhums')) return 'jhums';
  return 'flowertot';
}

export const TENANT: TenantId = detectTenant();

export const DEFAULT_CURRENCY = TENANT === 'jhums' ? '৳' : '£';

/** Every localStorage key is prefixed with this, so the two pilots' test
 *  data can never collide even if tested in the same browser. */
export const STORAGE_PREFIX = `stemsync-${TENANT}`;
