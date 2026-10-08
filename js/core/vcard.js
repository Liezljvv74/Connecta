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
