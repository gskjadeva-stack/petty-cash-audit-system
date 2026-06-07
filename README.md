# Petty Cash Audit System

Petty cash audit management application with a React frontend (Vercel) and Express + Prisma backend (Render), backed by Supabase PostgreSQL and Supabase Auth.

## Architecture

- **Frontend:** React 18 + Vite 6 + React Router (deployed on Vercel Hobby)
- **Backend:** Node.js + Express + Prisma (deployed on Render Free Web Service)
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth (JWT middleware placeholder on backend)

## Prerequisites

- Node.js 18+
- A Supabase project with PostgreSQL enabled
- Supabase Auth configured (email/password or your preferred provider)

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
SUPABASE_JWT_SECRET=your-jwt-secret
ENFORCE_AUTH=false
```

### 2. Install dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### 3. Run database migrations

```bash
cd backend
npx prisma migrate deploy
```

### 4. Start servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
npm run dev
```

Open http://localhost:5173 and sign in via the `/login` page.

## Deployment

### Backend (Render Free Web Service)

| Setting | Value |
|---------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Release Command | `npm run db:migrate` |

Set all backend environment variables from `.env.example` in the Render dashboard.

### Frontend (Vercel Hobby)

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Set `VITE_API_URL` to your Render backend URL, plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

[`vercel.json`](vercel.json) handles SPA client-side routing.

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
