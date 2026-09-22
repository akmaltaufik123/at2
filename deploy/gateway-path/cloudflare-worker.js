// ATEGateway API reverse proxy for https://akmaltaufikenterprise.my/gateway*.
//
// Browser -> https://akmaltaufikenterprise.my/gateway... (URL stays as-is,
// never redirected to the Railway hostname)
//   -> Cloudflare Worker (this file, route: akmaltaufikenterprise.my/gateway*)
//   -> ATEGateway API origin on Railway (server-side fetch only)
//
// API-only: /gateway/v1/* and /gateway/healthz strip to /v1/* and /healthz.
// Dashboard UI (/gateway/app) and legacy /gateway/api/* are intentionally
// NOT served here.
//
// This Worker is a CLOSED proxy: the ONLY upstream it can ever contact is
// GATEWAY_ORIGIN (Worker variable, set at deploy time). There is no
// user-controlled target (?url=..., path-based host switching, etc.).
// A missing or non-http(s) origin fails closed with a generic 502.

const FETCH_TIMEOUT_MS = 25000;

// Hop-by-hop / framing headers must never be forwarded from the upstream.
const DROP_RESPONSE_HEADERS = [
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'set-cookie',
];

function upstreamBase(env) {
  const v = (env && env.GATEWAY_ORIGIN) || '';
  // Fail closed: empty/missing origin or a non-http(s) scheme is a
  // deployment error, never a client error. Production must use https.
  if (!v) throw new Error('bad origin');
  const u = new URL(v);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad origin');
  return u.origin;
}

function errorJson() {
  return Response.json(
    { error: { type: 'upstream_error', message: 'Gateway temporarily unavailable.' } },
    { status: 502 },
  );
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Everything outside /gateway belongs to GitHub Pages: pass through.
    if (url.pathname !== '/gateway' && !url.pathname.startsWith('/gateway/')) {
      return fetch(req);
    }

    // Normalize bare /gateway so relative resolution stays stable.
    if (url.pathname === '/gateway') {
      url.pathname = '/gateway/';
      return Response.redirect(url.toString(), 301);
    }

    let origin;
    try {
      origin = upstreamBase(env);
    } catch {
      return errorJson();
    }

    // Customer-site root and portal keep the prefix so the origin mount
    // serves them: stripping /gateway/ would hit origin / (API 404, which
    // redirects back — an infinite loop), and the portal lives under the
    // origin /gateway mount, not unprefixed. All other paths strip below.
    const preservePrefix = url.pathname === '/gateway/'
      || url.pathname === '/gateway/app'
      || url.pathname.startsWith('/gateway/app/');
    // Strip the public prefix; the remaining paths map 1:1 onto Railway
    // (/gateway/v1/* -> /v1/*, /gateway/healthz -> /healthz, ...).
    const upstream = new URL(origin);
    upstream.pathname = preservePrefix ? url.pathname : (url.pathname.slice('/gateway'.length) || '/');
    upstream.search = url.search;

    const headers = new Headers(req.headers);
    headers.delete('host'); // Workers sets Host from the upstream URL.
    headers.delete('cookie'); // Customer auth is header-based, not cookies.
    headers.set('X-Forwarded-Prefix', '/gateway');
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    const init = {
      method: req.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    };
    // duplex is required by Node/undici for stream bodies and ignored by the
    // Workers runtime; req.body streams the client bytes through untouched.
    if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = req.body; init.duplex = 'half'; }

    let res;
    try {
      res = await fetch(upstream.toString(), init);
    } catch {
      return errorJson();
    }

    const out = new Headers(res.headers);
    for (const h of DROP_RESPONSE_HEADERS) out.delete(h);
    // Preserve everything else byte-for-byte: content-type, x-robots-tag,
    // cache headers, request-id headers, and upstream error statuses/bodies.
    return new Response(res.body, { status: res.status, headers: out });
  },
};
