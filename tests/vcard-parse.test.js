import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScanned } from '../js/core/vcard.js';

test('reads a vCard 3.0 card', () => {
  const p = parseScanned('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nORG:Acme\\, Inc;Sales\r\nTITLE:CEO\r\n' +
    'TEL;TYPE=CELL:+27 82 1\r\nTEL;TYPE=WORK:011 2\r\nEMAIL:jane@acme.com\r\nURL:https://acme.com\r\n' +
    'ADR:;;1 Main Rd;Cape Town;;8001;ZA\r\nEND:VCARD');
  assert.deepEqual(p, {
    name: 'Jane Doe', company: 'Acme, Inc', phone: '+27 82 1', email: 'jane@acme.com', website: 'https://acme.com',
    extra: 'Title: CEO\nPhone: 011 2\nAddress: 1 Main Rd, Cape Town, 8001, ZA',
  });
});

test('uses N when FN is missing, unfolds lines and reads vCard 4 tel: values', () => {
  const p = parseScanned('BEGIN:VCARD\nVERSION:4.0\nN:Smith;Bob\nTEL;VALUE=uri:tel:+1555\nEMAIL:bob@exa\n mple.com\nEND:VCARD');
  assert.equal(p.name, 'Bob Smith');
  assert.equal(p.phone, '+1555');
  assert.equal(p.email, 'bob@example.com');
});

test('reads Apple-style grouped properties', () => {
  assert.equal(parseScanned('BEGIN:VCARD\nFN:Al\nitem1.EMAIL;type=INTERNET:al@x.com\nEND:VCARD').email, 'al@x.com');
});

test('decodes older vCard 2.1 quoted-printable text, including soft line breaks', () => {
  const p = parseScanned('BEGIN:VCARD\r\nVERSION:2.1\r\n' +
    'N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:M=C3=BCller;Zo=C3=AB\r\n' +
    'ORG;QUOTED-PRINTABLE:Caf=C3=A9 Co\r\n' +
    'NOTE;ENCODING=QUOTED-PRINTABLE:Line one=0Aline =\r\ntwo\r\n' +
    'TEL;CELL:0821\r\nEND:VCARD');
  assert.equal(p.name, 'Zoë Müller');
  assert.equal(p.company, 'Café Co');
  assert.equal(p.phone, '0821');
  assert.equal(p.extra, 'Note: Line one\nline two');
});

test('decodes quoted-printable in the charset the card names', () => {
  const p = parseScanned('BEGIN:VCARD\r\nVERSION:2.1\r\nFN;CHARSET=ISO-8859-1;ENCODING=QUOTED-PRINTABLE:Zo=EB\r\nEND:VCARD');
  assert.equal(p.name, 'Zoë');
});

test('reads a MECARD', () => {
  assert.deepEqual(parseScanned('MECARD:N:Doe,Jane;TEL:0821;EMAIL:j@d.com;URL:https\\://d.com;ORG:Doe Co;;'), {
    name: 'Jane Doe', company: 'Doe Co', phone: '0821', email: 'j@d.com', website: 'https://d.com', extra: '',
  });
});

test('returns null for anything that is not a contact card', () => {
  assert.equal(parseScanned('https://example.com'), null);
  assert.equal(parseScanned(''), null);
  assert.equal(parseScanned(undefined), null);
});

test('keeps hostile text as plain text (escaping happens when shown)', () => {
  assert.equal(parseScanned('BEGIN:VCARD\nFN:<img src=x onerror=alert(1)>\nEND:VCARD').name, '<img src=x onerror=alert(1)>');
});
