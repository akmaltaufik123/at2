# ISO/IEC 27001:2022 ISMS starter pack — website (TEMPLATES, unverified)

> Templates only. No certification/conformity claimed. Owner must approve scope, risks, and SoA.

## Proposed scope (draft)
Customer portal (this repo) + Supabase project (auth, DB, storage). Excludes gateway provider billing (see gateway repo) and hosting network (verify with hoster).

## Asset inventory (extract)
- A1 Frontend code (this repo) — owner: web lead.
- A2 Supabase Auth users/sessions — owner: platform admin.
- A3 Customer tables (`bookings`, `service_requests`, `profiles`, `class_enrollments`, `transactions`) — owner: operations.
- A4 Storage (`booking-files` private, `course-images` public) — owner: operations.
- A5 Public config (`site_theme`, `site_pages`) — owner: content admin.
- A6 Backups/exports (DB dumps, reports) — owner: platform admin.

## Risk register (extract)
| ID | Risk | Likelihood | Impact | Treatment |
|---|---|---|---|---|
| R1 | RLS misconfig exposes customer rows to anon/auth users | M | H | 001-003 + staging live matrix + dashboard review (A.5.15, A.8.5) |
| R2 | Stored XSS via `site_pages` writer | L (after sink removal) | H | Remove `new Function`; admin-only writers; MFA (A.8.5, A.5.17) |
| R3 | Privilege escalation (role/self-assignment) | M | H | Triggers + `is_admin` boundary; MFA for admins (A.5.15-17) |
| R4 | Private file leak (`booking-files`) | M | H | Private bucket, owner folders, short signed URLs (A.8.12) |
| R5 | Backup/restore failure | M | M | Dump + restore test per change (A.8.13) |
| R6 | Credential leak in repo/logs | L | H | Tests + no-secret policy; masked reporting (A.5.15, A.8.10) |

## Risk treatment plan
R1-R4: implement 001-003 on staging, verify matrix, then prod runbook. R5: backup/restore evidence per migration. R6: static tests in CI + manual review. Owners + dates to be assigned.

## Statement of Applicability (draft extract)
- A.5.15 Access control: RLS owner/admin + triggers — PARTIAL (code ready, prod unverified).
- A.5.17 Auth info: MFA required for admins — PLANNED (see MFA.md).
- A.8.5 Secure auth: Supabase Auth + requireAuth — PARTIAL.
- A.8.10 Logging: Supabase logs; retention TBD — GAP.
- A.8.12 DLP: least-privilege RPC/view; no PII in logs — PARTIAL.
- A.8.13 Backup: dump + restore test — PLANNED per change.
- Others: mark N/A or TBD with justification; full SoA needs management review.

## Access management
- Admins: least number, MFA, `app_metadata.is_admin` via admin API only; quarterly review; immediate revocation on leave.
- Customers: self-registration; own-data only; no role self-assignment (trigger-enforced).

## Incident response (starter)
1. Contain (revoke key/session, disable writer), 2. Preserve logs, 3. Assess PII scope (minimum-data), 4. Notify per law/contract, 5. Root cause + RLS/policy fix on staging, 6. Lessons learned. Contacts/RTO to be filled.

## Supplier review
- Supabase (auth/DB/storage): review DPA, region, backups, MFA support, advisory monitoring. CDN (`jsdelivr`), fonts, hosting: review SRI/pinning, skad. Record decisions.

## Internal audit checklist
- [ ] Migrations applied to staging? Verification queries saved?
- [ ] Live A/B/admin matrix passed with synthetic data?
- [ ] Storage anon/auth checks passed?
- [ ] No secrets in repo (`frontend_static` pass)?
- [ ] Backup + restore test logged?
- [ ] Admin MFA enrolled?
