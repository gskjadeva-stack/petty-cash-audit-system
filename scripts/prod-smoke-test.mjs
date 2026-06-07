const baseUrl = 'https://petty-cash-audit-system.vercel.app';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL || 'admin@pettycash.local';
const password = process.env.SMOKE_PASSWORD || 'PcAudit2026!Admin';

if (!supabaseUrl || !anonKey) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function check(label, url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 200);
  }
  const ok = res.ok;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label} — HTTP ${res.status}`);
  if (!ok) console.log('  ', body);
  return { ok, body, res };
}

console.log('Production smoke test:', baseUrl);

await check('Login page', `${baseUrl}/login`);
await check('Entities API', `${baseUrl}/api/entities/SiteOffice`);

const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: {
    apikey: anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ email, password }),
});

const loginData = await loginRes.json();
if (!loginRes.ok) {
  console.log('FAIL Supabase login — HTTP', loginRes.status, loginData);
  process.exit(1);
}
console.log('PASS Supabase login');

const token = loginData.access_token;
const me = await check('Auth /me', `${baseUrl}/api/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});

const testOffice = {
  name: `Smoke Test ${Date.now()}`,
  code: `ST${String(Date.now()).slice(-4)}`,
  is_active: true,
};

const create = await check('Create SiteOffice', `${baseUrl}/api/entities/SiteOffice`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(testOffice),
});

if (create.ok && create.body?.id) {
  await check('Delete SiteOffice', `${baseUrl}/api/entities/SiteOffice/${create.body.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

console.log(me.ok ? '\nAll smoke tests passed.' : '\nSome tests failed.');
