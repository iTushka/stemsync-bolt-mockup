export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // Flyern ska förbli helt öppen — den är till för att delas fritt via QR/WhatsApp
  if (url.pathname === '/flyer' || url.pathname.startsWith('/flyer.html') || url.pathname.startsWith('/flyer/')) {
    return next();
  }

  const expectedUser = env.APP_AUTH_USER;
  const expectedPass = env.APP_AUTH_PASS;

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
