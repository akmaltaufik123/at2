import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('no server secrets in frontend', () => {
  const files = ['js/supabase-config.js','js/portal.js','js/booking-form.js','js/customize.js','admin.html','request.html'];
  const bad = /service_role|sb_secret_|ATE_ADMIN_TOKEN|ATE_APINEBULA_API_KEY|BEGIN .*PRIVATE KEY/;
  for (const f of files) {
    if (!exists(f)) continue;
    assert.ok(!bad.test(read(f)), `${f} contains a server-secret pattern`);
  }
});

test('stored custom_js is never executed', () => {
  const src = read('js/customize.js');
  assert.ok(!src.includes('new Function('), 'new Function sink must stay removed');
  assert.ok(src.includes('custom_js ignored'), 'must document disabled custom_js');
});

test('booking availability prefers least-privilege RPC', () => {
  const src = read('js/booking-form.js');
  assert.ok(src.includes('booking_times_for_date'), 'frontend should try RPC first');
  assert.ok(src.includes('Fallback preserves'), 'must document fallback until 002 deployed');
});

test('supabase client uses publishable key only', () => {
  const cfg = read('js/supabase-config.js');
  assert.ok(cfg.includes('SUPABASE_URL') && cfg.includes('SUPABASE_ANON_KEY'));
  assert.ok(!cfg.includes('service_role'));
});

test('auth flows use requireAuth gate', () => {
  for (const f of ['dashboard.html','request.html','my-requests.html','bookings.html','classes.html']) {
    assert.ok(read(f).includes('requireAuth'), `${f} must gate behind requireAuth`);
  }
});
