import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCardText } from '../js/core/cardtext.js';

const lines = (...rows) => rows.map(([text, height]) => ({ text, height }));

test('reads a typical card: icons, a big name, a roadside number that is not the phone', () => {
  const p = parseCardText(lines(
    ['Harold Allen', 40], ['OUTSURANCE BROKER', 20],
    ['(J 082 466 0827', 24], ['® allenh@out.co.za', 24], ['@ outsurance.co.za', 24],
    ['ROADSIDE ASSISTANCE: 08 600 80 000', 18], ['OUT', 90],
  ));
  assert.equal(p.name, 'Harold Allen');
  assert.equal(p.phone, '082 466 0827');
  assert.equal(p.email, 'allenh@out.co.za');
  assert.equal(p.website, 'outsurance.co.za');
  assert.equal(p.company, 'Outsurance');
  assert.equal(p.extra, 'OUTSURANCE BROKER\nROADSIDE ASSISTANCE: 08 600 80 000\nOUT');
});

test('takes the Tel number, never the fax, and keeps the address and hours', () => {
  const p = parseCardText(lines(
    ['Dr. med. Ute Kariger-Schweigert', 30], ['Augenarztin', 20], ['Strasse der Einheit 127a', 20], ['14612 Falkensee', 20],
    ['Tel. 03322 1213996 / Fax 03322 1213997', 20], ['www.augenarzt-falkensee.de', 20], ['Mo. + Do. 8:30-13:30 Uhr', 20],
  ));
  assert.equal(p.name, 'Dr. med. Ute Kariger-Schweigert');
  assert.equal(p.phone, '03322 1213996');
  assert.equal(p.website, 'www.augenarzt-falkensee.de');
  assert.match(p.extra, /14612 Falkensee/);
  assert.match(p.extra, /Fax 03322 1213997/);
  assert.doesNotMatch(p.extra, /augenarzt-falkensee\.de/);
});

test('a company line with Pty Ltd wins over the website guess', () => {
  const p = parseCardText(lines(['Jane Smith', 30], ['Acme Widgets (Pty) Ltd', 18], ['acme.co.za', 18]));
  assert.equal(p.company, 'Acme Widgets (Pty) Ltd');
});

test('nothing readable gives empty fields', () => {
  assert.deepEqual(parseCardText([]), { name: '', company: '', phone: '', email: '', website: '', extra: '' });
});

test('an email or website with "group" in it is not taken as the company', () => {
  const p = parseCardText(lines(['Jane Smith', 30], ['jane@acme-group.com', 18], ['www.smith-holdings.co.za', 18]));
  assert.equal(p.company, 'Smith-holdings');
  assert.equal(p.email, 'jane@acme-group.com');
});

test('a title read without its space ("Dr.Ute") is still the name, not a website', () => {
  const p = parseCardText(lines(['Dr.Ute Kariger', 30], ['Augenarztin', 18]));
  assert.equal(p.name, 'Dr.Ute Kariger');
  assert.equal(p.website, '');
  assert.equal(p.company, '');
});

test('a website on the same line as the email is found', () => {
  const p = parseCardText(lines(['Jane Smith', 30], ['jane@acme.co.za | www.acme.co.za', 18]));
  assert.equal(p.website, 'www.acme.co.za');
  assert.equal(p.company, 'Acme');
});
