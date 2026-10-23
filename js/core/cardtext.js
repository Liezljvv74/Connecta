// Turns the text read from a photo of a paper business card into a person's fields.
// The reading is never perfect, so this only pre-fills the form; the user checks it before saving.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
// A website starts with www./http, or ends in a common domain ending, so "Dr.Ute" (a lost space) isn't one.
const TLDS = 'com|net|org|info|biz|io|co|za|de|uk|us|ca|au|nz|eu|fr|nl|be|ch|at|it|es|app|dev|me|tv|online|store|shop|africa';
const WEBSITE = new RegExp(String.raw`\b(https?://\S+|www\.[a-z0-9-]+(\.[a-z0-9-]+)+(/\S*)?|[a-z0-9-]+(\.[a-z0-9-]+)*\.(${TLDS})\b(/\S*)?)`, 'i');
const TLD = new RegExp(`^(${TLDS})$`, 'i');
const PHONE = /\+?\(?\d[\d ().-]{5,}\d/g;
const PHONE_LABEL = /\b(tel|phone|mobile|mob|cell|[mt])\b/i;
const COMPANY = /\b(pty|ltd|inc|llc|gmbh|ag|bv|cc|corp|company|group|holdings)\b\.?/i;
// Job titles: such a line is not the person's name.
const JOB = /\b(partner|director|manager|coach|consultant|ceo|cfo|coo|cto|owner|founder|broker|agent|sales|advisor|adviser|engineer|officer|specialist|assistant|president|executive|certified|accountant|attorney|lawyer)\b/i;
// Email providers: their name is not the person's company.
const MAILBOX = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|proton|protonmail|gmx|web|mweb|telkomsa|vodamail|webmail|zoho|mail)$/i;

const digits = s => s.replace(/\D/g, '').length;
const words = s => s.split(/\s+/).filter(Boolean).length;
const compact = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
// Card icons are read as stray characters ("(J", "[]"); a line with nothing else left was only that value.
const onlyJunkLeft = s => s.replace(/[^\p{L}\p{N}]/gu, '').length < 3;

// Icons at the edge of a line are read as "4", "-" or "|": a name or company keeps only the parts with letters.
const lettersOnly = s => s.split(' ').filter(w => /\p{L}/u.test(w)).join(' ');

// Other details keeps whole lines but drops icons (📍 ☎ ✉ 🌐) read at their edges. An icon comes out as
// a lone symbol ("|", "©"), a lone letter ("j", "O", "Q"), a letter stuck to a symbol ("(J", "J)", "©a"),
// or a lone digit in front of a number (the 📍 in "9 54 Stormvoël Crescent").
// Real short words stay: "Dr", "PO Box", "De Waal", "Mo.", and house numbers like "5 Main Road".
const alnum = w => w.replace(/[^\p{L}\p{N}]/gu, '').length;
const stuckToSymbol = w => w.length <= 3 && /[^\p{L}\p{N}.,'/-]/u.test(w);
const lowercaseOrSymbol = w => /^[^\p{L}\p{N}]+$|^\p{Ll}$/u.test(w);
const iconAtStart = (w, next) => (/^\d+$/.test(w) ? /^\d$/.test(w) && /^\d/.test(next) : alnum(w) <= 1 || stuckToSymbol(w));
// At the end a lone capital is real ("Unit A") and so is a digit ("Suite 4").
const iconAtEnd = w => lowercaseOrSymbol(w) || (stuckToSymbol(w) && !/^\d+$/.test(w));
function stripIcons(line) {
  const w = line.split(' ');
  for (;;) {
    if (w.length > 1 && iconAtStart(w[0], w[1])) w.shift();
    else if (w.length > 1 && iconAtEnd(w.at(-1))) w.pop();
    else return w.join(' ');
  }
}

// Icons next to a number are read as "." or a lone digit: "082. 496" → "082 496", "0 082 496" → "082 496".
const cleanPhone = raw => raw.replace(/\./g, ' ').replace(/^\d (?=0)/, '').replace(/\s+/g, ' ').trim();

// Best phone number: labelled Tel/Mobile beats a bare number beats e.g. "Roadside assistance"; fax never.
// Returns the text as read (to find its line again) and the cleaned number.
function pickPhone(lines) {
  let best = null;
  for (const line of lines) {
    let from = 0;
    for (const m of line.matchAll(PHONE)) {
      if (digits(m[0]) < 7) continue;
      const label = line.slice(from, m.index);
      from = m.index + m[0].length;
      if (/fax/i.test(label)) continue;
      const score = PHONE_LABEL.test(label) ? 3 : /\p{L}{3}/u.test(label) ? 1 : 2;
      if (!best || score > best.score) best = { score, read: m[0].trim() };
    }
  }
  return best ? { read: best.read, phone: cleanPhone(best.read) } : { read: '', phone: '' };
}

// The business part of an address: "actioncoach" in johansouthey.actioncoach.com or jane@actioncoach.com.
function brandOf(host) {
  const labels = host.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('.');
  while (labels.length > 1 && TLD.test(labels.at(-1))) labels.pop();
  const brand = labels.at(-1) ?? '';
  return MAILBOX.test(brand) ? '' : brand;
}

// lines: [{ text, height }] in reading order; height is the letter size in pixels.
export function parseCardText(lines) {
  const all = lines.map(l => ({ text: l.text.replace(/\s+/g, ' ').trim(), height: l.height || 0 })).filter(l => l.text);
  const texts = all.map(l => l.text);
  const email = texts.map(t => t.match(EMAIL)?.[0]).find(Boolean) ?? '';
  const website = texts.map(t => t.replace(EMAIL, ' ').match(WEBSITE)?.[0]).find(Boolean) ?? '';
  const { read: phoneRead, phone } = pickPhone(texts);

  const notContact = l => !EMAIL.test(l.text) && !WEBSITE.test(l.text) && digits(l.text) < 7;
  // Best clue for the name: it is in the email address (johansouthey@… → "JOHAN SOUTHEY", allenh@… → "Harold Allen").
  const local = compact(email.split('@')[0]);
  const inEmail = l => local.length >= 3 && l.text.split(' ').some(w => compact(w).length >= 3 && local.includes(compact(w)));

  // The company: a line with Pty/Ltd/GmbH…, else the line naming the website's (or email's) business.
  const brandName = (website && brandOf(website)) || (email && brandOf(email.split('@')[1])) || '';
  const brand = compact(brandName);
  const brandLine = brand.length >= 3 && all.find(l => notContact(l) && !inEmail(l) && compact(l.text).includes(brand));
  const companyLine = all.find(l => notContact(l) && !inEmail(l) && COMPANY.test(l.text)) ?? brandLine;
  let company = companyLine ? lettersOnly(companyLine.text) : (brandName ? brandName[0].toUpperCase() + brandName.slice(1) : '');
  // "OUTSURANCE BROKER" is the business plus a job title: keep just the business word(s).
  if (companyLine && companyLine === brandLine && JOB.test(company)) {
    company = company.split(' ').filter(w => compact(w).includes(brand)).join(' ');
  }

  // Otherwise the name is the biggest line of plain words that isn't a job title or logo.
  const plain = all.filter(l => l !== companyLine && notContact(l) && digits(l.text) < 3 && /\p{L}{2}/u.test(l.text) && words(l.text) <= 5);
  const people = plain.filter(l => words(l.text) >= 2 && !JOB.test(l.text) && !l.text.includes('|'));
  const biggest = list => list.reduce((a, b) => (b.height > a.height ? b : a), list[0]);
  const nameLine = people.find(inEmail) ?? biggest(people) ?? biggest(plain.filter(l => words(l.text) >= 2)) ?? biggest(plain);

  // Everything else goes to "Other details" so nothing on the card is lost.
  const extra = all.filter(l => l !== nameLine && !(l === companyLine && lettersOnly(l.text) === company))
    .map(l => stripIcons(l.text))
    .filter(t => !onlyJunkLeft([email, website, phoneRead].reduce((s, v) => (v ? s.replace(v, '') : s), t)));

  return { name: nameLine ? lettersOnly(nameLine.text) : '', company, phone, email, website, extra: extra.join('\n') };
}
