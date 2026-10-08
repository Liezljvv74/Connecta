import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { QR_MAX_BYTES, byteLength, fitsQr, qrSvg } from '../js/core/qr.js';
import { buildVCard } from '../js/core/vcard.js';
import { buildCard } from '../js/core/card.js';
import { MAX_LENGTHS, SHAREABLE } from '../js/core/model.js';

const qrcode = createRequire(import.meta.url)('../vendor/qrcode.js');

test('byteLength counts UTF-8 bytes, not characters', () => {
  assert.equal(byteLength('abc'), 3);
  assert.equal(byteLength('Zoë'), 4);
  assert.equal(byteLength('😀'), 4);
});

test('fitsQr allows up to QR_MAX_BYTES bytes', () => {
  assert.ok(fitsQr('a'.repeat(QR_MAX_BYTES)));
  assert.ok(!fitsQr('a'.repeat(QR_MAX_BYTES + 1)));
  assert.ok(!fitsQr('é'.repeat(QR_MAX_BYTES / 2 + 1)));
});

test('qrSvg draws a scalable SVG, including non-English text', () => {
  const svg = qrSvg('BEGIN:VCARD\r\nFN:Zoë Müller\r\nEND:VCARD\r\n', qrcode);
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox'));
});

test('a card with every field at its character limit still fits the QR code', () => {
  const full = key => 'x'.repeat(MAX_LENGTHS[key]);
  const me = Object.fromEntries(['firstName', 'lastName', 'mobile', 'workPhone', 'email', 'website', 'address', 'social'].map(k => [k, full(k)]));
  const biz = { name: full('name'), title: full('title'), overrides: {}, defaultFields: SHAREABLE };
  assert.ok(fitsQr(buildVCard(buildCard(me, biz))));
});

test('qrSvg handles the largest allowed card', () => {
  assert.ok(qrSvg('a'.repeat(QR_MAX_BYTES), qrcode).startsWith('<svg'));
});
