import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'node:crypto';
import { getDb, defaultUserPayload } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DEFAULT_FRONTEND_ORIGINS = ['http://localhost:5173', 'https://blue-study.vercel.app'];
const FRONTEND_ORIGINS = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = [...new Set([...DEFAULT_FRONTEND_ORIGINS, ...FRONTEND_ORIGINS])];
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    picture: user.picture || null,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeUserData(body = {}) {
  return {
    notes: ensureArray(body.notes),
    tasks: ensureArray(body.tasks),
    categories: ensureArray(body.categories),
    lang: typeof body.lang === 'string' ? body.lang : 'en',
    goals: ensureArray(body.goals),
    studySessions: ensureArray(body.studySessions),
    revisions: ensureArray(body.revisions),
    exams: ensureArray(body.exams),
  };
}

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Missing token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = await getDb();
    const user = db.data.users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/public-config', (_req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID || null,
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must have at least 6 characters' });
  }

  const db = await getDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const existed = db.data.users.find((u) => u.email === normalizedEmail);
  if (existed) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    provider: 'local',
    picture: null,
    createdAt: new Date().toISOString(),
  };

  db.data.users.push(user);
  db.data.userData[user.id] = { ...defaultUserPayload };
  await db.write();

  return res.status(201).json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const db = await getDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.data.users.find((u) => u.email === normalizedEmail);
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const isValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

  return res.json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ message: 'Missing Google credential' });

  try {
    const verifyConfig = { idToken: credential };
    if (GOOGLE_CLIENT_ID) verifyConfig.audience = GOOGLE_CLIENT_ID;
    const ticket = await googleClient.verifyIdToken(verifyConfig);

    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json({ message: 'Google account missing email' });

    const db = await getDb();
    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = db.data.users.find((u) => u.email === normalizedEmail);

    if (!user) {
      user = {
        id: randomUUID(),
        name: payload.name || payload.given_name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        passwordHash: null,
        provider: 'google',
        picture: payload.picture || null,
        createdAt: new Date().toISOString(),
      };
      db.data.users.push(user);
      db.data.userData[user.id] = { ...defaultUserPayload };
    } else {
      user.provider = user.provider || 'google';
      user.picture = payload.picture || user.picture || null;
      user.name = user.name || payload.name || normalizedEmail.split('@')[0];
    }

    await db.write();

    return res.json({
      token: createToken(user),
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(401).json({ message: 'Invalid Google token' });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/user-data', authRequired, async (req, res) => {
  const db = await getDb();
  const userId = req.user.id;
  const saved = db.data.userData[userId] || { ...defaultUserPayload };
  res.json({ data: saved });
});

app.put('/api/user-data', authRequired, async (req, res) => {
  const db = await getDb();
  const userId = req.user.id;
  db.data.userData[userId] = normalizeUserData(req.body);
  await db.write();
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS') {
    res.status(403).json({ message: 'Origin not allowed by CORS' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  if (JWT_SECRET === 'dev-secret-change-me') {
    console.warn('Using default JWT_SECRET. Set JWT_SECRET in .env for production.');
  }
  console.log(`Blue Study backend running on http://localhost:${PORT}`);
});
