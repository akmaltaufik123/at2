-- 001_core_rls.sql
-- ATE Website: baseline RLS + least-privilege grants (REVIEW ONLY - DO NOT APPLY DIRECTLY TO PROD).
-- Scope: profiles, service_requests, bookings, class_enrollments, courses, transactions, site_theme, site_pages.
-- Principles: deny anon on customer data; preserve public reads for site_theme/site_pages;
-- enforce ownership via auth.uid(); admin via app_metadata.is_admin at DB boundary.
-- Deployed policy status BEFORE this migration: UNVERIFIED (no repo migrations existed; anon probes showed
-- 200 [] on sensitive tables but that alone does not prove correct RLS).
-- Deployment: see supabase/README.md for order, backup, verify, rollback. Test on staging first.

-- 0. Helper: admin check at DB boundary. SECURITY DEFINER so anon/authenticated cannot spoof.
create schema if not exists public;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 1. Enable RLS everywhere (safe if already enabled).
alter table if exists public.profiles enable row level security;
alter table if exists public.service_requests enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.class_enrollments enable row level security;
alter table if exists public.courses enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.site_theme enable row level security;
alter table if exists public.site_pages enable row level security;

-- Force RLS for table owners as well (defense in depth; service_role still bypasses RLS by design).
alter table if exists public.profiles force row level security;
alter table if exists public.service_requests force row level security;
alter table if exists public.bookings force row level security;
alter table if exists public.class_enrollments force row level security;
alter table if exists public.courses force row level security;
alter table if exists public.transactions force row level security;
alter table if exists public.site_theme force row level security;
alter table if exists public.site_pages force row level security;

-- 2. Least-privilege grants. Start from deny, then grant narrowly.
-- Note: Supabase default grants may already exist; these REVOKEs make intent explicit.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.service_requests from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.class_enrollments from anon, authenticated;
revoke all on table public.courses from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.site_theme from anon, authenticated;
revoke all on table public.site_pages from anon, authenticated;

-- Public theming: anon + authenticated can read only.
grant select on table public.site_theme to anon, authenticated;
grant select on table public.site_pages to anon, authenticated;

-- Authenticated customer reads/writes are gated by RLS policies below; grants allow the
-- operations through to RLS (no direct privilege without policy).
grant select, insert, update, delete on table public.service_requests to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;
grant select, insert, delete on table public.class_enrollments to authenticated;
-- class_enrollments has no legitimate client UPDATE in current frontend; deny UPDATE.
revoke update on table public.class_enrollments from authenticated;

grant select on table public.courses to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
-- transactions/customer/profile writes are admin-only in practice; grants above let RLS decide.
-- If staging verify shows customer UPDATE on transactions is never needed, revoke it:
-- revoke update, delete, insert on table public.transactions from authenticated;

-- 3. Drop known-permissive legacy policies if they exist (names are guesses from common
-- Supabase defaults; IF EXISTS makes this safe when absent).
drop policy if exists "Public read" on public.profiles;
drop policy if exists "Public read" on public.service_requests;
drop policy if exists "Public read" on public.bookings;
drop policy if exists "Public read" on public.class_enrollments;
drop policy if exists "Public read" on public.courses;
drop policy if exists "Public read" on public.transactions;
drop policy if exists "Enable all for anon" on public.profiles;
drop policy if exists "Enable all for anon" on public.service_requests;
drop policy if exists "Enable all for anon" on public.bookings;

-- 4. PUBLIC TABLES: site_theme / site_pages - anon + authenticated read-only.
drop policy if exists site_theme_public_read on public.site_theme;
create policy site_theme_public_read on public.site_theme
  for select to anon, authenticated using (true);

drop policy if exists site_pages_public_read on public.site_pages;
create policy site_pages_public_read on public.site_pages
  for select to anon, authenticated using (true);

-- Writes to site_theme/site_pages: admin only (frontend has no writer; dashboard-managed).
drop policy if exists site_theme_admin_all on public.site_theme;
create policy site_theme_admin_all on public.site_theme
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists site_pages_admin_all on public.site_pages;
create policy site_pages_admin_all on public.site_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. PROFILES: user reads/updates own row; admin reads all; no client INSERT (created by auth trigger).
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update_own_limited on public.profiles;
create policy profiles_update_own_limited on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- No anon policy on profiles: anon gets zero rows by default (desired).

-- 6. SERVICE_REQUESTS: owner-only + admin. Client must not assign another user's user_id.
drop policy if exists sr_select_own on public.service_requests;
create policy sr_select_own on public.service_requests
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists sr_insert_own on public.service_requests;
create policy sr_insert_own on public.service_requests
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists sr_update_own_pending on public.service_requests;
create policy sr_update_own_pending on public.service_requests
  for update to authenticated using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists sr_delete_own on public.service_requests;
create policy sr_delete_own on public.service_requests
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists sr_admin_all on public.service_requests;
create policy sr_admin_all on public.service_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7. BOOKINGS: owner-only + admin. Availability is via booking_slots view/RPC (002), not direct anon SELECT.
drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own on public.bookings
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own on public.bookings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists bookings_update_own on public.bookings;
create policy bookings_update_own on public.bookings
  for update to authenticated using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists bookings_delete_own on public.bookings;
create policy bookings_delete_own on public.bookings
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 8. CLASS_ENROLLMENTS: owner read/insert/delete; no client update; admin all.
drop policy if exists ce_select_own on public.class_enrollments;
create policy ce_select_own on public.class_enrollments
  for select to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists ce_insert_own on public.class_enrollments;
create policy ce_insert_own on public.class_enrollments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists ce_delete_own on public.class_enrollments;
create policy ce_delete_own on public.class_enrollments
  for delete to authenticated using (auth.uid() = user_id or public.is_admin());

drop policy if exists ce_admin_all on public.class_enrollments;
create policy ce_admin_all on public.class_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 9. COURSES: authenticated can read active; admin all. No anon read (frontend requires login).
-- If public catalog without login is later required, add a narrow anon policy for active=true only.
drop policy if exists courses_select_active on public.courses;
create policy courses_select_active on public.courses
  for select to authenticated using ((active = true) or public.is_admin());

drop policy if exists courses_admin_all on public.courses;
create policy courses_admin_all on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 10. TRANSACTIONS: admin-only. No owner policies (frontend admin tab only).
-- If customer-visible transactions are needed later, add owner SELECT with user_id scoping.
drop policy if exists transactions_admin_all on public.transactions;
create policy transactions_admin_all on public.transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
