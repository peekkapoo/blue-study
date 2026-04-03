import { createClient } from '@supabase/supabase-js';
import { JSONFilePreset } from 'lowdb/node';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB = {
  users: [],
  userData: {},
};

export const defaultUserPayload = {
  notes: [],
  tasks: [],
  categories: ['general', 'tech', 'language', 'skill'],
  lang: 'en',
  goals: [],
  studySessions: [],
  revisions: [],
  exams: [],
};

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const HAS_VALID_SUPABASE_URL = /^https?:\/\//i.test(SUPABASE_URL);
const SUPABASE_ENABLED = HAS_VALID_SUPABASE_URL && Boolean(SUPABASE_SERVICE_ROLE_KEY);

let dbPromise;
let supabaseClient;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDbFilePath() {
  // Allow overriding DB path in production platforms if needed.
  if (process.env.DB_FILE_PATH) return process.env.DB_FILE_PATH;
  return path.join(__dirname, 'data', 'db.json');
}

async function getLowdb() {
  if (!dbPromise) {
    const dbFilePath = getDbFilePath();
    await mkdir(path.dirname(dbFilePath), { recursive: true });
    dbPromise = JSONFilePreset(dbFilePath, DEFAULT_DB);
  }
  return dbPromise;
}

function getSupabase() {
  if (!SUPABASE_ENABLED) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseClient;
}

function normalizeUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash ?? row.passwordHash ?? null,
    provider: row.provider || 'local',
    picture: row.picture || null,
    createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  };
}

function toUserRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    password_hash: user.passwordHash ?? null,
    provider: user.provider || 'local',
    picture: user.picture || null,
    created_at: user.createdAt || new Date().toISOString(),
  };
}

function toUserPatchRow(updates = {}) {
  const row = {};
  if (Object.hasOwn(updates, 'name')) row.name = updates.name;
  if (Object.hasOwn(updates, 'email')) row.email = updates.email;
  if (Object.hasOwn(updates, 'passwordHash')) row.password_hash = updates.passwordHash;
  if (Object.hasOwn(updates, 'provider')) row.provider = updates.provider;
  if (Object.hasOwn(updates, 'picture')) row.picture = updates.picture;
  if (Object.hasOwn(updates, 'createdAt')) row.created_at = updates.createdAt;
  return row;
}

function toAppError(prefix, error) {
  const message = error?.message || String(error);
  return new Error(`${prefix}: ${message}`);
}

function cloneDefaultPayload() {
  return {
    notes: [],
    tasks: [],
    categories: ['general', 'tech', 'language', 'skill'],
    lang: 'en',
    goals: [],
    studySessions: [],
    revisions: [],
    exams: [],
  };
}

function normalizeUserDataPayload(payload = {}) {
  return {
    ...cloneDefaultPayload(),
    ...(payload && typeof payload === 'object' ? payload : {}),
  };
}

export function isSupabaseConfigured() {
  return SUPABASE_ENABLED;
}

export function getStorageWarning() {
  if (!SUPABASE_URL && !SUPABASE_SERVICE_ROLE_KEY) return '';
  if (!HAS_VALID_SUPABASE_URL) {
    return 'SUPABASE_URL is invalid. It must be your Project URL (https://...supabase.co), not a publishable key.';
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return 'SUPABASE_SERVICE_ROLE_KEY is missing. Backend cannot connect to Supabase.';
  }
  return '';
}

export async function getUserById(userId) {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw toAppError('Failed to load user by id', error);
    return normalizeUserRow(data);
  }

  const db = await getLowdb();
  return db.data.users.find((u) => u.id === userId) || null;
}

export async function getUserByEmail(email) {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw toAppError('Failed to load user by email', error);
    return normalizeUserRow(data);
  }

  const db = await getLowdb();
  return db.data.users.find((u) => u.email === email) || null;
}

export async function createUser(user) {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .insert(toUserRow(user))
      .select('*')
      .single();

    if (error) throw toAppError('Failed to create user', error);
    return normalizeUserRow(data);
  }

  const db = await getLowdb();
  db.data.users.push(user);
  await db.write();
  return user;
}

export async function updateUser(userId, updates) {
  if (SUPABASE_ENABLED) {
    const rowPatch = toUserPatchRow(updates);
    if (!Object.keys(rowPatch).length) return getUserById(userId);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .update(rowPatch)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) throw toAppError('Failed to update user', error);
    return normalizeUserRow(data);
  }

  const db = await getLowdb();
  const idx = db.data.users.findIndex((u) => u.id === userId);
  if (idx < 0) return null;

  db.data.users[idx] = {
    ...db.data.users[idx],
    ...updates,
  };
  await db.write();
  return db.data.users[idx];
}

export async function ensureUserData(userId) {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('user_data')
      .upsert({ user_id: userId, data: cloneDefaultPayload() }, { onConflict: 'user_id' });

    if (error) throw toAppError('Failed to ensure user data', error);
    return;
  }

  const db = await getLowdb();
  if (!db.data.userData[userId]) {
    db.data.userData[userId] = cloneDefaultPayload();
    await db.write();
  }
}

export async function getUserData(userId) {
  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw toAppError('Failed to fetch user data', error);
    if (!data?.data) {
      const defaults = cloneDefaultPayload();
      await saveUserData(userId, defaults);
      return defaults;
    }
    return normalizeUserDataPayload(data.data);
  }

  const db = await getLowdb();
  return normalizeUserDataPayload(db.data.userData[userId]);
}

export async function saveUserData(userId, payload) {
  const safePayload = normalizeUserDataPayload(payload);

  if (SUPABASE_ENABLED) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('user_data')
      .upsert({ user_id: userId, data: safePayload }, { onConflict: 'user_id' });

    if (error) throw toAppError('Failed to save user data', error);
    return;
  }

  const db = await getLowdb();
  db.data.userData[userId] = safePayload;
  await db.write();
}
