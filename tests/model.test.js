import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, migrate, newBusiness, newPerson, isoDate, SCHEMA_VERSION, SHAREABLE } from '../js/core/model.js';

test('migrate(null) gives empty data', () => {
  assert.deepEqual(migrate(null), emptyData());
});

test('migrate keeps stored values and fills in missing ones', () => {
  const d = migrate({ me: { firstName: 'Jane' }, businesses: [{ id: 'b1' }], settings: { lastEvent: 'Expo' } });
  assert.equal(d.me.firstName, 'Jane');
  assert.equal(d.me.email, '');
  assert.equal(d.businesses.length, 1);
  assert.deepEqual(d.people, []);
  assert.equal(d.settings.lastEvent, 'Expo');
  assert.equal(d.settings.lastBackupAt, null);
  assert.equal(d.schemaVersion, SCHEMA_VERSION);
});

test('migrate replaces damaged lists with empty lists', () => {
  const d = migrate({ businesses: 'oops', people: null });
  assert.deepEqual(d.businesses, []);
  assert.deepEqual(d.people, []);
});

test('migrate rejects data from a newer version', () => {
  assert.throws(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 }), /newer version/);
});

test('newBusiness shares every field by default', () => {
  const b = newBusiness(3);
  assert.deepEqual(b.defaultFields, SHAREABLE);
  assert.equal(b.order, 3);
  assert.ok(b.id);
});

test('newPerson applies given fields over defaults', () => {
  const p = newPerson({ name: 'Sam', source: 'scanned' });
  assert.equal(p.name, 'Sam');
  assert.equal(p.source, 'scanned');
  assert.equal(p.notes, '');
  assert.ok(p.id && p.metAt);
});

test('isoDate uses the local calendar date', () => {
  assert.equal(isoDate(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});
