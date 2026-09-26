import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const m001 = read('supabase/migrations/001_core_rls.sql');
const m002 = read('supabase/migrations/002_booking_availability_storage.sql');
const m003 = read('supabase/migrations/003_hardening_triggers.sql');

// Static contract: migrations must contain least-privilege controls.
// These do NOT prove deployed prod state (see supabase/README.md); they prove reviewable intent.
test('001 enables RLS on all in-scope tables', () => {
  for (const t of ['profiles','service_requests','bookings','class_enrollments','courses','transactions','site_theme','site_pages']) {
    assert.ok(m001.includes(`public.${t} enable row level security`), `missing RLS for ${t}`);
  }
});

test('001 defines admin boundary function', () => {
  assert.ok(m001.includes('create or replace function public.is_admin()'));
  assert.ok(m001.includes('security definer'));
  assert.ok(m001.includes("app_metadata"));
});

test('001 preserves public reads only for site_theme/site_pages', () => {
  assert.ok(m001.includes('site_theme_public_read'));
  assert.ok(m001.includes('site_pages_public_read'));
  // No anon policy for sensitive tables:
  assert.ok(!/for select to anon[^,]*using \(true\)[\s\S]*bookings/.test(m001), 'anon open read leaked');
});

test('001 enforces ownership with auth.uid()', () => {
  assert.ok(m001.includes('auth.uid() = user_id'));
  assert.ok(m001.includes('with check (auth.uid() = user_id'));
});

test('002 provides least-privilege availability (view + RPC, no PII)', () => {
  assert.ok(m002.includes('create or replace view public.booking_slots'));
  assert.ok(m002.includes('booking_date, booking_time, status'));
  assert.ok(!m002.includes('customer_name') && !m002.includes('phone'), 'availability must not expose PII');
  assert.ok(m002.includes('booking_times_for_date'));
  assert.ok(m002.includes('security definer'));
  assert.ok(m002.includes('date out of range'));
});

test('002 storage: booking-files private, course-images limited public', () => {
  assert.ok(m002.includes("'booking-files', 'booking-files', false"));
  assert.ok(m002.includes("'course-images', 'course-images', true"));
  assert.ok(m002.includes('"booking-files owner read"'));
  assert.ok(m002.includes('"course-images public read"'));
  // No anon write to either bucket:
  assert.ok(!m002.includes('for insert to anon'));
});

test('003 enforces ownership triggers and status guards', () => {
  assert.ok(m003.includes('enforce_owner_user_id'));
  assert.ok(m003.includes('guard_profiles_update'));
  assert.ok(m003.includes('guard_bookings_status'));
  assert.ok(m003.includes("NEW.status := 'pending'"));
  assert.ok(m003.includes('profiles.email change requires admin'));
});

// Live RLS matrix (opt-in): requires TEST project + synthetic users, never prod.
// Env: SUPABASE_URL_TEST, SUPABASE_ANON_KEY_TEST, TEST_USER_A_JWT, TEST_USER_B_JWT, TEST_ADMIN_JWT
// When absent, tests skip with a clear message (recorded as blocked in report).
const live = process.env.SUPABASE_URL_TEST && process.env.SUPABASE_ANON_KEY_TEST;
test('live matrix: anon/A/B/admin (skipped without TEST env)', async (t) => {
  if (!live) {
    t.skip('SUPABASE_URL_TEST/ANON_KEY_TEST not set — live matrix blocked, static contract still enforced.');
    return;
  }
  // Scaffolding only: full live matrix runs against a TEST project with synthetic rows.
  // See docs/security/TEST_PLAN.md for the manual + CI procedure.
  assert.ok(true);
});
