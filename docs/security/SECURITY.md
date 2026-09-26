# Security — ATE Website (OWASP ASVS 5.0 / ISO 27001:2022 aligned)

Status: **improvement programme, not certification**. No conformity claimed.

## Scope
Static frontend in this repo + Supabase project `lmvg***` (URL masked). Gateway credentials are out of scope here and must stay separate (see gateway repo).

## What changed (2026-09 hardening)
- `supabase/migrations/001-003`: versioned RLS baseline, availability RPC/view, ownership/status triggers, storage policies. **Review-only; not applied to prod.**
- `js/customize.js`: removed `new Function(page.custom_js)()` execution (stored-XSS sink). See `CUSTOM_JS_RISK.md`.
- `js/booking-form.js`: availability prefers `booking_times_for_date` RPC (least data), fallback to direct SELECT until 002 deployed.
- `tests/`: static contracts (`node --test tests/`). Live matrix scaffolding requires TEST project env, never prod.

## Deployed state
- Before: **UNVERIFIED** (no repo migrations; anon `200 []` is not proof of correct RLS).
- After this change: still **UNVERIFIED in prod** until migrations are tested on staging and applied via `supabase/README.md` runbook with backup + verification.

## Credentials
- Frontend holds only `SUPABASE_URL` + `sb_publishable_*` (public client config). No `service_role` in repo (enforced by test).
- Never commit `.env`, keys, or customer data. Rotate via Supabase dashboard only with a tested plan.

## Admin authorization
- UI `is_admin` check is **not authorization**. Enforcement is `public.is_admin()` (app_metadata) in RLS + triggers.
- Protect role assignment: `app_metadata.is_admin` set via Supabase Auth admin API / dashboard only, never from client. Require MFA for admins (see `MFA.md`).

## Storage
- `booking-files`: private. Owner-folder convention `<uid>/...` enforced in 002; legacy flat names are admin-only until migrated. Signed URLs: keep TTL ≤ 3600s (current `createSignedUrl(path,3600)`), never public URLs.
- `course-images`: public read only; admin write only.

## Input validation / headers / deps
- Client validation (honeypot, throttling, regex) is UX only; RLS/triggers are the boundary.
- CSP currently uses `unsafe-inline` (required by inline scripts). Do not add new inline handlers; long-term move to nonces/hashes. `connect-src` pinned to Supabase URL; `object-src none`; `frame-ancestors self`.
- Dependencies: only `supabase-js` via CDN. Pin version, verify SRI when possible; monitor advisories.
- Logging: never log PII, keys, or file contents. Reports export only admin-requested ranges.

## Backup / restore
See `supabase/README.md` + `BACKUP_RESTORE.md`. Pre-deployment DB dump + storage snapshot required; restore tested on staging.

## Remaining risks / decisions needed
1. Approve staging test plan + maintenance window (`TEST_PLAN.md`).
2. Confirm `courses` stays login-gated (current) vs public catalog (would need narrow anon `active=true` policy).
3. Migrate `booking-files` objects to `<uid>/` prefix (or accept admin-only legacy reads).
4. Enable Supabase Auth MFA + review password policy / rate limits in dashboard.
