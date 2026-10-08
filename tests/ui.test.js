import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc } from '../js/ui.js';
import { safeFileName } from '../js/core/share.js';

test('esc makes scanned or typed text safe to put in HTML', () => {
  assert.equal(esc(`<img src=x onerror="alert('1')">&`), '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;');
});

test('esc turns missing values into empty text', () => {
  assert.equal(esc(undefined), '');
  assert.equal(esc(null), '');
  assert.equal(esc(0), '0');
});

test('safeFileName keeps accents and removes characters phones reject', () => {
  assert.equal(safeFileName('Zoë / Müller: "CEO"'), 'Zoë  Müller CEO');
  assert.equal(safeFileName('  ??  '), 'contact');
});
