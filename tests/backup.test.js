import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, readBackup, backupFileName, backupSummary, lastBackupText } from '../js/core/backup.js';
import { emptyData, migrate, SCHEMA_VERSION } from '../js/core/model.js';

const data = {
  ...emptyData(),
  me: { ...emptyData().me, firstName: 'Jane', photo: 'data:image/jpeg;base64,AAA' },
  businesses: [{ id: 'b1', name: 'Acme', logo: 'data:image/png;base64,BBB', title: '', overrides: {}, defaultFields: ['mobile'], order: 0 }],
  people: [{ id: 'p1', name: 'Sam' }],
};

test('a backup round-trips everything, including images', () => {
  assert.deepEqual(readBackup(makeBackup(data)), migrate(data));
});

test('the backup records app, version and time', () => {
  const raw = JSON.parse(makeBackup(data, new Date('2026-10-08T10:00:00Z')));
  assert.equal(raw.app, 'connecta');
  assert.equal(raw.schemaVersion, SCHEMA_VERSION);
  assert.equal(raw.exportedAt, '2026-10-08T10:00:00.000Z');
});

test('rejects a file that is not JSON', () => {
  assert.throws(() => readBackup('not json{'), /not a Connecta backup/);
});

test('rejects JSON from something else', () => {
  assert.throws(() => readBackup('{"hello":1}'), /not a Connecta backup/);
  assert.throws(() => readBackup('null'), /not a Connecta backup/);
});

test('rejects a cut-off backup', () => {
  const text = makeBackup(data);
  assert.throws(() => readBackup(text.slice(0, text.length / 2)), /not a Connecta backup/);
});

test('rejects a backup from a newer app version', () => {
  assert.throws(() => readBackup(JSON.stringify({ app: 'connecta', schemaVersion: SCHEMA_VERSION + 1 })), /newer version/);
});

test('rejects a backup whose lists are damaged instead of restoring nothing', () => {
  const bad = { app: 'connecta', schemaVersion: SCHEMA_VERSION, me: {}, settings: {}, people: [] };
  assert.throws(() => readBackup(JSON.stringify({ ...bad, businesses: 'oops' })), /damaged/);
  assert.throws(() => readBackup(JSON.stringify({ ...bad, businesses: [], people: null })), /damaged/);
  assert.throws(() => readBackup(JSON.stringify({ ...bad, businesses: [], me: 'x' })), /damaged/);
});

test('rejects a backup with a broken business entry', () => {
  const base = { app: 'connecta', schemaVersion: SCHEMA_VERSION, me: {}, settings: {}, people: [] };
  assert.throws(() => readBackup(JSON.stringify({ ...base, businesses: [{ id: 'b1', name: 'Acme' }] })), /damaged/);
  assert.throws(() => readBackup(JSON.stringify({ ...base, businesses: [{ id: '"><img src=x>', name: 'A', overrides: {}, defaultFields: [] }] })), /damaged/);
  assert.throws(() => readBackup(JSON.stringify({ ...base, businesses: [], people: [{ id: 'x" onclick="y', name: 'Sam' }] })), /damaged/);
});

test('backupFileName uses the local date', () => {
  assert.equal(backupFileName(new Date(2026, 9, 8, 23, 59)), 'connecta-backup-2026-10-08.json');
});

test('backupSummary counts businesses and people', () => {
  assert.equal(backupSummary(migrate(data)), '1 business, 1 person');
  assert.equal(backupSummary(emptyData()), '0 businesses, 0 people');
});

test('lastBackupText warns when there has never been a backup', () => {
  assert.equal(lastBackupText(null), 'Never backed up');
  assert.match(lastBackupText('2026-10-08T10:00:00Z'), /^Last backup: /);
});
