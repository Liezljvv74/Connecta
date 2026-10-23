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
  assert.equal(p.company, 'OUTSURANCE');
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

test('Johan Southey card: the name comes from the email, the company from its domain, icons are cleaned off the phone', () => {
  const p = parseCardText(lines(
    ['JOHAN SOUTHEY', 19], ['Partner | Certified Business Coach', 20], ['ActionCOACH Hermanus', 15],
    ['9 54 Crescent', 19], ['Vermont, Hermanus 7201', 19], ['0 082 496 7019 ActionCOACH', 31], ['action COACH', 60],
    ['@ johansouthey@actioncoach.com', 20], ['@ johansouthey.actioncoach.com', 21],
  ));
  assert.equal(p.name, 'JOHAN SOUTHEY');
  assert.equal(p.company, 'ActionCOACH Hermanus');
  assert.equal(p.phone, '082 496 7019');
  assert.equal(p.email, 'johansouthey@actioncoach.com');
  assert.equal(p.website, 'johansouthey.actioncoach.com');
});

test('a dot read after the area code is not kept in the phone number', () => {
  assert.equal(parseCardText(lines(['Jane Smith', 30], ['082. 496 7019', 18])).phone, '082 496 7019');
  assert.equal(parseCardText(lines(['Jane Smith', 30], ['Tel 1 800 555 1234', 18])).phone, '1 800 555 1234');
});

test('a gmail address is not a company', () => {
  assert.equal(parseCardText(lines(['Jane Smith', 30], ['jane.smith@gmail.com', 18])).company, '');
});

test('stray icon characters are cleaned off the name and company; the address stays in Other details', () => {
  const p = parseCardText(lines(['JOHAN SOUTHEY 4', 19], ['ActionCOACH Hermanus -', 15], ['9 54 Stormvoël Crescent', 19],
    ['johansouthey@actioncoach.com', 20]));
  assert.equal(p.name, 'JOHAN SOUTHEY');
  assert.equal(p.company, 'ActionCOACH Hermanus');
  assert.match(p.extra, /^54 Stormvoël Crescent$/m);
});

test('icons read at the edges of a line are stripped from Other details, real text is kept', () => {
  const p = parseCardText(lines(['JOHAN SOUTHEY', 19], ['9 54 Stormvoël Crescent', 19], ['14612 Falkensee j', 19],
    ['| Tel. 03322 1213996 / Fax 03322 1213997', 19], ['| und nach Vereinbarung ;', 19], ['9 Main Road', 19], ['Suite 4', 19],
    ['Mo. + Do. 8:30-13:30 Uhr', 19], ['0 082 496 7019 ActionCOACH', 19]));
  assert.deepEqual(p.extra.split('\n'), ['54 Stormvoël Crescent', '14612 Falkensee', 'Tel. 03322 1213996 / Fax 03322 1213997',
    'und nach Vereinbarung', '9 Main Road', 'Suite 4', 'Mo. + Do. 8:30-13:30 Uhr', '082 496 7019 ActionCOACH']);
});

test('icons read as a capital letter or a letter stuck to a symbol are stripped from the start of Other details lines', () => {
  const p = parseCardText(lines(['JOHAN SOUTHEY', 19],
    ['O 54 Stormvoël Crescent', 19], ['Q Vermont, Hermanus 7201', 19], ['(J 082 496 7019 ActionCOACH', 19],
    ['©a Partner | Certified Business Coach', 19], ['G J) Roadside assistance 08 600 80 000', 19], ['14612 Falkensee (J', 19],
    // real text that must stay
    ['Dr Smith & Partners', 19], ['PO Box 1234', 19], ['De Waal Drive 5', 19], ['5 Main Road', 19], ['Unit A', 19], ['Mo. + Do. 8:30 Uhr', 19]));
  assert.deepEqual(p.extra.split('\n'), ['54 Stormvoël Crescent', 'Vermont, Hermanus 7201', '082 496 7019 ActionCOACH',
    'Partner | Certified Business Coach', 'Roadside assistance 08 600 80 000', '14612 Falkensee',
    'Dr Smith & Partners', 'PO Box 1234', 'De Waal Drive 5', '5 Main Road', 'Unit A', 'Mo. + Do. 8:30 Uhr']);
});
