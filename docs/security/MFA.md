# MFA for privileged accounts (Supabase Auth)

Supabase Auth supports TOTP MFA (enroll/challenge/verify via `supabase.auth.mfa`). This static site does not yet enroll MFA; enforcement is via project configuration + admin procedure until UI is added.

## Required production actions (owner)
1. Supabase Dashboard > Authentication > MFA: enable TOTP.
2. Require MFA for all users with `app_metadata.is_admin=true`. Document enrolled admins (names + dates, no secrets).
3. Password policy: minimum length ≥ 12 for admins, breach detection on, rate limits on Auth endpoints.
4. Login UI follow-up (separate change): add MFA challenge handling after `signInWithPassword` (detect `mfa_required`, prompt for TOTP, verify). Do not ship without staging test.

## Verification
- Attempt admin login without TOTP → challenged/denied per policy.
- `is_admin` assignment only via Auth admin API with MFA'd session; never from client.
