export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Flyern ska förbli helt öppen — den är till för att delas fritt via QR/WhatsApp
  if (url.pathname === '/flyer' || url.pathname.startsWith('/flyer.html') || url.pathname.startsWith('/flyer/')) {
    return next();
  }

  // The three sales-demo pilots (/demo-fashion, /demo-craft, /demo-food —
  // see src/config.ts DEMO_PILOT_SLUGS) get their own, separately shareable
  // password instead of the real pilot password. They're shown to new,
  // unknown prospects in a sales call and hold no real pilot data, so they
  // don't need the same sensitivity as the rest of the app.
  const isDemoPath = /^\/demo-(fashion|craft|food)(\/|$)/.test(url.pathname);
  const expectedUser = isDemoPath ? env.DEMO_AUTH_USER : env.APP_AUTH_USER;
  const expectedPass = isDemoPath ? env.DEMO_AUTH_PASS : env.APP_AUTH_PASS;
  // Browsers cache Basic Auth credentials per (origin, realm) for the
  // session. A distinct realm for the demo paths stops the browser from
  // silently replaying the real pilot credentials there — without this,
  // once someone had authenticated on a real pilot path in the same
  // session, visiting a /demo-* path would auto-resend those (wrong)
  // credentials instead of prompting fresh, and reject with 401 no matter
  // what the person typed in.
  const realm = isDemoPath ? 'Tuvara Demo' : 'Tuvara';

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
