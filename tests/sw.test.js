import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { APP_VERSION } from '../js/version.js';
import { buildHash } from '../tools/build-hash.mjs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const start = sw.indexOf('const FILES = [');
const listed = [...sw.slice(start, sw.indexOf('];', start)).matchAll(/'([^']+)'/g)].map(m => m[1]).filter(f => f !== './');
const DIRS = ['css', 'js', 'js/core', 'js/screens', 'vendor', 'icons', 'Public'];
const onDisk = ['index.html', 'manifest.webmanifest',
  ...DIRS.flatMap(dir => readdirSync(new URL(`${dir}/`, root)).filter(n => /\.(js|css|png|svg)$/.test(n)).map(n => `${dir}/${n}`))];

test('every app file is cached for offline use', () => {
  for (const f of onDisk) assert.ok(listed.includes(f), `${f} is missing from sw.js FILES`);
});

test('every cached file exists', () => {
  for (const f of listed) assert.ok(existsSync(new URL(f, root)), `${f} is listed in sw.js but does not exist`);
});

test('the cache name matches the app version', () => {
  assert.ok(sw.includes(`const VERSION = 'connecta-${APP_VERSION}';`));
});

test('sw.js is stamped for the current code (run "npm run stamp" after changing any app file)', () => {
  assert.ok(sw.includes(`const BUILD = '${buildHash(sw)}';`), 'app files changed since the last stamp: run npm run stamp');
});
