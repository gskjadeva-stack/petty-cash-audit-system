/**
 * Fetch latest Render deploy logs for petty-cash-audit-api.
 * Requires RENDER_API_KEY (or ~/.render/cli.yaml).
 */
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

function getApiKey() {
  if (process.env.RENDER_API_KEY) return process.env.RENDER_API_KEY;
  const cfg = join(homedir(), '.render', 'cli.yaml');
  if (!existsSync(cfg)) throw new Error('No RENDER_API_KEY');
  const line = readFileSync(cfg, 'utf8').split('\n').find((l) => /^\s*key:\s*rnd_/.test(l));
  return line?.replace(/^\s*key:\s*/, '').trim();
}

const apiKey = getApiKey();
const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' };

async function api(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const services = await api('/services?limit=100');
let serviceId = process.env.RENDER_SERVICE_ID;
if (!serviceId) {
  for (const item of services) {
    const svc = item.service || item;
    if (svc.name === 'petty-cash-audit-api') {
      serviceId = svc.id;
      break;
    }
  }
}
if (!serviceId) throw new Error('Service not found');

const deploys = await api(`/services/${serviceId}/deploys?limit=1`);
const deploy = deploys?.[0]?.deploy || deploys?.[0];
console.log('Service:', serviceId);
console.log('Latest deploy:', deploy?.id, deploy?.status);

const events = await api(`/services/${serviceId}/deploys/${deploy.id}/events?limit=100`);
for (const item of events || []) {
  const e = item.event || item;
  if (e?.details) console.log(e.details);
  else if (e?.message) console.log(e.message);
}
