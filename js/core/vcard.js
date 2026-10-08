// Contact cards (vCard 3.0): build them to share, read them when scanned.

const esc = v => String(v)
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

// vCard lines should be at most 75 characters. Only the long base64 image lines need it,
// and those are plain ASCII, so splitting by character is safe.
function fold(line) {
  if (line.length <= 75 || /[^\x00-\x7f]/.test(line)) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
  return parts.join('\r\n');
}

function imageLine(prop, dataUrl) {
  const m = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl || '');
  return m ? `${prop};ENCODING=b;TYPE=${m[1].toUpperCase()}:${m[2]}` : null;
}

export function buildVCard(card, { withImages = false } = {}) {
  const first = card.firstName || '';
  const last = card.lastName || '';
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(last)};${esc(first)};;;`, `FN:${esc([first, last].filter(Boolean).join(' '))}`];
  if (card.org) lines.push(`ORG:${esc(card.org)}`);
  if (card.title) lines.push(`TITLE:${esc(card.title)}`);
  if (card.mobile) lines.push(`TEL;TYPE=CELL:${esc(card.mobile)}`);
  if (card.workPhone) lines.push(`TEL;TYPE=WORK:${esc(card.workPhone)}`);
  if (card.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(card.email)}`);
  if (card.website) lines.push(`URL:${esc(card.website)}`);
  if (card.social) lines.push(`URL:${esc(card.social)}`);
  if (card.address) lines.push(`ADR;TYPE=WORK:;;${esc(card.address)};;;;`);
  if (card.note) lines.push(`NOTE:${esc(card.note)}`);
  if (withImages) {
    for (const line of [imageLine('PHOTO', card.photo), imageLine('LOGO', card.logo)]) if (line) lines.push(line);
  }
  lines.push('END:VCARD');
  return lines.map(fold).join('\r\n') + '\r\n';
}

const TEXT_ROWS = [['Mobile', 'mobile'], ['Work', 'workPhone'], ['Email', 'email'], ['Web', 'website'], ['LinkedIn / social', 'social'], ['Address', 'address']];

// The "send as text" version of a card.
export function plainText(card) {
  const head = [[card.firstName, card.lastName].filter(Boolean).join(' '), [card.title, card.org].filter(Boolean).join(', ')].filter(Boolean);
  const rows = TEXT_ROWS.filter(([, k]) => card[k]).map(([label, k]) => `${label}: ${card[k]}`);
  return [...head, ...(rows.length ? ['', ...rows] : [])].join('\n');
}

// A contact file for someone in the People log.
export function personVCard(p) {
  const [first = '', ...rest] = (p.name || '').trim().split(/\s+/);
  return buildVCard({
    firstName: first,
    lastName: rest.join(' '),
    org: p.company,
    mobile: p.phone,
    email: p.email,
    website: p.website,
    note: [p.event && `Met at: ${p.event}`, p.notes, p.extra].filter(Boolean).join('\n'),
  });
}

// ---- Reading scanned cards ----

const unesc = v => v.replace(/\\n/gi, '\n').replace(/\\([,;:\\])/g, '$1');

const splitUnescaped = v => v.split(/(?<!\\);/);

const blankPerson = () => ({ name: '', company: '', phone: '', email: '', website: '', extra: '' });

function addExtra(p, label, value) {
  if (value) p.extra = p.extra ? `${p.extra}\n${label}: ${value}` : `${label}: ${value}`;
}

// First value fills the main field; later ones go to "Other details".
function addValue(p, field, label, value) {
  if (!p[field]) p[field] = value;
  else addExtra(p, label, value);
}

function parseVCard(text) {
  const p = blankPerson();
  let nameFromN = '';
  for (const line of text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const prop = line.slice(0, i).split(';')[0].toUpperCase().replace(/^ITEM\d+\./, '');
    const value = line.slice(i + 1);
    switch (prop) {
      case 'FN': p.name = unesc(value); break;
      case 'N': nameFromN = value.split(';').slice(0, 2).reverse().map(unesc).filter(Boolean).join(' '); break;
      case 'ORG': p.company = unesc(splitUnescaped(value)[0]); break;
      case 'TEL': addValue(p, 'phone', 'Phone', unesc(value.replace(/^tel:/i, ''))); break;
      case 'EMAIL': addValue(p, 'email', 'Email', unesc(value)); break;
      case 'URL': addValue(p, 'website', 'Link', unesc(value)); break;
      case 'TITLE': addExtra(p, 'Title', unesc(value)); break;
      case 'ADR': addExtra(p, 'Address', splitUnescaped(value).map(unesc).filter(Boolean).join(', ')); break;
      case 'NOTE': addExtra(p, 'Note', unesc(value)); break;
    }
  }
  if (!p.name) p.name = nameFromN;
  return p;
}

function parseMeCard(text) {
  const p = blankPerson();
  for (const field of splitUnescaped(text.replace(/^MECARD:/i, ''))) {
    const i = field.indexOf(':');
    if (i < 0) continue;
    const key = field.slice(0, i).toUpperCase();
    const value = unesc(field.slice(i + 1));
    if (key === 'N') p.name = value.split(',').map(s => s.trim()).reverse().filter(Boolean).join(' ');
    else if (key === 'ORG') p.company = value;
    else if (key === 'TEL') addValue(p, 'phone', 'Phone', value);
    else if (key === 'EMAIL') addValue(p, 'email', 'Email', value);
    else if (key === 'URL') addValue(p, 'website', 'Link', value);
    else if (key === 'ADR') addExtra(p, 'Address', value);
    else if (key === 'NOTE') addExtra(p, 'Note', value);
  }
  return p;
}

// Returns the person on a scanned contact QR code, or null if it isn't one.
export function parseScanned(text) {
  const t = (text || '').trim();
  if (/^BEGIN:VCARD/i.test(t)) return parseVCard(t);
  if (/^MECARD:/i.test(t)) return parseMeCard(t);
  return null;
}
