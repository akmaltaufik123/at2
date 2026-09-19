// ATEGateway path proxy for https://akmaltaufikenterprise.my/gateway*
//
// Browser -> https://akmaltaufikenterprise.my/gateway... (URL stays as-is,
// never redirected to the Railway hostname)
//   -> Cloudflare Worker (this file, route: akmaltaufikenterprise.my/gateway*)
//   -> ATEGateway dashboard origin on Railway (server-side fetch only)
//
// The dashboard serves its root (/) and already supports being mounted at
// /gateway via X-Forwarded-Prefix + <meta name="gw-base"> (all /api/* calls
// are prefixed client-side). The dashboard uses token-in-Authorization-header
// auth (localStorage), NOT cookies, so no cookie rewriting is performed;
// Set-Cookie is stripped defensively and nothing auth-related is logged.
//
// This Worker is a CLOSED proxy: the ONLY upstream it can ever contact is
// GATEWAY_ORIGIN (Worker variable) or DEFAULT_ORIGIN below. There is no
// user-controlled target (?url=..., path-based host switching, etc.).

const DEFAULT_ORIGIN = 'https://ate-gateway-production.up.railway.app';
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
  const v = (env && env.GATEWAY_ORIGIN) || DEFAULT_ORIGIN;
  // Fail closed: only https origins are ever allowed.
  const u = new URL(v);
  if (u.protocol !== 'https:') throw new Error('bad origin');
  return u.origin;
}

function errorJson(status, code) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Everything outside /gateway belongs to GitHub Pages: pass through.
    if (!(url.pathname === '/gateway' || url.pathname.startsWith('/gateway/'))) {
      return fetch(req);
    }

    // Normalize bare /gateway so relative resolution inside the app is stable.
    if (url.pathname === '/gateway') {
      url.pathname = '/gateway/';
      return Response.redirect(url.toString(), 301);
    }

    let origin;
    try {
      origin = upstreamBase(env);
    } catch {
      return errorJson(502, 'gateway_unavailable');
    }

    // Strip the public prefix; the dashboard serves from its own root.
    const upstream = new URL(origin);
    upstream.pathname = url.pathname.slice('/gateway'.length) || '/';
    upstream.search = url.search;

    const headers = new Headers(req.headers);
    headers.delete('host'); // Workers sets Host from the upstream URL.
    headers.delete('cookie'); // Dashboard auth is header-based, not cookies.
    headers.set('X-Forwarded-Prefix', '/gateway');
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    const init = {
      method: req.method,
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') init.body = req.body;

    let res;
    try {
      res = await fetch(upstream.toString(), init);
    } catch {
      return errorJson(502, 'gateway_unavailable');
    }

    const out = new Headers(res.headers);
    for (const h of DROP_RESPONSE_HEADERS) out.delete(h);
    // Preserve everything else byte-for-byte: content-type, x-robots-tag
    // (dashboard sends noindex), cache headers, request-id headers.
    return new Response(res.body, { status: res.status, headers: out });
  },
};
