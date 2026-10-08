import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// The app's colours come from the logo blue (#527AC2): bands 40% lighter, text 40% darker.
test('none of the old green is left in the app', () => {
  for (const f of ['css/app.css', 'index.html', 'manifest.webmanifest', 'tools/make-icons.mjs']) {
    assert.ok(!/0f766e|15, 118, 110/i.test(read(f)), `${f} still uses the old green`);
  }
});

test('bands use the light blue and text uses the dark blue', () => {
  const css = read('css/app.css');
  assert.match(css, /--brand: #97afda;/);
  assert.match(css, /--brand-text: #314974;/);
  assert.match(css, /\.brand-logo \{[^}]*background: var\(--brand\)/);
});
