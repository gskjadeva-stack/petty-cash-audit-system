import dotenv from 'dotenv';
import { existsSync } from 'fs';

dotenv.config({ path: 'backend/.env', override: true });
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
}

const projectRef = 'dpmaykeesrcczycwsdqw';
const siteUrl = 'https://petty-cash-audit-system.vercel.app';
const redirectUrls = `${siteUrl}/**,http://localhost:5173/**`;

async function updateViaManagementApi(token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_url: siteUrl,
      uri_allow_list: redirectUrls,
    }),
  });
  const body = await res.text();
  console.log(`Management API HTTP ${res.status}: ${body}`);
  return res.ok;
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (accessToken) {
  const ok = await updateViaManagementApi(accessToken);
  process.exit(ok ? 0 : 1);
}

// Password login works without redirect URL config; update for OAuth/magic-link flows.
console.log(
  'SUPABASE_ACCESS_TOKEN not set — update auth URLs in Supabase Dashboard:\n' +
    '  Authentication → URL Configuration\n' +
    `  Site URL: ${siteUrl}\n` +
    `  Redirect URLs: ${redirectUrls}\n\n` +
    'Or create a token at https://supabase.com/dashboard/account/tokens and run:\n' +
    '  set SUPABASE_ACCESS_TOKEN=your-token && node scripts/update-supabase-auth.mjs'
);

// Verify password login still works (proxy for auth health)
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (supabaseUrl && anonKey) {
  const email = process.env.SMOKE_EMAIL || 'admin@pettycash.local';
  const password = process.env.SMOKE_PASSWORD || 'PcAudit2026!Admin';
  const loginRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (loginRes.ok) {
    console.log('\nPassword login verified — app auth is functional.');
    console.log('Dashboard URL update recommended for OAuth/email redirect flows.');
    process.exit(0);
  }
}

process.exit(0);
