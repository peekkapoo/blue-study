import { JSONFilePreset } from 'lowdb/node';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DB = {
  users: [],
  userData: {},
};

let dbPromise;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getDbFilePath() {
  // Allow overriding DB path in production platforms if needed.
  if (process.env.DB_FILE_PATH) return process.env.DB_FILE_PATH;
  return path.join(__dirname, 'data', 'db.json');
}

export async function getDb() {
  if (!dbPromise) {
    const dbFilePath = getDbFilePath();
    await mkdir(path.dirname(dbFilePath), { recursive: true });
    dbPromise = JSONFilePreset(dbFilePath, DEFAULT_DB);
  }
  return dbPromise;
}

export const defaultUserPayload = {
  notes: [],
  tasks: [],
  categories: ['general', 'tech', 'language', 'skill'],
  lang: 'vi',
};
