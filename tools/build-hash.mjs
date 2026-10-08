// Fingerprint of every app file listed in sw.js, so any code change forces a new cache (and an update on phones).
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);

export const readSw = () => readFileSync(new URL('sw.js', root), 'utf8');

export function cachedFiles(sw = readSw()) {
  const start = sw.indexOf('const FILES = [');
  return [...sw.slice(start, sw.indexOf('];', start)).matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
}

export function buildHash(sw = readSw()) {
  const hash = createHash('sha256');
  for (const file of cachedFiles(sw)) {
    hash.update(file);
    hash.update(readFileSync(new URL(file, root)).filter(b => b !== 13)); // ignore CR so Windows line endings don't matter
  }
  return hash.digest('hex').slice(0, 12);
}
