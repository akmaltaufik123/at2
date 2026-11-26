# ATEBooster: Multi-supplier SMM API

ATEBooster provides one customer-facing brand and catalog, powered by a Cloudflare Worker. It supports the existing supplier and an optional Ezkify integration using the supplied Ezkify SMM Panel API contract.

## Architecture

- Static storefront: `/booster/index.html` in this repository
- Private API proxy: `deploy/booster-path/cloudflare-worker.js`
- Public catalog: `GET /booster/api/services` merges healthy, configured suppliers
- Each supplier can have the same numerical service ID. Ezkify services use `ATE-B2-<ID>` inside the ATEBooster interface and orders; existing supplier IDs remain unchanged.
- The customer orders **via WhatsApp** for manual confirmation and payment; the browser does not automatically debit upstream credits.
- Order submission, refill, cancel and supplier balance are **admin-authorized**. These actions can spend funds and must not be used from publicly served JavaScript.
- Tracking with numeric ID continues using the existing supplier. ATE-B2-prefixed order references are tracked through Ezkify.

## Configuration

Only Cloudflare secrets hold supplier credentials. **Never paste an API key into GitHub, frontend JavaScript, or a public chat.**

```bash
cd deploy/booster-path
wrangler login
wrangler secret put PADOONSTA_API_KEY
wrangler secret put EZKIFY_API_KEY
wrangler secret put ATEBOOSTER_ADMIN_TOKEN
wrangler deploy
```

`PADOONSTA_API_KEY` is the existing worker secret; set it if not already configured.
`EZKIFY_API_KEY` is the key obtained privately from https://ezkify.com/account.
`ATEBOOSTER_ADMIN_TOKEN` must be a long, unique, randomly generated secret distinct from the supplier API keys. Store it in a secure password manager. Do not set it in browser code.

Ezkify is optional: while its key is absent, the original supplier catalog continues working. The Ezkify API endpoint is `https://ezkify.com/api/v2`; its official POST form fields include `key` and `action`.

## Verification

```bash
curl -sS https://akmaltaufikenterprise.my/booster/api/services
```

After configuring Ezkify, the result should contain additional services with references beginning `ATE-B2-`. Confirm rates, currency, service min/max, platform grouping and markup against your real Ezkify dashboard before selling packages.

Verify that a public order request is denied:

```bash
curl -i -X POST 'https://akmaltaufikenterprise.my/booster/api/order' \
 -H 'Content-Type: application/json' \
 --data '{"service":"ATE-B2-1","link":"https://example.com","quantity":100}'
```

Expected: HTTP 403. To submit a real approved order, an administrator must use `Authorization: Bearer <ATEBOOSTER_ADMIN_TOKEN>` **server-side** after verifying payment and the selected service. Never expose that bearer value to customers.

To track an Ezkify order through the public portal, enter the returned ATE reference, such as `ATE-B2-23501`. Old numeric references still target the existing supplier.

## Supported API routes

| Route | Method | Permission |
|---|---|---|
| `/booster/api/services` | GET | Public catalog |
| `/booster/api/status` | POST | Public order tracking |
| `/booster/api/refill-status` | POST | Public refill tracking |
| `/booster/api/balance?source=B1` or `B2` | GET | Admin token |
| `/booster/api/order` | POST | Admin token |
| `/booster/api/refill` | POST | Admin token |
| `/booster/api/cancel` | POST | Admin token |

Batch requests support up to 100 IDs, all from the same supplier. The API uses Ezkify actions: `services`, `add`, `status`, `refill`, `refill_status`, `cancel`, and `balance`.

## Production considerations

- The storefront currently uses a fixed USD to MYR factor of **4.47** and a browser-local default markup of **30%**. Those are commercial assumptions, not verified live FX or an authoritative central pricing source.
- There is no server-side payment capture or paid-order fulfillment automation. After customer payment verification, an administrator must submit the actual upstream order.
- Existing status responses provide the supplier's reported charge and currency; never treat a public price or an estimated profit as a verified settlement.
- The Worker code is stored in a public GitHub repository. The upstream API keys are private Cloudflare secrets, but supplier implementation details in the public repository are not confidential. White-label branding does not mean cryptographic supplier anonymity.
- To avoid abuse, the public storefront must never get access to `ATEBOOSTER_ADMIN_TOKEN`.
- Do not follow supplier PHP examples that disable TLS certificate verification. Cloudflare Worker fetch verifies TLS normally.
- GitHub commits do not automatically deploy this Worker unless a Cloudflare build/deploy pipeline is configured. Use `wrangler deploy` for this worker and verify the route.
