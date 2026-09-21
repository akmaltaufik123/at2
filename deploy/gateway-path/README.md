# ATEGateway `/gateway` — Cloudflare Worker preparation

> **NO production deployment was performed by this task.** This directory only
> prepares the Worker source + config for later manual review and deployment.

## 1. Architecture

```
Browser
  https://akmaltaufikenterprise.my/gateway...   (URL never changes)
    -> Cloudflare route akmaltaufikenterprise.my/gateway* -> this Worker
    -> https://ate-gateway-production.up.railway.app/... (server-side fetch)
```

GitHub Pages keeps serving `/` and everything outside `/gateway*` unchanged.
No DNS change, no subdomain, no new domain.

## 2. Worker purpose

`cloudflare-worker.js` is a closed reverse proxy: strip the public `/gateway`
prefix, forward method/query/headers/body to the fixed Railway API origin, and
stream the upstream status/headers/body back. Non-gateway traffic is passed
through untouched (`return fetch(req)`).

## 3. Origin configuration

- `GATEWAY_ORIGIN` Worker variable, set at deploy time (see `wrangler.toml`;
  production value is the Railway gateway base URL). Hostname is operational
  config, not a credential, and it never appears in frontend JavaScript.
  An empty value fails closed with a generic 502.
- Only `http:`/`https:` origins are accepted; anything else fails closed.
  Production must use `https:`.
- The ATEGateway app already supports the `/gateway` mount via
  `X-Forwarded-Prefix: /gateway`, so no application change is needed for
  the API paths below. Dashboard UI (`/gateway/app`) and legacy
  `/gateway/api/*` are intentionally NOT served through this Worker.

## 4. Required Cloudflare route

`akmaltaufikenterprise.my/gateway*` → worker `ate-gateway-path`
(prepared in `wrangler.toml`; not attached yet).

## 5. Environment/binding configuration

Only `GATEWAY_ORIGIN` (plain variable). No secrets, no bindings, no KV.
If the origin ever moves, change the variable in the Cloudflare dashboard —
no code change needed.

## 6. How /gateway is handled

- `GET /gateway` → `301` to `/gateway/`.
- `/gateway/` → origin `/`. The public base is API-only: use
  `/gateway/v1/*` or `/gateway/healthz` below.
- `/gateway/v1/models` → origin `/v1/models`, etc. (prefix stripped,
  query string preserved, all HTTP methods and bodies preserved).
- `/gateway/v1/chat/completions` → origin `/v1/chat/completions`
  (request body byte-identical, `Authorization` forwarded untouched).
- `/gateway/healthz` → origin `/healthz`.

## 7. How non-/gateway traffic is handled

Passed straight through to GitHub Pages (`/`, `/about`, `/assets/...`).
The Worker never sees or alters it beyond Cloudflare's normal handling.

## 8. Security considerations

- Closed proxy: fixed origin only; no `?url=`-style user-controlled target
  (no SSRF/open-proxy surface).
- No credentials anywhere: no `ATE_ADMIN_TOKEN`, no provider keys, no
  customer keys, no auto-login, no auth bypass. Customer API auth works
  end-to-end through the proxy (key stays in the `Authorization` header).
- Dashboard auth is header-based (localStorage token), not cookies: the
  Worker forwards `Authorization`, strips browser `cookie` headers upstream
  and `set-cookie` downstream, and never logs auth material.
- No wildcard CORS added; the API operates same-origin under `/gateway`.
- Main-site CSP untouched (no new scripts/styles in this repo change).
- Upstream failures → generic `{"error":{"type":"upstream_error",...}}`
  (502), 25s timeout, no retries, no stack traces, no secret leakage.
- Indexing: dashboard sends `X-Robots-Tag: noindex, nofollow` (preserved
  through the proxy); site `robots.txt` has `Disallow: /gateway/`.

## 9. How to deploy manually later

1. `cd deploy/gateway-path && wrangler login`
2. Review `wrangler.toml` (route + `GATEWAY_ORIGIN`, still a placeholder here).
3. `wrangler deploy --var GATEWAY_ORIGIN=https://ate-gateway-production.up.railway.app`
   (attaches the `/gateway*` route; Pages untouched).
4. Verify per section 11. Keep this staging-like until checks pass.

## 10. How to roll back

Remove the `akmaltaufikenterprise.my/gateway*` route (or disable/delete the
Worker) in the Cloudflare dashboard. `/gateway` then falls back to Pages
behavior; the rest of the site is unaffected. No code revert needed
(nav link + robots entries are harmless without the Worker).

## 11. How to verify /gateway after deployment

- `/` → 200 main site, unchanged.
- `/gateway` → 301 → `/gateway/`.
- `/gateway/healthz` → 200 gateway health JSON.
- `/gateway/v1/models` without key → 401 `authentication_error` (auth intact,
  no Railway hostname or secret in the response).
- With a customer key: `/gateway/v1/models` lists `gpt-6-astra`;
  `/gateway/v1/chat/completions` (`gpt-6-astra`) → 200 with usage object.
- Page source / responses contain no tokens/keys and no Railway internals.
