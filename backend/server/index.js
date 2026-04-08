import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'node:crypto';
import webpush from 'web-push';
import {
  createUser,
  ensureUserData,
  getStorageWarning,
  getUserByDisplayName,
  getUserByEmail,
  getUserByLogin,
  getUserById,
  getUserData,
  getUsersByDisplayName,
  getPushSubscriptions,
  isSupabaseConfigured,
  removePushSubscription,
  savePushSubscription,
  saveUserData,
  updateUser,
} from './db.js';

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
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@blue-study.app';
const HAS_VAPID_KEYS = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

if (HAS_VAPID_KEYS) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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
app.use(express.json({ limit: '4mb' }));

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

function ensureObject(value, fallback = null) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return value;
}

const MCQ_OPTION_LABELS = ['A', 'B', 'C', 'D'];
const MAX_MCQ_QUESTION_BANK = 5000;
const MAX_MCQ_ATTEMPTS = 120;

function clipText(value, maxLength = 4000) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.slice(0, maxLength);
}

function parseNonNegativeInt(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function normalizeMcqSection(value) {
  return clipText(value, 80) || 'Uncategorized';
}

function normalizeMcqQuestion(question, index) {
  const source = ensureObject(question, {});
  const text = clipText(source.text, 5000);
  if (!text) return null;

  const optionsSource = ensureObject(source.options, {});
  const options = {};

  MCQ_OPTION_LABELS.forEach((label) => {
    options[label] = clipText(optionsSource[label], 2400);
  });

  const hasAtLeastTwoOptions = MCQ_OPTION_LABELS.filter((label) => options[label]).length >= 2;
  if (!hasAtLeastTwoOptions) return null;

  const providedAnswer = String(source.correctAnswer || '').trim().toUpperCase();
  const fallbackAnswer = MCQ_OPTION_LABELS.find((label) => options[label]) || 'A';
  const correctAnswer = MCQ_OPTION_LABELS.includes(providedAnswer) && options[providedAnswer]
    ? providedAnswer
    : fallbackAnswer;

  return {
    id: parseNonNegativeInt(source.id, index + 1, MAX_MCQ_QUESTION_BANK * 10) || index + 1,
    section: normalizeMcqSection(source.section),
    text,
    options,
    correctAnswer,
    explanation: clipText(source.explanation, 8000),
  };
}

function normalizeMcqAttempt(attempt, index) {
  const source = ensureObject(attempt, {});

  const totalQuestions = parseNonNegativeInt(source.totalQuestions, 0, MAX_MCQ_QUESTION_BANK);
  const correctCount = parseNonNegativeInt(source.correctCount, 0, totalQuestions);
  const answeredSeed = parseNonNegativeInt(source.answeredCount, correctCount, totalQuestions);
  const answeredCount = Math.max(correctCount, Math.min(answeredSeed, totalQuestions));
  const wrongCount = Math.max(0, Math.min(answeredCount - correctCount, totalQuestions));
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  const createdAtDate = new Date(source.createdAt || Date.now());
  const createdAt = Number.isNaN(createdAtDate.getTime())
    ? new Date().toISOString()
    : createdAtDate.toISOString();

  const sections = Array.from(new Set(
    ensureArray(source.sections)
      .map((section) => normalizeMcqSection(section))
      .filter(Boolean),
  )).slice(0, 120);

  const wrongQuestionIds = Array.from(new Set(
    ensureArray(source.wrongQuestionIds)
      .map((id) => parseNonNegativeInt(id, -1, MAX_MCQ_QUESTION_BANK * 10))
      .filter((id) => id > 0),
  )).slice(0, 200);

  return {
    id: clipText(source.id, 64) || `attempt-${index + 1}-${createdAt}`,
    createdAt,
    totalQuestions,
    answeredCount,
    correctCount,
    wrongCount,
    unansweredCount,
    scorePercent: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    timeUsedSeconds: parseNonNegativeInt(source.timeUsedSeconds, 0, 24 * 60 * 60),
    timeLimitSeconds: source.timeLimitSeconds === null ? null : parseNonNegativeInt(source.timeLimitSeconds, 0, 24 * 60 * 60),
    sections,
    wrongQuestionIds,
  };
}

function normalizeMultipleChoicesData(value) {
  const source = ensureObject(value, {});
  const questionBank = ensureArray(source.questionBank)
    .map((question, index) => normalizeMcqQuestion(question, index))
    .filter(Boolean)
    .slice(0, MAX_MCQ_QUESTION_BANK);

  const sections = Array.from(new Set(questionBank.map((question) => question.section || 'Uncategorized')));

  const preferencesSource = ensureObject(source.preferences, {});
  const selectedSections = Array.from(new Set(
    ensureArray(preferencesSource.selectedSections)
      .map((section) => normalizeMcqSection(section))
      .filter((section) => sections.includes(section)),
  )).slice(0, 120);

  return {
    questionBank,
    attempts: ensureArray(source.attempts)
      .map((attempt, index) => normalizeMcqAttempt(attempt, index))
      .filter(Boolean)
      .slice(0, MAX_MCQ_ATTEMPTS),
    preferences: {
      selectedSections: selectedSections.length ? selectedSections : sections,
      questionCountInput: String(preferencesSource.questionCountInput ?? '').replace(/\D+/g, '').slice(0, 4),
      timeLimitInput: String(preferencesSource.timeLimitInput ?? '').replace(/\D+/g, '').slice(0, 4),
      isShuffleQuestions: Boolean(preferencesSource.isShuffleQuestions),
      isUnlimitedTime: Boolean(preferencesSource.isUnlimitedTime),
    },
  };
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
    multipleChoices: normalizeMultipleChoicesData(body.multipleChoices),
    pomodoro: ensureObject(body.pomodoro, null),
    todayLayout: ensureObject(body.todayLayout, null),
  };
}

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 40;
const DISPLAY_NAME_TAKEN_MESSAGE = 'Display name is already in use. Please choose another one.';
const DISPLAY_NAME_DUPLICATED_LOGIN_MESSAGE = 'Display name is duplicated. Use email to sign in.';

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ message: 'Missing token' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    next(error);
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

app.post('/api/ai/chat', async (req, res, next) => {
  try {
    const userMessage = String(req.body?.userMessage || '').trim();
    const systemPrompt = String(req.body?.systemPrompt || '').trim();

    if (!userMessage) {
      return res.status(400).json({ message: 'Missing user message' });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ message: 'AI backend is not configured. Set ANTHROPIC_API_KEY on the server.' });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || data?.message || 'AI request failed';
      return res.status(upstream.status).json({ message });
    }

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/push/public-key', (_req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ message: 'VAPID public key not configured' });
  }
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', authRequired, async (req, res, next) => {
  try {
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint) {
      return res.status(400).json({ message: 'Missing push subscription' });
    }
    await savePushSubscription(req.user.id, subscription);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/push/unsubscribe', authRequired, async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ message: 'Missing push endpoint' });
    }
    await removePushSubscription(req.user.id, endpoint);
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/push/send', authRequired, async (req, res, next) => {
  try {
    if (!HAS_VAPID_KEYS) {
      return res.status(503).json({ message: 'VAPID keys not configured' });
    }

    const subscriptions = await getPushSubscriptions(req.user.id);
    if (!subscriptions.length) {
      return res.status(400).json({ message: 'No push subscriptions found' });
    }

    const title = String(req.body?.title || 'Blue Study');
    const body = String(req.body?.body || 'You have a new study reminder.');
    const url = String(req.body?.url || 'https://blue-study.vercel.app/');

    const payload = JSON.stringify({
      title,
      body,
      url,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    });

    const results = await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { ok: true, endpoint: subscription.endpoint };
      } catch (error) {
        if ([404, 410].includes(error?.statusCode)) {
          await removePushSubscription(req.user.id, subscription.endpoint);
        }
        return { ok: false, endpoint: subscription.endpoint, statusCode: error?.statusCode || 0 };
      }
    }));

    const sent = results.filter((result) => result.status === 'fulfilled' && result.value?.ok).length;
    const failed = results.length - sent;
    return res.json({ ok: true, sent, failed });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const nextName = String(name).trim();
  if (nextName.length < MIN_NAME_LENGTH || nextName.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters` });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must have at least 6 characters' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existed = await getUserByEmail(normalizedEmail);
  if (existed) return res.status(409).json({ message: 'Email already registered' });

  const existedDisplayName = await getUserByDisplayName(nextName);
  if (existedDisplayName) return res.status(409).json({ message: DISPLAY_NAME_TAKEN_MESSAGE });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: randomUUID(),
    name: nextName,
    email: normalizedEmail,
    passwordHash,
    provider: 'local',
    picture: null,
    createdAt: new Date().toISOString(),
  };

  const createdUser = await createUser(user);
  await ensureUserData(createdUser.id);

  return res.status(201).json({
    token: createToken(createdUser),
    user: sanitizeUser(createdUser),
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { identifier, email, password } = req.body || {};
  const loginIdentifier = identifier || email;

  if (!loginIdentifier || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const normalizedIdentifier = String(loginIdentifier).trim().toLowerCase();
  const isEmailLogin = normalizedIdentifier.includes('@');

  let user;
  if (isEmailLogin) {
    user = await getUserByLogin(normalizedIdentifier);
  } else {
    const matchedUsers = await getUsersByDisplayName(loginIdentifier);
    if (matchedUsers.length > 1) {
      return res.status(409).json({ message: DISPLAY_NAME_DUPLICATED_LOGIN_MESSAGE });
    }
    user = matchedUsers[0] || null;
  }

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: 'Invalid display name/email or password' });
  }

  const isValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValid) return res.status(401).json({ message: 'Invalid display name/email or password' });

  return res.json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!credential) return res.status(400).json({ message: 'Missing Google credential' });

  let payload;
  try {
    const verifyConfig = { idToken: credential };
    if (GOOGLE_CLIENT_ID) verifyConfig.audience = GOOGLE_CLIENT_ID;
    const ticket = await googleClient.verifyIdToken(verifyConfig);

    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Invalid Google token' });
  }

  if (!payload?.email) return res.status(400).json({ message: 'Google account missing email' });

  const normalizedEmail = payload.email.trim().toLowerCase();
  let user = await getUserByEmail(normalizedEmail);

  if (!user) {
    user = await createUser({
      id: randomUUID(),
      name: payload.name || payload.given_name || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      passwordHash: null,
      provider: 'google',
      picture: payload.picture || null,
      createdAt: new Date().toISOString(),
    });
  } else {
    user = await updateUser(user.id, {
      provider: user.provider || 'google',
      picture: payload.picture || user.picture || null,
      name: user.name || payload.name || normalizedEmail.split('@')[0],
    });
  }

  await ensureUserData(user.id);

  return res.json({
    token: createToken(user),
    user: sanitizeUser(user),
  });
});

app.patch('/api/auth/profile', authRequired, async (req, res) => {
  const updates = {};
  const rawName = req.body?.name;
  const rawPicture = req.body?.picture;

  if (typeof rawName === 'string') {
    const nextName = rawName.trim();
    if (nextName.length < MIN_NAME_LENGTH || nextName.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ message: `Name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters` });
    }
    const duplicatedNameUser = await getUserByDisplayName(nextName);
    if (duplicatedNameUser && duplicatedNameUser.id !== req.user.id) {
      return res.status(409).json({ message: DISPLAY_NAME_TAKEN_MESSAGE });
    }
    updates.name = nextName;
  }

  if (Object.hasOwn(req.body || {}, 'picture')) {
    const nextPicture = rawPicture ? String(rawPicture).trim() : '';
    updates.picture = nextPicture || null;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'No profile changes provided' });
  }

  const updatedUser = await updateUser(req.user.id, updates);
  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({ user: sanitizeUser(updatedUser) });
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

app.get('/api/user-data', authRequired, async (req, res) => {
  const userId = req.user.id;
  const saved = await getUserData(userId);
  res.json({ data: saved });
});

app.put('/api/user-data', authRequired, async (req, res) => {
  const userId = req.user.id;
  await saveUserData(userId, normalizeUserData(req.body));
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS') {
    res.status(403).json({ message: 'Origin not allowed by CORS' });
    return;
  }
  if (err?.type === 'entity.parse.failed' || err?.status === 400) {
    res.status(400).json({ message: 'Invalid JSON body' });
    return;
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  const storageWarning = getStorageWarning();
  if (storageWarning) {
    console.warn(storageWarning);
  }
  if (JWT_SECRET === 'dev-secret-change-me') {
    console.warn('Using default JWT_SECRET. Set JWT_SECRET in .env for production.');
  }
  if (isSupabaseConfigured()) {
    console.log('Using Supabase storage backend.');
  } else {
    console.warn('Using lowdb file storage backend. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for durable storage.');
  }
  if (!HAS_VAPID_KEYS) {
    console.warn('VAPID keys not configured. Push notifications are disabled.');
  }
  console.log(`Blue Study backend running on http://localhost:${PORT}`);
});
