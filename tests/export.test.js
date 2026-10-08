import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { exportRows, eventsIn, toCsv, toXlsx, exportFileName } from '../js/core/export.js';

const XLSX = createRequire(import.meta.url)('../vendor/xlsx.mini.min.js');

const people = [
  { id: '1', name: 'Ann', company: 'A Co', phone: '0821234567', email: 'ann@a.co', website: '', extra: '', event: 'Expo',
    notes: 'Wants quote', followUpDate: '2026-10-15', sharedBusinessName: 'Acme', metAt: new Date(2026, 9, 8, 9).toISOString(), source: 'shared' },
  { id: '2', name: 'Bob', company: '', phone: '+27 82 555 0000', email: '', website: '', extra: '', event: 'Breakfast',
    notes: '=HYPERLINK("http://evil")', followUpDate: '', sharedBusinessName: 'Acme', metAt: new Date(2026, 9, 7, 9).toISOString(), source: 'scanned' },
];

test('contacts and notes: every column, oldest first', () => {
  const rows = exportRows(people, { contacts: true, notes: true });
  assert.deepEqual(rows[0], ['Name', 'Company', 'Phone', 'Email', 'Website', 'Other details',
    'Event', 'Notes', 'Follow-up date', 'Date met', 'Business card given', 'How added']);
  assert.deepEqual(rows.map(r => r[0]), ['Name', 'Bob', 'Ann']);
  assert.equal(rows[2][9], '2026-10-08');
});

test('contacts only', () => {
  assert.deepEqual(exportRows(people, { contacts: true, notes: false })[0], ['Name', 'Company', 'Phone', 'Email', 'Website', 'Other details']);
});

test('notes only still includes the name', () => {
  assert.deepEqual(exportRows(people, { contacts: false, notes: true })[0],
    ['Name', 'Event', 'Notes', 'Follow-up date', 'Date met', 'Business card given', 'How added']);
});

test('choosing neither is an error', () => {
  assert.throws(() => exportRows(people, { contacts: false, notes: false }), /Choose/);
});

test('filtering to one event', () => {
  assert.deepEqual(exportRows(people, { event: 'Expo' }).slice(1).map(r => r[0]), ['Ann']);
});

test('eventsIn lists unique events alphabetically', () => {
  assert.deepEqual(eventsIn([...people, { event: ' Expo ' }, { event: '' }, {}]), ['Breakfast', 'Expo']);
});

test('CSV: BOM, quoting, formula guard, phone numbers untouched', () => {
  const csv = toCsv([['Name', 'Notes', 'Phone'], ['Ann "A"', 'a,b', '+27 82 555'], ['Bob', '=HYPERLINK("x")', '0821']]);
  assert.ok(csv.startsWith('﻿Name,Notes,Phone\r\n'));
  assert.ok(csv.includes('"Ann ""A""","a,b",+27 82 555\r\n'));
  assert.ok(csv.includes(`Bob,"'=HYPERLINK(""x"")",0821\r\n`));
});

test('Excel keeps phone numbers and formula-looking notes as text', () => {
  const sheet = XLSX.read(toXlsx(exportRows(people, {}), XLSX), { type: 'array' }).Sheets.People;
  assert.equal(sheet.C2.t, 's');
  assert.equal(sheet.C2.v, '+27 82 555 0000');
  assert.equal(sheet.C3.v, '0821234567');
  assert.equal(sheet.H2.t, 's');
  assert.equal(sheet.H2.f, undefined);
});

test('exportFileName', () => {
  assert.equal(exportFileName('xlsx', '', new Date(2026, 9, 8)), 'connecta-people-2026-10-08.xlsx');
  assert.equal(exportFileName('csv', 'Chamber Breakfast 8 Oct', new Date(2026, 9, 8)), 'connecta-people-chamber-breakfast-8-oct-2026-10-08.csv');
});
