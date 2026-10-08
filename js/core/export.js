// "People I met" export to Excel or CSV (spec §3.4).
import { isoDate } from './model.js';

const CONTACT_COLUMNS = [['Company', 'company'], ['Phone', 'phone'], ['Email', 'email'], ['Website', 'website'], ['Other details', 'extra']];
const NOTE_COLUMNS = [
  ['Event', 'event'], ['Notes', 'notes'], ['Follow-up date', 'followUpDate'],
  ['Date met', p => (p.metAt ? isoDate(new Date(p.metAt)) : '')],
  ['Business card given', 'sharedBusinessName'], ['How added', 'source'],
];

export const eventsIn = people =>
  [...new Set(people.map(p => (p.event || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export function exportRows(people, { contacts = true, notes = true, event = '' } = {}) {
  if (!contacts && !notes) throw new Error('Choose contact details, event notes, or both.');
  const columns = [['Name', 'name'], ...(contacts ? CONTACT_COLUMNS : []), ...(notes ? NOTE_COLUMNS : [])];
  const chosen = people
    .filter(p => !event || (p.event || '').trim() === event)
    .sort((a, b) => (a.metAt || '').localeCompare(b.metAt || ''));
  const cell = (p, get) => String((typeof get === 'function' ? get(p) : p[get]) ?? '');
  return [columns.map(c => c[0]), ...chosen.map(p => columns.map(([, get]) => cell(p, get)))];
}

// Scanned cards are untrusted: stop spreadsheet apps running text as a formula.
// Phone numbers like "+27 82 555" (digits, spaces, brackets, +, -) are left alone.
const looksLikeFormula = v => /^[=@\t\r]/.test(v) || /^[+-].*[^\d\s()+-]/.test(v);

export function toCsv(rows) {
  const field = v => {
    const s = looksLikeFormula(v) ? `'${v}` : v;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map(r => r.map(field).join(',')).join('\r\n') + '\r\n';
}

// All values are strings, so Excel stores them as text: leading zeros and + stay put.
export function toXlsx(rows, XLSX = globalThis.XLSX) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'People');
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' });
}

export function exportFileName(ext, event = '', now = new Date()) {
  const slug = event.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `connecta-people-${slug ? slug + '-' : ''}${isoDate(now)}.${ext}`;
}
