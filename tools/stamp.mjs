// Writes the current app fingerprint into sw.js. Run after any change: npm run stamp
import { writeFileSync } from 'node:fs';
import { readSw, buildHash } from './build-hash.mjs';

const sw = readSw();
const hash = buildHash(sw);
writeFileSync(new URL('../sw.js', import.meta.url), sw.replace(/const BUILD = '[^']*';/, `const BUILD = '${hash}';`));
console.log(`sw.js stamped: ${hash}`);
