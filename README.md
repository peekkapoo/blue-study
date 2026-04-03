# Blue Study

Blue Study is now split into two separate apps in one repo:

- Frontend (Vite + React): repo root
- Backend (Express auth/data API): `backend/`

This makes frontend work easier and safer because UI changes can be done independently from backend internals.

## Project structure

```text
blue-study/
	src/                  # frontend source
	backend/
		server/             # backend source
		package.json
```

## 1) Install

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
npm --prefix backend install
```

## 2) Environment variables

Frontend env (repo root `.env`, based on `.env.example`):

```env
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
VITE_API_BASE=http://localhost:4000
VITE_API_TIMEOUT_MS=12000
```

Backend env (`backend/.env`, based on `backend/.env.example`):

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173,https://blue-study.vercel.app
JWT_SECRET=replace_with_a_long_random_secret
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Notes:

- `FRONTEND_ORIGIN` supports multiple origins separated by commas.
- `VITE_API_BASE` should point to your deployed backend URL in production.
- If `VITE_API_BASE` is missing in dev, frontend falls back to `http://localhost:4000`.
- `SUPABASE_URL` must be the Project URL (`https://...supabase.co`) from Supabase settings.
- Do not use `sb_publishable_...` as `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` must stay backend-only (never put in frontend env).

## 3) Run

Frontend only:

```bash
npm run dev:client
```

Backend only:

```bash
npm run dev:server
```

Run both together:

```bash
npm run dev
```

Alias (same as above):

```bash
npm run dev:full
```

## 4) Deployment notes

Frontend deploy (for example Vercel):

- Build command: `npm run build`
- Output: `dist`

Backend deploy (for example Render):

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`

If your Render service runs from repo root instead of `backend`:

- Build command: `npm install` (root `postinstall` now installs backend deps automatically)
- Start command: `npm start`

If backend returns `503` on Render:

- Check logs for startup crash.
- Ensure Node runtime is 18+.
- Ensure env vars are set: `JWT_SECRET`, `FRONTEND_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Redeploy after updating env.

## 5) API summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `PATCH /api/auth/profile`
- `GET /api/auth/me`
- `GET /api/user-data`
- `PUT /api/user-data`

User data is persisted in Supabase when configured. If Supabase env vars are missing, backend falls back to local file storage (`backend/server/data/db.json`).

Production note: local file storage is not durable on many cloud platforms. Supabase is recommended for durable storage.
