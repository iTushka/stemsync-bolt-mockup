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

  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = atob(encoded).split(':');
      if (user === expectedUser && pass === expectedPass) {
        return next();
      }
    }
  }

  return new Response('Autentisering krävs', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Tuvara"' },
  });
}
