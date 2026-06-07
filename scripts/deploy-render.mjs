/**
 * Create/update Render web service for petty-cash-audit-api via Render API.
 * Requires: RENDER_API_KEY, GITHUB_REPO_URL (public or connected repo URL)
 *
 * Usage:
 *   set RENDER_API_KEY=rnd_...
 *   set GITHUB_REPO_URL=https://github.com/you/petty-cash-audit-system
 *   node --env-file=backend/.env scripts/deploy-render.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const apiKey = process.env.RENDER_API_KEY;
const repoUrl =
  process.env.GITHUB_REPO_URL ||
  process.env.RENDER_REPO_URL ||
  process.env.RENDER_GIT_REPO;

if (!apiKey) {
  console.error('Set RENDER_API_KEY (from https://dashboard.render.com/u/settings#api-keys)');
  process.exit(1);
}
if (!repoUrl) {
  console.error('Set GITHUB_REPO_URL to your pushed repository URL');
  process.exit(1);
}

const backendEnv = loadEnvFile(join(root, 'backend', '.env'));
const corsOrigin =
  backendEnv.CORS_ORIGIN ||
  'https://petty-cash-audit-system.vercel.app,http://localhost:5173';

const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

async function api(method, path, body) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function listServices() {
  const data = await api('GET', '/services?limit=100');
  return data || [];
}

async function findService() {
  const services = await listServices();
  for (const item of services) {
    const svc = item.service || item;
    if (svc.name === 'petty-cash-audit-api' || svc.slug === 'petty-cash-audit-api') {
      return svc;
    }
  }
  return null;
}

async function createService(ownerId) {
  return api('POST', '/services', {
    type: 'web_service',
    name: 'petty-cash-audit-api',
    ownerId,
    repo: repoUrl,
    branch: 'main',
    rootDir: 'backend',
    autoDeploy: 'yes',
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'ENFORCE_AUTH', value: 'false' },
      { key: 'SUPABASE_STORAGE_BUCKET', value: 'attachments' },
      { key: 'CORS_ORIGIN', value: corsOrigin },
      { key: 'SUPABASE_URL', value: backendEnv.SUPABASE_URL },
      { key: 'DATABASE_URL', value: backendEnv.DATABASE_URL },
      { key: 'DIRECT_URL', value: backendEnv.DIRECT_URL },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: backendEnv.SUPABASE_SERVICE_ROLE_KEY },
    ].filter((e) => e.value),
    serviceDetails: {
      runtime: 'node',
      plan: 'free',
      region: 'singapore',
      envSpecificDetails: {
        buildCommand: 'npm install',
        startCommand: 'npm run start:prod',
      },
    },
  });
}

async function triggerDeploy(serviceId) {
  return api('POST', `/services/${serviceId}/deploys`, { clearCache: 'do_not_clear' });
}

async function getLatestDeploy(serviceId) {
  const data = await api('GET', `/services/${serviceId}/deploys?limit=1`);
  const item = data?.[0];
  return item?.deploy || item;
}

async function waitForDeploy(serviceId, maxAttempts = 40) {
  for (let i = 1; i <= maxAttempts; i++) {
    const deploy = await getLatestDeploy(serviceId);
    const status = deploy?.status || 'unknown';
    console.log(`Deploy status (${i}/${maxAttempts}):`, status);
    if (status === 'live') return deploy;
    if (status === 'build_failed' || status === 'update_failed' || status === 'canceled') {
      throw new Error(`Deploy failed with status: ${status}`);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  throw new Error('Deploy did not reach live status in time');
}

async function waitForHealth(url, maxAttempts = 12) {
  const healthUrl = `${url.replace(/\/$/, '')}/health`;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(45000) });
      const text = await res.text();
      console.log(`Health (${i}/${maxAttempts}): HTTP ${res.status} ${text.slice(0, 80)}`);
      if (res.ok) return true;
    } catch (err) {
      console.log(`Health (${i}/${maxAttempts}):`, err.message);
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

async function main() {
  const owners = await api('GET', '/owners?limit=20');
  const owner = owners?.[0]?.owner || owners?.[0];
  if (!owner?.id) {
    throw new Error('Could not resolve Render owner/workspace id');
  }
  console.log('Render owner:', owner.name || owner.email || owner.id);

  let service = await findService();
  if (!service) {
    console.log('Creating web service petty-cash-audit-api...');
    const created = await createService(owner.id);
    service = created.service || created;
    console.log('Created service:', service.id, service.serviceDetails?.url || service.url);
  } else {
    console.log('Service exists:', service.id, service.serviceDetails?.url || service.url);
  }

  console.log('Triggering deploy...');
  try {
    const deploy = await triggerDeploy(service.id);
    const d = deploy?.deploy || deploy;
    if (d?.id) console.log('Deploy id:', d.id, 'status:', d.status);
    else console.log('Deploy triggered (auto-deploy may already be in progress)');
  } catch (err) {
    console.log('Deploy trigger skipped:', err.message);
  }

  await waitForDeploy(service.id);

  const url =
    service.serviceDetails?.url ||
    service.url ||
    `https://petty-cash-audit-api.onrender.com`;
  console.log('\nRender API URL:', url);

  const healthy = await waitForHealth(url);
  if (!healthy) {
    console.error('Service is live but /health did not respond successfully yet');
    process.exit(1);
  }
  console.log('Render backend is healthy at', `${url}/health`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
