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
```

Notes:

- `FRONTEND_ORIGIN` supports multiple origins separated by commas.
- `VITE_API_BASE` should point to your deployed backend URL in production.
- If `VITE_API_BASE` is missing in dev, frontend falls back to `http://localhost:4000`.

## 3) Run

Frontend only:

```bash
npm run dev
```

Backend only:

```bash
npm run dev:server
```

Run both together:

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

If backend returns `503` on Render:

- Check logs for startup crash.
- Ensure Node runtime is 18+.
- Ensure env vars are set: `JWT_SECRET`, `FRONTEND_ORIGIN`.
- Redeploy after updating env.

## 5) API summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/user-data`
- `PUT /api/user-data`

User data is persisted in `backend/server/data/db.json`.

Production note: lowdb uses local filesystem storage and is not durable on many cloud platforms. Use a managed database (Postgres/MySQL/MongoDB) for production workloads.
