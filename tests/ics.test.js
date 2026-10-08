import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followUpIcs } from '../js/core/ics.js';

const person = { id: 'p1', name: 'Ann; Smith', company: 'A Co', phone: '082', email: '', event: 'Expo', notes: 'Line1\nLine2', followUpDate: '2026-10-31' };

test('an all-day event on the follow-up date with a 9am reminder', () => {
  const ics = followUpIcs(person, new Date('2026-10-08T10:00:00Z'));
  for (const line of [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'UID:p1-20261031@connecta', 'DTSTAMP:20261008T100000Z',
    'DTSTART;VALUE=DATE:20261031', 'DTEND;VALUE=DATE:20261101', 'SUMMARY:Follow up: Ann\\; Smith',
    'DESCRIPTION:Company: A Co\\nPhone: 082\\nMet at: Expo\\nNotes: Line1\\nLine2', 'TRIGGER:PT9H', 'END:VCALENDAR',
  ]) assert.ok(ics.includes(line + '\r\n'), line);
});

test('a follow-up date is required', () => {
  assert.throws(() => followUpIcs({ ...person, followUpDate: '' }), /follow-up date/);
});
