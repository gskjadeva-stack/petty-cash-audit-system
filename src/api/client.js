import { getAccessToken, signOut } from './supabase.js';

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? '' : 'http://localhost:3001');

const ENTITY_NAMES = [
  'PCARecord',
  'PCFCashCount',
  'PCFDisbursement',
  'SiteOffice',
  'Classification',
  'Category',
  'Comment',
  'ActivityLog',
  'Notification',
  'AuditSchedule',
  'Finding',
];

async function apiFetch(path, options = {}) {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      // response body is not JSON
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

function createEntityClient(entityName) {
  return {
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit != null) params.set('limit', String(limit));
      const qs = params.toString();
      return apiFetch(`/api/entities/${entityName}${qs ? `?${qs}` : ''}`);
    },

    async filter(query, sort, limit) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query || {})) {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      }
      if (sort) params.set('sort', sort);
      if (limit != null) params.set('limit', String(limit));
      return apiFetch(`/api/entities/${entityName}/filter?${params}`);
    },

    async create(payload) {
      return apiFetch(`/api/entities/${entityName}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    async update(id, payload) {
      return apiFetch(`/api/entities/${entityName}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    async delete(id) {
      return apiFetch(`/api/entities/${entityName}/${id}`, {
        method: 'DELETE',
      });
    },

    async get(id) {
      const rows = await this.filter({ id });
      return rows[0] || null;
    },
  };
}

const entities = {};
for (const name of ENTITY_NAMES) {
  entities[name] = createEntityClient(name);
}

export const db = {
  auth: {
    async isAuthenticated() {
      return !!(await getAccessToken());
    },

    async me() {
      return apiFetch('/api/auth/me');
    },

    logout(redirectUrl) {
      signOut().then(() => {
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          window.location.reload();
        }
      });
    },

    redirectToLogin(returnUrl) {
      const url = returnUrl || window.location.href;
      window.location.href = `/login?returnUrl=${encodeURIComponent(url)}`;
    },
  },

  entities,

  integrations: {
    Core: {
      async UploadFile() {
        return { file_url: '' };
      },
    },
  },
};

export default db;
