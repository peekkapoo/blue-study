import { JSONFilePreset } from 'lowdb/node';

const DEFAULT_DB = {
  users: [],
  userData: {},
};

let dbPromise;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = JSONFilePreset('server/data/db.json', DEFAULT_DB);
  }
  return dbPromise;
}

export const defaultUserPayload = {
  notes: [],
  tasks: [],
  categories: ['general', 'tech', 'language', 'skill'],
  lang: 'vi',
};
