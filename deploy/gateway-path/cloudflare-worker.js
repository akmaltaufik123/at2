// ATEGateway API reverse proxy for https://akmaltaufikenterprise.my/gateway*.
//
// Browser -> https://akmaltaufikenterprise.my/gateway... (URL stays as-is,
// never redirected to the Railway hostname)
//   -> Cloudflare Worker (this file, route: akmaltaufikenterprise.my/gateway*)
//   -> ATEGateway API origin on Railway (server-side fetch only)
//
// UI paths (/gateway/ and /gateway/app*) are HTML-transformed in-flight:
// white/black theme + enterprise logo + jQuery transitions for /gateway/,
// raining-binaries background + enterprise logo + transitions for /gateway/app.
// API/JSON/SSE/JS/CSS pass through byte-for-byte.
//
// This Worker is a CLOSED proxy: the ONLY upstream it can ever contact is
// GATEWAY_ORIGIN (Worker variable, set at deploy time). There is no
// user-controlled target (?url=..., path-based host switching, etc.).
// A missing or non-http(s) origin fails closed with a generic 502.

import {
  isUiHtmlPath,
  isRootPath,
  maybeInjectUi,
} from "./gateway-ui-overrides.js";

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

    // Customer-site root, portal, and backend API keep the prefix: the
    // origin serves them mounted under /gateway (stripping here would hit
    // origin /api/* which does not exist -> not_found, which the frontend
    // then rendered as "[object Object]"). Stripping /gateway/ would hit
    // origin / (API 404, which redirects back — an infinite loop), and the
    // portal lives under the origin /gateway mount, not unprefixed.
    // All other paths strip below.
    const preservePrefix = url.pathname === '/gateway/'
      || url.pathname === '/gateway/app'
      || url.pathname.startsWith('/gateway/app/')
      || url.pathname.startsWith('/gateway/api/');
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
    // UI HTML (GET /gateway/ and /gateway/app*) gets white/black + logo +
    // transition overrides. Everything else (API JSON, SSE, JS, CSS)
    // preserves byte-for-byte: content-type, x-robots-tag,
    // cache headers, request-id headers, and upstream error statuses/bodies.
    try {
      const ct = res.headers.get("content-type") || "";
      if (
        req.method === "GET" &&
        res.status >= 200 &&
        res.status < 300 &&
        ct.toLowerCase().includes("text/html") &&
        isUiHtmlPath(url.pathname)
      ) {
        const html = await res.text();
        const injected = maybeInjectUi(url.pathname, html);
        out.delete("content-length");
        // Injected HTML when markers match; otherwise return the same HTML
        // text (res.body is already consumed by res.text() above).
        return new Response(injected !== null ? injected : html, {
          status: res.status,
          headers: out,
        });
      }
    } catch {
      // If HTML parsing/injection fails, fall through to passthrough below.
      // Note: res.body may already be disturbed here; callers only hit this
      // for UI HTML paths, and upstream errors still fail closed via catch.
      try {
        return new Response(await res.text(), { status: res.status, headers: out });
      } catch {
        // last resort passthrough
      }
    }
    return new Response(res.body, { status: res.status, headers: out });
  },
};
