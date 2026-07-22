/**
 * Two separate concepts, deliberately kept apart:
 *
 * - TENANT ("category configuration"): which category list/keywords/field
 *   labels this business sees — see categoryFieldMap.ts. A small, closed
 *   set, because a whole new tenant means writing a new category list.
 * - PILOT_SLUG ("URL path + storage namespace"): which specific pilot is
 *   running. Several pilots can share the same tenant (e.g. Moja Berlin and
 *   Shoilee Dhaka both use the broad 'general' tenant) without their test
 *   data colliding, because storage is namespaced by slug, not by tenant.
 *
 * Detection priority (same for both, resolved together via the slug):
 * a ?tenant= query param, then the first URL path segment
 * (tuvara.glocalunit.com/flowertot), then a hostname substring match,
 * falling back to 'flowertot'. Path-based routing needs a catch-all
 * rewrite on the hosting side so a direct visit/refresh at e.g. /moja
 * still serves index.html instead of 404ing — see public/_redirects.
 */
export type TenantId = 'flowertot' | 'jhums' | 'general';

export type PilotSlug =
  | 'flowertot'
  | 'jhums'
  | 'moja'
  | 'shoilee'
  | 'demo-fashion'
  | 'demo-craft'
  | 'demo-food';

/**
 * The three sales-demo slugs (see demoSeeds.ts) — fictional, pre-seeded
 * instances shown manually to new prospects during a sales call, one per
 * industry profile: demo-fashion mirrors Jhum Fashion (clothing, batch
 * variation), demo-craft mirrors Tahmina/Shoilee (jewellery, multi-part
 * material cost), demo-food mirrors Maliha/Moja (food, small batches).
 * Never linked to real pilot data — separate storage namespace like any
 * other PILOT_SLUG.
 */
export const DEMO_PILOT_SLUGS: PilotSlug[] = ['demo-fashion', 'demo-craft', 'demo-food'];

export function isDemoPilot(slug: PilotSlug): boolean {
  return (DEMO_PILOT_SLUGS as string[]).includes(slug);
}

const TENANT_BY_PILOT_SLUG: Record<PilotSlug, TenantId> = {
  flowertot: 'flowertot',
  jhums: 'jhums',
  moja: 'general',
  shoilee: 'general',
  // demo-fashion mirrors Jhum Fashion's category set (Three-piece/Saree/
  // Kurti/...); demo-craft and demo-food both mirror the 'general' tenant
  // used by Shoilee (jewellery) and Moja (food) respectively.
  'demo-fashion': 'jhums',
  'demo-craft': 'general',
  'demo-food': 'general',
};

/** Each pilot's own market currency — kept separate from TENANT because two
 *  pilots can share a tenant's category config while trading in different
 *  currencies (Moja/Berlin in €, Shoilee/Dhaka in ৳). */
const CURRENCY_BY_PILOT_SLUG: Record<PilotSlug, string> = {
  flowertot: '£',
  jhums: '৳',
  moja: '€',
  shoilee: '৳',
  'demo-fashion': '৳',
  'demo-craft': '৳',
  'demo-food': '€',
};

const DEFAULT_PILOT_SLUG: PilotSlug = 'flowertot';

function isPilotSlug(value: string | undefined): value is PilotSlug {
  return !!value && value in TENANT_BY_PILOT_SLUG;
}

function detectPilotSlug(): PilotSlug {
  if (typeof window === 'undefined') return DEFAULT_PILOT_SLUG;

  const fromQuery = new URLSearchParams(window.location.search).get('tenant') ?? undefined;
  if (isPilotSlug(fromQuery)) return fromQuery;

  const firstPathSegment = window.location.pathname.split('/')[1]?.toLowerCase();
  if (isPilotSlug(firstPathSegment)) return firstPathSegment;

  const hostname = window.location.hostname.toLowerCase();
  const hostnameMatch = (Object.keys(TENANT_BY_PILOT_SLUG) as PilotSlug[]).find((slug) =>
    hostname.includes(slug)
  );
  if (hostnameMatch) return hostnameMatch;

  return DEFAULT_PILOT_SLUG;
}

export const PILOT_SLUG: PilotSlug = detectPilotSlug();
export const TENANT: TenantId = TENANT_BY_PILOT_SLUG[PILOT_SLUG];

export const DEFAULT_CURRENCY = CURRENCY_BY_PILOT_SLUG[PILOT_SLUG];

/** Every localStorage key is prefixed with this, namespaced per PILOT
 *  (not per tenant) — so two pilots sharing the same tenant (e.g. Moja and
 *  Shoilee both on 'general') never collide even if tested in the same
 *  browser. */
export const STORAGE_PREFIX = `stemsync-${PILOT_SLUG}`;
