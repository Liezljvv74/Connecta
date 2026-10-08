// The only module that touches IndexedDB. Everything is stored on this phone only.
import { migrate } from './model.js';

const DB_NAME = 'connecta';
const STORE = 'kv';
const PARTS = ['schemaVersion', 'me', 'businesses', 'people', 'settings'];

let opening;
function db() {
  return (opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function run(mode, work) {
  return db().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, mode);
    work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  }));
}

export async function loadAll() {
  const raw = {};
  await run('readonly', store => {
    for (const key of PARTS) store.get(key).onsuccess = e => { if (e.target.result !== undefined) raw[key] = e.target.result; };
  });
  return migrate(Object.keys(raw).length ? raw : null);
}

export const savePart = (key, value) => run('readwrite', store => store.put(value, key));

// One transaction: either everything is replaced or nothing is.
export const replaceAll = data => run('readwrite', store => { for (const key of PARTS) store.put(data[key], key); });

export const clearAll = () => run('readwrite', store => store.clear());

// Asks the browser not to clear our data when space is low. Not guaranteed, hence backups.
export const requestPersist = () => navigator.storage?.persist?.().catch(() => false) ?? Promise.resolve(false);
