// Server-side check for a valid ?share=<token> link (see
// docs/demo-share-links.md) — calls the tuvara-demo project's REST/RPC
// endpoint directly (this runs in the Cloudflare Pages Functions runtime,
// never the client bundle, so it uses its own DEMO_SUPABASE_URL/
// DEMO_SUPABASE_ANON_KEY env vars, not the VITE_-prefixed ones). Fails
// closed on anything but an explicit `true`: missing env vars, a network
// error, a timeout, or a non-2xx response all return false, so the caller
// falls through to the normal Basic Auth check below rather than ever
// granting access on an inconclusive result.
async function isValidShareToken(env, token, tenantSlug) {
  if (!env.DEMO_SUPABASE_URL || !env.DEMO_SUPABASE_ANON_KEY || !token || !tenantSlug) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${env.DEMO_SUPABASE_URL}/rest/v1/rpc/validate_demo_share_link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.DEMO_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.DEMO_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_token: token, p_tenant_slug: tenantSlug }),
      signal: controller.signal,
    });
    if (!res.ok) return false;
    return (await res.json()) === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Bug found in live testing: the query-param check above only ever runs on
// the top-level document request (/demo-fashion?share=...) — the browser
// does NOT propagate that query string to subresource requests
// (/assets/index-*.js, /assets/index-*.css, /favicon.svg), so those still
// hit the plain Basic Auth check below and get blocked, which means the JS
// bundle (and with it, DemoAgentGate's own client-side share check) never
// loads at all. Fix: once a query-param token validates on the document
// request, hand the browser a cookie carrying it, and also accept that
// cookie — re-validated against Postgres every time, never just trusted —
// on the asset paths that lack any query string of their own.
const SHARE_COOKIE_NAME = 'demo_share';
// Upper bound only, not the token's exact remaining validity —
// validate_demo_share_link doesn't return expires_at, and this fix
// deliberately makes no RPC/schema changes, so there's no way to read the
// exact remaining time here. 45 days matches demo_share_links' own
// creation-time default, so the cookie can never outlive the longest any
// token could ever be valid for. A cookie outliving its token's actual
// expiry is harmless: every request re-validates the token against
// Postgres regardless of the cookie's own age (see isValidShareToken), so
// an expired/revoked token is still rejected server-side either way.
const SHARE_COOKIE_MAX_AGE_SECONDS = 45 * 24 * 60 * 60;

// Cookie value is "<tenantSlug>:<token>", not just the bare token — a
// shared-asset request (/assets/*.js etc.) has no tenant of its own in its
// URL to check against, so the tenant has to come from somewhere. Embedding
// it in the cookie at the point it's set (always the real tenant the token
// was just proven valid for, on the document request) means the asset-path
// check below still calls the exact same RPC with a real tenant_slug
// argument — it's re-verified against Postgres just like everything else,
// not a client-asserted claim taken on trust: a forged cookie claiming the
// wrong tenant for a given token simply fails validation, since the RPC
// checks token+tenant_slug together against the actual row.
function readShareCookie(request) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SHARE_COOKIE_NAME}=`));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice(SHARE_COOKIE_NAME.length + 1));
  const sep = raw.indexOf(':');
  if (sep === -1) return null;
  return { tenantSlug: raw.slice(0, sep), token: raw.slice(sep + 1) };
}

function shareCookieHeader(tenantSlug, token, isHttps) {
  const parts = [
    `${SHARE_COOKIE_NAME}=${encodeURIComponent(`${tenantSlug}:${token}`)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SHARE_COOKIE_MAX_AGE_SECONDS}`,
  ];
  // Omitted for plain-http local dev (wrangler pages dev) — a Secure
  // cookie is silently refused by the browser over http, which would
  // break local testing of this exact flow. Cloudflare Pages always
  // terminates real traffic over https, so production is unaffected.
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

function withShareCookie(response, tenantSlug, token, isHttps) {
  const withCookie = new Response(response.body, response);
  withCookie.headers.append('Set-Cookie', shareCookieHeader(tenantSlug, token, isHttps));
  return withCookie;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Flyern ska förbli helt öppen — den är till för att delas fritt via QR/WhatsApp
  if (url.pathname === '/flyer' || url.pathname.startsWith('/flyer.html') || url.pathname.startsWith('/flyer/')) {
    return next();
  }

  // /demo-admin (Tushar's own tool for editing what the three sales-demo
  // pilots show, see src/DemoAdmin/) gets its own, separate credential
  // pair — never the freely-shared demo password, never the real pilot
  // password. This is only the first of two gates: every actual write
  // additionally requires a real Supabase Auth session, checked by RLS in
  // the tuvara-demo project — see DemoAdminLogin.tsx for why a page-load
  // gate alone isn't enough once the anon key is in the client bundle.
  const isDemoAdminPath = /^\/demo-admin(\/|$)/.test(url.pathname);

  // The three sales-demo pilots (/demo-fashion, /demo-craft, /demo-food —
  // see src/config.ts DEMO_PILOT_SLUGS) get their own, separately shareable
  // password instead of the real pilot password. They're shown to new,
  // unknown prospects in a sales call and hold no real pilot data, so they
  // don't need the same sensitivity as the rest of the app.
  const isDemoPath = /^\/demo-(fashion|craft|food)(\/|$)/.test(url.pathname);

  // The SPA is one shared JS/CSS bundle + favicon for every tenant (see
  // dist/index.html — there's no per-tenant code splitting), so a
  // share-link visitor needs these to load too, whichever of the three
  // demo paths they originally opened. This never widens access anywhere
  // else: /demo-admin and real-pilot paths still only ever go through the
  // Basic Auth check below, untouched.
  const isSharedAssetPath = /^\/assets\//.test(url.pathname) || url.pathname === '/favicon.svg';

  // Point exception for a valid temporary share link (see
  // docs/demo-share-links.md): a prospect opening a link with ?share=<token>
  // bypasses Basic Auth for that request, IF the token validates against
  // the matching tenant — and every subsequent request for this same
  // /demo-* path or its shared assets, via the demo_share cookie set below.
  // Every other case — no token/cookie, an invalid/expired/revoked one, or
  // a validation failure of any kind — falls straight through to the Basic
  // Auth check, unchanged. Nothing here is cached: Pages Functions run
  // fresh per request, and the token is re-checked against Supabase on
  // every single one (query-param path or cookie path alike), so there's
  // no risk of a later visitor riding a cached "authorized" response
  // without their own valid token.
  if (isDemoPath) {
    const tenantSlug = url.pathname.match(/^\/(demo-(?:fashion|craft|food))(\/|$)/)?.[1];
    const queryToken = url.searchParams.get('share');

    if (tenantSlug && queryToken && (await isValidShareToken(env, queryToken, tenantSlug))) {
      // First hit on a fresh link. Set the cookie here — this is the only
      // place a visitor's share token is proven valid against a real URL
      // tenant, so it's the only place trustworthy enough to hand out a
      // cookie for it.
      const response = await next();
      return withShareCookie(response, tenantSlug, queryToken, url.protocol === 'https:');
    }

    const cookie = readShareCookie(request);
    if (cookie && (await isValidShareToken(env, cookie.token, tenantSlug))) {
      // Reload of the same demo path without ?share= in the URL (e.g. a
      // bookmarked bare /demo-fashion) — still re-validated live, not
      // trusted just because the cookie is present. Uses the URL's own
      // tenantSlug here (not the cookie's), so a cookie set for a
      // different tenant correctly fails this check on a mismatched path.
      return next();
    }
  } else if (isSharedAssetPath) {
    const cookie = readShareCookie(request);
    if (cookie && (await isValidShareToken(env, cookie.token, cookie.tenantSlug))) {
      // No tenant of its own to check an asset URL against — the tenant
      // embedded in the cookie when it was set is what gets re-verified
      // here. Still a live, per-request Postgres check of that exact
      // token+tenant pair, not "any cookie present, no questions asked".
      return next();
    }
  }

  const expectedUser = isDemoAdminPath
    ? env.DEMO_ADMIN_USER
    : isDemoPath
      ? env.DEMO_AUTH_USER
      : env.APP_AUTH_USER;
  const expectedPass = isDemoAdminPath
    ? env.DEMO_ADMIN_PASS
    : isDemoPath
      ? env.DEMO_AUTH_PASS
      : env.APP_AUTH_PASS;
  // Browsers cache Basic Auth credentials per (origin, realm) for the
  // session. A distinct realm per credential pair stops the browser from
  // silently replaying the wrong stored credentials on another path —
  // without this, once someone had authenticated on one path in the same
  // session, visiting another would auto-resend those (wrong) credentials
  // instead of prompting fresh, and reject with 401 no matter what the
  // person typed in.
  const realm = isDemoAdminPath ? 'Tuvara Demo Admin' : isDemoPath ? 'Tuvara Demo' : 'Tuvara';

  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = atob(encoded).split(':');
      // Cloudflare Pages' env var UI doesn't show leading/trailing
      // whitespace if it sneaks into a pasted value — trim both sides of
      // the comparison so a stray space in the dashboard can't cause a
      // silent, invisible-in-the-UI auth mismatch.
      if (user === expectedUser?.trim() && pass === expectedPass?.trim()) {
        return next();
      }
    }
  }

  return new Response('Autentisering krävs', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${realm}"` },
  });
}
