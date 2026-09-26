# OWASP ASVS 5.0 checklist — website (evidence / gaps)

> Evidence = repo file or test. Gaps marked clearly. No conformity claimed.

## V1 Architecture
- 1.1 Secure design (least privilege RLS 001-003, anon deny) — EVIDENCE: `supabase/migrations/*`, `tests/rls_contract.test.js`. GAP: deployed prod policies unverified.
- 1.2 Auth enforcement at boundary (RLS `is_admin`, triggers) — EVIDENCE: migrations. GAP: live admin/authenticated matrix blocked (no TEST env).

## V2 Authentication
- 2.1 Signup/login via Supabase Auth; client validation only — EVIDENCE: `register.html`, `login.html`. GAP: MFA UI absent (see `MFA.md`), Auth rate limits/password policy must be verified in dashboard.
- 2.2 Credential storage: none client-side beyond session (supabase-js default) — EVIDENCE: grep, `frontend_static.test.js`.

## V3 Session
- 3.1 `requireAuth` gating + `getSession` — EVIDENCE: `portal.js`, pages. GAP: session lifetime/rotation is Supabase default; verify in dashboard.

## V4 Access control
- 4.1 Owner RLS + anti-spoof triggers — EVIDENCE: 001/003 + tests. GAP: live A/B/admin verification pending.
- 4.2 Admin at DB boundary, not hidden link — EVIDENCE: `is_admin()` policies. GAP: legacy admin UI still hides link client-side (acceptable as UX, not control).

## V5 Validation
- 5.1 Client validation + server triggers (status forcing, email immutability) — EVIDENCE: `booking-form.js`, `003_*`. GAP: file type/size enforced client + storage RLS; verify bucket MIME limits in dashboard.

## V7 Errors/logging
- 7.1 Supabase errors surfaced minimally (`error.message` only) — EVIDENCE: pages. No stack traces. GAP: central security-event log absent (rely on Supabase logs; define retention).

## V8 Data protection
- 8.1 PII minimized (availability RPC returns no PII; probes `limit=1`) — EVIDENCE: 002, `booking-form.js`. GAP: report exports include PII by admin design; document retention.

## V9 Comms
- 9.1 HTTPS + `connect-src` pinned; `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy` present — EVIDENCE: `index.html` headers. GAP: CSP still `unsafe-inline`; HSTS is hosting-level, verify.

## V10 Malicious code
- 10.1 Stored-JS sink removed — EVIDENCE: `customize.js` diff + test. Residual in `CUSTOM_JS_RISK.md`.

## V12 Files
- 12.1 Private `booking-files`, public-only `course-images`, signed-URL TTL 3600 — EVIDENCE: 002 + `booking-form.js`. GAP: owner-folder migration for legacy objects pending.

## V13 API
- 13.1 No custom API; Supabase PostgREST via publishable key; no secrets — EVIDENCE: grep + tests.

## V14 Config
- 14.1 Versioned migrations, no prod apply without backup/verify/rollback — EVIDENCE: `supabase/README.md`.
