import '../backend/src/env.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const expectedSite = 'https://petty-cash-audit-system.vercel.app';

const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: { apikey: anonKey },
});
const settings = await res.json();

const siteUrl =
  settings?.SITE_URL ||
  settings?.site_url ||
  settings?.external?.site_url;
const redirectUrls =
  settings?.URI_ALLOW_LIST ||
  settings?.uri_allow_list ||
  settings?.external?.redirect_urls ||
  '';

console.log('Auth settings keys:', Object.keys(settings).join(', '));
console.log('Current Site URL:', siteUrl || '(unknown)');
console.log('Current Redirect URLs:', redirectUrls || '(unknown)');

const siteOk = siteUrl === expectedSite;
const redirectOk =
  redirectUrls.includes(expectedSite) && redirectUrls.includes('localhost:5173');

console.log(siteOk ? 'PASS Site URL matches production' : 'WARN Site URL not set to production Vercel URL');
console.log(
  redirectOk
    ? 'PASS Redirect URLs include production and localhost'
    : 'WARN Redirect URLs may need manual update in Supabase Dashboard'
);

process.exit(siteOk && redirectOk ? 0 : 1);
