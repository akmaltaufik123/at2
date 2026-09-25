# custom_js execution — removed (residual risk note)

## Previous behaviour
`js/customize.js` executed `page.custom_js` from `site_pages` via `new Function(...)()` in every visitor's browser.

Risk: any writer of `site_pages.custom_js` (compromised admin, SQL injection, leaked service key) achieved stored XSS on all visitors. Anon SELECT on `site_pages` (by design for theming) made the *read* path public, so writer trust was the only control.

## Change
Execution removed. `custom_js` is now ignored with a console warning. `custom_css`/`layout_json` still render:
- `custom_css` via `textContent` into `<style>` (no script execution, but can deface; admin-write only via RLS).
- `layout_json` via `JSON.parse` + `textContent` assignments (no eval).

## Writer controls (defense in depth)
- RLS `site_pages_admin_all`: writes require `public.is_admin()`.
- No frontend writer for `site_pages`; manage via Supabase dashboard / service_role server-side only.
- Audit `site_pages` writes (Supabase logs) and review `custom_css` for exfiltration (`url()` to external hosts).

## Residual risk
- Malicious admin can still deface via `custom_css`/images. Accept: admin trust boundary. Mitigate with MFA, least admins, change review.
- If `custom_js` feature is ever reintroduced, require: signed content, CSP nonces/hashes, sandboxed iframe, and separate approval. Do not re-add `new Function`/`eval`.
