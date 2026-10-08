import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVCard, plainText, personVCard } from '../js/core/vcard.js';

const card = {
  firstName: 'Zoë', lastName: 'Müller', org: 'Acme, Inc; Ltd', title: 'Owner',
  mobile: '+27 82 123 4567', email: 'zoe@acme.com', website: 'https://acme.com',
  address: '1 Main Rd\nCape Town',
  photo: 'data:image/jpeg;base64,' + 'A'.repeat(200),
  logo: 'data:image/png;base64,QkJC',
};

test('QR vCard has the core lines, escaped, with CRLF endings', () => {
  const v = buildVCard(card);
  assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
  assert.ok(v.endsWith('END:VCARD\r\n'));
  for (const line of [
    'N:Müller;Zoë;;;',
    'FN:Zoë Müller',
    'ORG:Acme\\, Inc\\; Ltd',
    'TITLE:Owner',
    'TEL;TYPE=CELL:+27 82 123 4567',
    'EMAIL;TYPE=INTERNET:zoe@acme.com',
    'URL:https://acme.com',
    'ADR;TYPE=WORK:;;1 Main Rd\\nCape Town;;;;',
  ]) assert.ok(v.includes(line + '\r\n'), line);
  assert.ok(!v.includes('PHOTO') && !v.includes('LOGO'));
});

test('file vCard includes photo and logo, folded to 75 characters', () => {
  const v = buildVCard(card, { withImages: true });
  assert.ok(v.includes('LOGO;ENCODING=b;TYPE=PNG:QkJC'));
  for (const line of v.split('\r\n')) {
    assert.ok(line.length <= 75 || /[^\x00-\x7f]/.test(line), `line too long: ${line.slice(0, 30)}`);
  }
  assert.ok(v.replace(/\r\n /g, '').includes('PHOTO;ENCODING=b;TYPE=JPEG:' + 'A'.repeat(200)));
});

test('missing fields produce no empty lines', () => {
  const v = buildVCard({ firstName: 'Sam', lastName: '', org: 'Solo' });
  assert.ok(v.includes('FN:Sam\r\n'));
  assert.ok(!v.includes('TEL') && !v.includes('EMAIL') && !v.includes('TITLE'));
});

test('plainText lays out details for a message', () => {
  assert.equal(
    plainText({ firstName: 'Zoë', lastName: 'Müller', org: 'Acme', title: 'Owner', mobile: '+27 82', email: 'z@a.com' }),
    'Zoë Müller\nOwner, Acme\n\nMobile: +27 82\nEmail: z@a.com',
  );
});

test('personVCard turns a logged person into a contact with notes', () => {
  const v = personVCard({
    name: 'Jane van der Merwe', company: 'Beta', phone: '083', email: 'j@b.com', website: '',
    extra: 'Title: CFO', event: 'Expo', notes: 'Wants a quote',
  });
  for (const line of ['N:van der Merwe;Jane;;;', 'ORG:Beta', 'TEL;TYPE=CELL:083', 'EMAIL;TYPE=INTERNET:j@b.com',
    'NOTE:Met at: Expo\\nWants a quote\\nTitle: CFO']) assert.ok(v.includes(line + '\r\n'), line);
});
