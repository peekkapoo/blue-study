# Blue Study

Blue Study now includes a full auth backend:

- Register / login with email + password
- JWT session handling
- Per-user data storage (notes, tasks, categories, language)

## 1) Install

```bash
npm install
```

## 2) Environment variables

Create `.env` from `.env.example` and fill values:

```env
PORT=4000
FRONTEND_ORIGIN=https://blue-study.vercel.app
JWT_SECRET=replace_with_a_long_random_secret
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
VITE_API_BASE=https://your-backend-domain
VITE_API_TIMEOUT_MS=12000
```

Notes:

- `FRONTEND_ORIGIN` supports multiple origins separated by commas.
- `VITE_API_BASE` should point to the deployed backend URL in production.
- If `VITE_API_BASE` is missing, frontend falls back to `http://localhost:4000`.

## 3) Run project

Run frontend + backend together (recommended):

```bash
npm run dev:full
```

Or run separately:

```bash
npm run dev:server
npm run dev
```

## 4) API summary

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/user-data`
- `PUT /api/user-data`

User data is persisted in `server/data/db.json`.

Production note: lowdb uses local filesystem storage and is not durable on many cloud platforms. Use a managed database (Postgres/MySQL/MongoDB) for real production workloads.
