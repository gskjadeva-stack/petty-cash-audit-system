# Petty Cash Audit System

Petty cash audit management application with a React frontend and Express + Prisma API, backed by Supabase PostgreSQL and Supabase Auth.

**Production:** https://petty-cash-audit-system.vercel.app

## Architecture

- **Frontend:** React 18 + Vite 6 + React Router (Vercel static build)
- **API:** Express serverless functions on Vercel (`api/index.js` auth, `api/entities.js` CRUD)
- **Database:** Supabase PostgreSQL via Prisma
- **Auth:** Supabase Auth (JWT decode placeholder on backend; `ENFORCE_AUTH=false` by default)

Local development runs the Express server on port 3001. Production uses same-origin `/api/*` routes (no separate backend host).

## Prerequisites

- Node.js 18+
- A Supabase project with PostgreSQL enabled
- Supabase Auth configured (email/password)

## Local Development

### 1. Environment setup

Copy [`.env.example`](.env.example) and configure:

**Frontend** — create `.env.local` in the project root:

```
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Backend** — create `backend/.env`:

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://...pooler...6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://...5432/postgres
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENFORCE_AUTH=false
```

### 2. Install dependencies

```bash
npm install
cd backend && npm install
```

### 3. Run database migrations

```bash
cd backend
npm run db:migrate
```

### 4. Start servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
npm run dev
```

Open http://localhost:5173 and sign in via the `/login` page.

## Deployment (Vercel Full-Stack)

Deploy from the project root with the Vercel CLI:

```bash
npx vercel link
npx vercel --prod
```

[`vercel.json`](vercel.json) configures the Vite build, SPA rewrites, and API function routing.

### Vercel environment variables (Production)

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | empty (same-origin API) |
| `DATABASE_URL` | Supabase pooler URL (port 6543) |
| `DIRECT_URL` | Supabase session URL (port 5432) |
| `SUPABASE_URL` | Supabase project URL |
| `CORS_ORIGIN` | `https://your-app.vercel.app,http://localhost:5173` |
| `ENFORCE_AUTH` | `false` |
| `NODE_ENV` | `production` |

### Supabase Auth URL configuration

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** `https://petty-cash-audit-system.vercel.app`
- **Redirect URLs:** `https://petty-cash-audit-system.vercel.app/**`, `http://localhost:5173/**`

Or run `node scripts/update-supabase-auth.mjs` with a [Supabase access token](https://supabase.com/dashboard/account/tokens) set as `SUPABASE_ACCESS_TOKEN`.

### Production verification

```bash
node --env-file=.env.local scripts/prod-smoke-test.mjs
node scripts/browser-e2e.mjs
```

### Optional: Render backend

[`render.yaml`](render.yaml) is included for a split frontend/backend setup if you add a GitHub remote and prefer a long-running Express host instead of Vercel serverless.

## API

Entity CRUD mirrors the former Base44 SDK surface:

| SDK method | HTTP |
|------------|------|
| `db.entities.X.list(sort, limit)` | `GET /api/entities/X?sort=&limit=` |
| `db.entities.X.filter(query, sort, limit)` | `GET /api/entities/X/filter?...` |
| `db.entities.X.create(data)` | `POST /api/entities/X` |
| `db.entities.X.update(id, data)` | `PATCH /api/entities/X/:id` |
| `db.entities.X.delete(id)` | `DELETE /api/entities/X/:id` |
| `db.auth.me()` | `GET /api/auth/me` |

## Placeholders

- **JWT middleware** — [`backend/src/middleware/auth.js`](backend/src/middleware/auth.js): set `ENFORCE_AUTH=true` to activate
- **Storage** — [`backend/src/services/storage.js`](backend/src/services/storage.js): scaffolded for Supabase Storage activation

## Entity schemas

JSON schema definitions in [`entities/`](entities/) are kept as reference. The canonical database schema is in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).
