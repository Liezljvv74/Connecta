// Backup and restore files (spec §5).
import { SCHEMA_VERSION, migrate, isoDate } from './model.js';

export function makeBackup(data, now = new Date()) {
  const { me, businesses, people, settings } = data;
  return JSON.stringify({ app: 'connecta', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), me, businesses, people, settings });
}

// Returns the data to restore, or throws with a message for the user. Never touches storage.
export function readBackup(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not a Connecta backup (it could not be read).');
  }
  if (raw?.app !== 'connecta') throw new Error('This file is not a Connecta backup.');
  const data = migrate(raw); // throws first for files from a newer version
  if (!looksIntact(raw)) throw new Error('This backup file is damaged.');
  return data;
}

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isId = v => typeof v === 'string' && /^[\w-]+$/.test(v); // ids end up in HTML attributes
const isBusiness = b => isObject(b) && isId(b.id) && isObject(b.overrides) && Array.isArray(b.defaultFields);

// A file that parses but would break the app (or empty it) is refused, never restored.
function looksIntact(raw) {
  return isObject(raw.me) && isObject(raw.settings)
    && Array.isArray(raw.businesses) && raw.businesses.every(isBusiness)
    && Array.isArray(raw.people) && raw.people.every(p => isObject(p) && isId(p.id));
}

export const backupFileName = (now = new Date()) => `connecta-backup-${isoDate(now)}.json`;

export function backupSummary(data) {
  const b = data.businesses.length;
  const p = data.people.length;
  return `${b} business${b === 1 ? '' : 'es'}, ${p} ${p === 1 ? 'person' : 'people'}`;
}

export const lastBackupText = lastBackupAt =>
  lastBackupAt ? `Last backup: ${new Date(lastBackupAt).toLocaleDateString()}` : 'Never backed up';
