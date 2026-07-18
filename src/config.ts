/**
 * Very small tenant-detection layer for running two separate pilot
 * instances from the same codebase: which tenant is active is picked from
 * (in priority order) a ?tenant= query param, then the hostname, falling
 * back to Flowertot as the default. This lets us deploy the exact same
 * build to two different subdomains later, or test both locally right now
 * via a query param — no divergent code branches to keep in sync.
 */
export type TenantId = 'flowertot' | 'jhums';

function detectTenant(): TenantId {
  if (typeof window === 'undefined') return 'flowertot';
  const fromQuery = new URLSearchParams(window.location.search).get('tenant');
  if (fromQuery === 'jhums' || fromQuery === 'flowertot') return fromQuery;
  if (window.location.hostname.includes('jhums')) return 'jhums';
  return 'flowertot';
}

export const TENANT: TenantId = detectTenant();

export const DEFAULT_CURRENCY = TENANT === 'jhums' ? '৳' : '£';

/** Every localStorage key is prefixed with this, so the two pilots' test
 *  data can never collide even if tested in the same browser. */
export const STORAGE_PREFIX = `stemsync-${TENANT}`;
