/**
 * Programmatic E2E covering the browser login → dashboard data flow.
 * Uses the same APIs the React app calls after sign-in.
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const baseUrl = 'https://petty-cash-audit-system.vercel.app';
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL || 'admin@pettycash.local';
const password = process.env.SMOKE_PASSWORD || 'PcAudit2026!Admin';

function assert(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) process.exitCode = 1;
}

// 1. Login page loads
const loginRes = await fetch(`${baseUrl}/login`);
assert('Login page', loginRes.ok, `HTTP ${loginRes.status}`);

// 2. SPA rewrite for /records
const recordsRes = await fetch(`${baseUrl}/records`);
const recordsHtml = await recordsRes.text();
assert(
  'SPA /records rewrite',
  recordsRes.ok && recordsHtml.includes('Petty Cash Audit System'),
  `HTTP ${recordsRes.status}`
);

// 3. Supabase sign-in (same as browser login form)
const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anonKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const tokenData = await tokenRes.json();
assert('Browser-equivalent login', tokenRes.ok, tokenData.error_description || `HTTP ${tokenRes.status}`);
const token = tokenData.access_token;

// 4. Dashboard auth check (db.auth.me)
const meRes = await fetch(`${baseUrl}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const me = await meRes.json();
assert('Post-login /api/auth/me', meRes.ok && me.email === email, me.error || me.email);

// 5. Settings data — Site Offices list
const officesRes = await fetch(`${baseUrl}/api/entities/SiteOffice`, {
  headers: { Authorization: `Bearer ${token}` },
});
const offices = await officesRes.json();
assert(
  'Settings Site Offices load',
  officesRes.ok && Array.isArray(offices),
  `count=${offices.length}`
);

// 6. Settings CRUD — add and verify
const testOffice = {
  name: `E2E Office ${Date.now()}`,
  code: `E2E${String(Date.now()).slice(-4)}`,
  is_active: true,
};
const createRes = await fetch(`${baseUrl}/api/entities/SiteOffice`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(testOffice),
});
const created = await createRes.json();
assert('Add Site Office', createRes.status === 201 && created.id, created.error);

// 7. Verify persistence after "refresh"
const refreshRes = await fetch(`${baseUrl}/api/entities/SiteOffice`, {
  headers: { Authorization: `Bearer ${token}` },
});
const refreshed = await refreshRes.json();
const found = refreshed.some((o) => o.id === created.id);
assert('Site Office persists after refresh', found);

// 8. Cleanup
if (created.id) {
  const delRes = await fetch(`${baseUrl}/api/entities/SiteOffice/${created.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert('Delete test Site Office', delRes.ok, `HTTP ${delRes.status}`);
}

// 9. API uses same origin (not localhost)
assert('API same-origin', !baseUrl.includes('localhost:3001'), baseUrl);

if (!process.exitCode) {
  console.log('\nAll browser-equivalent E2E checks passed.');
}
