# Supabase migrations — ATE Website (REVIEW ONLY)

> Deployed RLS status before these files: **UNVERIFIED** (no versioned migrations existed in repo).
> Do NOT apply directly to production. Test on a staging branch/project first.

## Files (apply in order)

1. `migrations/001_core_rls.sql` — enable RLS, least-privilege grants, owner/admin policies, public reads for `site_theme`/`site_pages`.
2. `migrations/002_booking_availability_storage.sql` — `booking_slots` view, `booking_times_for_date(date)` RPC, storage buckets + `storage.objects` policies.
3. `migrations/003_hardening_triggers.sql` — ownership triggers, profile/status guards.

## Pre-deployment backup (Supabase dashboard / CLI)

```bash
# CLI example (run from a machine with project linked; never paste keys):
supabase db dump -f pre_rls_backup.sql
# + snapshot storage buckets (booking-files, course-images) via dashboard > Storage > backups
# Record: project ref lmvg***, time, actor, backup location.
```

Verify backup is restorable on staging before proceeding.

## Staging apply

```bash
supabase db push --dry-run
supabase db push
```

Or apply via Supabase Dashboard > SQL Editor file-by-file in order, confirming each succeeds.

## Verification queries (run as anon, authenticated test users A/B, admin)

```sql
-- 1. RLS enabled?
select tablename, rowsecurity from pg_tables where schemaname='public'
  and tablename in ('profiles','service_requests','bookings','class_enrollments','courses','transactions','site_theme','site_pages');

-- 2. Policies present?
select tablename, policyname, roles, cmd from pg_policies
 where schemaname='public' order by tablename, policyname;

-- 3. Grants?
select table_name, grantee, privilege_type from information_schema.role_table_grants
 where table_schema='public' order by table_name, grantee;

-- 4. Storage buckets public flags?
select id, public from storage.buckets where id in ('booking-files','course-images');

-- 5. RPC/view exist?
select routine_name from information_schema.routines where routine_schema='public' and routine_name='booking_times_for_date';
select table_name from information_schema.views where table_schema='public' and table_name='booking_slots';
```

Behavioural checks (use synthetic test users, never real customer data):
- anon `site_theme`/`site_pages` SELECT returns rows; anon `bookings`/`profiles` returns zero rows.
- user A cannot SELECT/UPDATE/DELETE user B rows (test each table).
- user A INSERT with `user_id = B` fails.
- non-admin UPDATE `profiles.email` fails; non-admin INSERT `bookings` forces `status=pending`.
- `booking_times_for_date(today)` as authenticated returns only times, no PII.
- `booking-files` anon list empty; owner-folder read/write works; `course-images` anon read works, anon write fails.

See `tests/rls_contract.test.js` for automated static contract + live-test scaffolding (requires test keys via env, never committed).

## Rollback

Each migration is written with `DROP POLICY IF EXISTS` / `CREATE OR REPLACE`, so re-running is idempotent.
To roll back:

1. Restore `pre_rls_backup.sql` to staging and confirm app behaviour, OR
2. Manually drop added objects in reverse order:

```sql
-- reverse of 003
drop trigger if exists trg_bookings_status on public.bookings;
drop function if exists public.guard_bookings_status();
drop trigger if exists trg_service_requests_status on public.service_requests;
drop function if exists public.guard_service_requests_status();
drop trigger if exists trg_profiles_guard on public.profiles;
drop function if exists public.guard_profiles_update();
drop trigger if exists trg_service_requests_owner on public.service_requests;
drop trigger if exists trg_bookings_owner on public.bookings;
drop trigger if exists trg_class_enrollments_owner on public.class_enrollments;
drop function if exists public.enforce_owner_user_id();

-- reverse of 002
drop function if exists public.booking_times_for_date(date);
drop view if exists public.booking_slots;
-- storage policies: restore previous policies from backup (no generic drop-all here).

-- reverse of 001
drop function if exists public.is_admin();
-- policies: restore from backup; do NOT leave tables without RLS.
```

Never disable RLS as a "rollback" — restore known-good policies instead.

## Production approval needed

- [ ] Staging verification evidence reviewed
- [ ] Backup location confirmed
- [ ] Maintenance window + owner
- [ ] Rollback tested on staging
