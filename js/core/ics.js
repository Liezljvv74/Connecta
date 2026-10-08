// Calendar file for a follow-up reminder. The app has no server, so the phone's calendar does the reminding.
import { isoDate } from './model.js';

const esc = v => String(v).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
const compact = date => date.replace(/-/g, '');

export function followUpIcs(person, now = new Date()) {
  const start = person.followUpDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) throw new Error('Set a follow-up date first.');
  const end = new Date(`${start}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const title = esc(`Follow up: ${person.name}`);
  const details = [
    person.company && `Company: ${person.company}`,
    person.phone && `Phone: ${person.phone}`,
    person.email && `Email: ${person.email}`,
    person.event && `Met at: ${person.event}`,
    person.notes && `Notes: ${person.notes}`,
  ].filter(Boolean).join('\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Connecta//EN', 'BEGIN:VEVENT',
    `UID:${person.id}-${compact(start)}@connecta`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART;VALUE=DATE:${compact(start)}`,
    `DTEND;VALUE=DATE:${compact(isoDate(end))}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${esc(details)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'TRIGGER:PT9H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
