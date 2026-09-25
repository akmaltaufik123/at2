# Test plan — website RLS (synthetic data only)

## Static (runs now, no credentials)
```bash
node --test tests/
```
Covers: RLS migration contract, no server secrets, no `new Function`, RPC preference, auth gating.

## Live matrix (requires TEST project, never prod)
Env (never commit):
```
SUPABASE_URL_TEST, SUPABASE_ANON_KEY_TEST
TEST_USER_A_JWT, TEST_USER_B_JWT, TEST_ADMIN_JWT
```

Matrix per table (`profiles`, `service_requests`, `bookings`, `class_enrollments`, `courses`, `transactions`):
- anon SELECT → zero rows (except `site_theme`/`site_pages` → rows).
- A SELECT own → rows; A SELECT B's id → zero rows.
- A INSERT with `user_id=B` → rejected.
- A UPDATE/DELETE B's row → rejected (zero rows affected / error).
- admin SELECT/UPDATE/DELETE → allowed.
- `booking_times_for_date(today)` as A → times only, no PII; out-of-range date → error; anon → empty (until anon availability is approved).
- Storage: anon list empty; A upload to own folder works, to B's folder fails; `course-images` anon read works, anon write fails.

Record commands, HTTP statuses, and row counts (mask values). Any test needing prod data is BLOCKED by design.
