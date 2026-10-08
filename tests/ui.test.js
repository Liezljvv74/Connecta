import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, canReloadNow, keepScreenAwake } from '../js/ui.js';

const tick = () => new Promise(r => setTimeout(r, 0));
const fakeScreenDoc = { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} };

test('the screen lock is released when leaving the Share screen', async () => {
  let released = 0;
  const nav = { wakeLock: { request: async () => ({ release: async () => { released++; } }) } };
  const stop = keepScreenAwake(nav, fakeScreenDoc);
  await tick();
  stop();
  assert.equal(released, 1);
});

test('a screen lock granted after leaving the Share screen is released straight away', async () => {
  let grant;
  let released = 0;
  const nav = { wakeLock: { request: () => new Promise(r => { grant = r; }) } };
  const stop = keepScreenAwake(nav, fakeScreenDoc);
  stop();
  grant({ release: async () => { released++; } });
  await tick();
  assert.equal(released, 1);
});

test('phones without a screen lock are fine', () => {
  const stop = keepScreenAwake({}, fakeScreenDoc);
  stop();
});

const fakeDoc = ({ hidden = false, open = null, focused = null } = {}) => ({
  hidden,
  querySelector: sel => (sel === 'dialog[open], form#person' ? open : null),
  activeElement: focused && { matches: sel => sel === 'input, textarea, select' && focused },
});

test('an app update waits while someone is typing or in a dialog or a person form', () => {
  assert.equal(canReloadNow(fakeDoc({ focused: true })), false);
  assert.equal(canReloadNow(fakeDoc({ open: {} })), false);
});

test('an app update reloads when the app is idle or hidden', () => {
  assert.equal(canReloadNow(fakeDoc()), true);
  assert.equal(canReloadNow(fakeDoc({ hidden: true, focused: true, open: {} })), true);
});
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
