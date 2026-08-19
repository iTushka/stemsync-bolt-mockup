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
 * Single source of truth for everything that varies per pilot instance.
 * Replaces what used to be three separate mappings (TENANT_BY_PILOT_SLUG,
 * CURRENCY_BY_PILOT_SLUG, DEMO_PILOT_SLUGS) — adding a pilot means adding
 * one entry here instead of touching several.
 *
 * Note `tenant` and `slug` are deliberately different axes (see comment at
 * top of file): several slugs can share one `tenant`'s category config.
 *
 * `isDemo` intentionally does NOT mean "password-protected" — real access
 * control lives entirely in `_middleware.js` (Cloudflare Basic Auth env
 * vars, its own isDemoPath check), decoupled from this file. Here it only
 * decides the demo-data banner, the "reset to demo data" button wording,
 * and whether the demo currency switcher shows.
 */
export interface TenantConfig {
  slug: PilotSlug;
  /** Internal reference only — never shown in the app UI. */
  displayName: string;
  /** Which shared category-tenant this slug's UI/keywords/copy uses. */
  tenant: TenantId;
  currency: string;
  isDemo: boolean;
  hasSeedData: boolean;
}

export const TENANT_CONFIGS: Record<PilotSlug, TenantConfig> = {
  flowertot: {
    slug: 'flowertot',
    displayName: 'Flowertot Botanicals (UK)',
    tenant: 'flowertot',
    currency: '£',
    isDemo: false,
    hasSeedData: false,
  },
  jhums: {
    slug: 'jhums',
    displayName: 'Jhum Fashion (Bangladesh)',
    tenant: 'jhums',
    currency: '৳',
    isDemo: false,
    hasSeedData: false,
  },
  moja: {
    slug: 'moja',
    displayName: 'Moja (Berlin)',
    tenant: 'general',
    currency: '€',
    isDemo: false,
    hasSeedData: false,
  },
  shoilee: {
    slug: 'shoilee',
    displayName: 'Shoilee (Dhaka)',
    tenant: 'general',
    currency: '৳',
    isDemo: false,
    hasSeedData: false,
  },
  // demo-fashion mirrors Jhum Fashion's category set (Three-piece/Saree/
  // Kurti/...); demo-craft and demo-food both mirror the 'general' tenant
  // used by Shoilee (jewellery) and Moja (food) respectively.
  'demo-fashion': {
    slug: 'demo-fashion',
    displayName: 'Demo — Fashion (mirrors Jhum Fashion)',
    tenant: 'jhums',
    currency: '৳',
    isDemo: true,
    hasSeedData: true,
  },
  'demo-craft': {
    slug: 'demo-craft',
    displayName: 'Demo — Craft (mirrors Shoilee)',
    tenant: 'general',
    currency: '৳',
    isDemo: true,
    hasSeedData: true,
  },
  'demo-food': {
    slug: 'demo-food',
    displayName: 'Demo — Food (mirrors Moja)',
    tenant: 'general',
    currency: '€',
    isDemo: true,
    hasSeedData: true,
  },
};

/** The three sales-demo slugs (see demoSeeds.ts) — fictional, pre-seeded
 *  instances shown manually to new prospects during a sales call. Never
 *  linked to real pilot data — separate storage namespace like any other
 *  PILOT_SLUG. Derived from TENANT_CONFIGS so it can't drift out of sync. */
export const DEMO_PILOT_SLUGS: PilotSlug[] = (Object.values(TENANT_CONFIGS) as TenantConfig[])
  .filter((c) => c.isDemo)
  .map((c) => c.slug);

export function isDemoPilot(slug: PilotSlug): boolean {
  return TENANT_CONFIGS[slug].isDemo;
}

const DEFAULT_PILOT_SLUG: PilotSlug = 'flowertot';

function isPilotSlug(value: string | undefined): value is PilotSlug {
  return !!value && value in TENANT_CONFIGS;
}

function detectPilotSlug(): PilotSlug {
  if (typeof window === 'undefined') return DEFAULT_PILOT_SLUG;

  const fromQuery = new URLSearchParams(window.location.search).get('tenant') ?? undefined;
  if (isPilotSlug(fromQuery)) return fromQuery;

  const firstPathSegment = window.location.pathname.split('/')[1]?.toLowerCase();
  if (isPilotSlug(firstPathSegment)) return firstPathSegment;

  const hostname = window.location.hostname.toLowerCase();
  const hostnameMatch = (Object.keys(TENANT_CONFIGS) as PilotSlug[]).find((slug) =>
    hostname.includes(slug)
  );
  if (hostnameMatch) return hostnameMatch;

  return DEFAULT_PILOT_SLUG;
}

export const PILOT_SLUG: PilotSlug = detectPilotSlug();
export const TENANT: TenantId = TENANT_CONFIGS[PILOT_SLUG].tenant;

export const DEFAULT_CURRENCY = TENANT_CONFIGS[PILOT_SLUG].currency;

/** Every localStorage key is prefixed with this, namespaced per PILOT
 *  (not per tenant) — so two pilots sharing the same tenant (e.g. Moja and
 *  Shoilee both on 'general') never collide even if tested in the same
 *  browser. */
export const STORAGE_PREFIX = `stemsync-${PILOT_SLUG}`;

/** Pilot-phase UX caps —
 *  tuvara-app-personal-moms-butiker-kostnader-insights-analys.md fråga 4:
 *  handling multiple shops and multiple staff logins is planned to become
 *  a paid tier later, but during the pilot everyone gets these fixed
 *  limits regardless of plan. Named constants (not inlined numbers) so
 *  swapping this for a real per-tenant plan limit later is a one-line
 *  change here, not a hunt through the codebase — same reasoning as
 *  `simulateFreePlan` already hinting a plan model is coming. */
export const MAX_SHOPS = 3;
export const MAX_STAFF = 5;
