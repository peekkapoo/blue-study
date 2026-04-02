# Blue Study

Blue Study now includes a full auth backend:

- Register / login with email + password
- Login with Google (Google Identity Services)
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
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=replace_with_a_long_random_secret
GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id.apps.googleusercontent.com
```

Notes:

- `GOOGLE_CLIENT_ID` is used by backend token verification.
- `VITE_GOOGLE_CLIENT_ID` is used by frontend Google button rendering.

## 3) Run project

Run frontend + backend together:

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
