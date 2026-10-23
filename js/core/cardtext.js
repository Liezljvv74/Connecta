// Turns the text read from a photo of a paper business card into a person's fields.
// The reading is never perfect, so this only pre-fills the form; the user checks it before saving.

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const WEBSITE = /\b(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?/i;
const PHONE = /\+?\(?\d[\d ().-]{5,}\d/g;
const PHONE_LABEL = /\b(tel|phone|mobile|mob|cell|[mt])\b/i;
const COMPANY = /\b(pty|ltd|inc|llc|gmbh|ag|bv|cc|corp|company|group|holdings)\b\.?/i;

const digits = s => s.replace(/\D/g, '').length;
const words = s => s.split(/\s+/).filter(Boolean).length;
// Card icons are read as stray characters ("(J", "[]"); a line with nothing else left was only that value.
const onlyJunkLeft = s => s.replace(/[^\p{L}\p{N}]/gu, '').length < 3;

// Best phone number: labelled Tel/Mobile beats a bare number beats e.g. "Roadside assistance"; fax never.
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
      if (!best || score > best.score) best = { score, phone: m[0].trim() };
    }
  }
  return best?.phone ?? '';
}

// lines: [{ text, height }] in reading order; height is the letter size in pixels.
export function parseCardText(lines) {
  const all = lines.map(l => ({ text: l.text.replace(/\s+/g, ' ').trim(), height: l.height || 0 })).filter(l => l.text);
  const texts = all.map(l => l.text);
  const email = texts.map(t => t.match(EMAIL)?.[0]).find(Boolean) ?? '';
  const website = texts.filter(t => !EMAIL.test(t)).map(t => t.match(WEBSITE)?.[0]).find(Boolean) ?? '';
  const phone = pickPhone(texts);

  // The name is the biggest line of plain words, preferably at least two of them (a lone big word is usually a logo).
  const plain = all.filter(l => !EMAIL.test(l.text) && !WEBSITE.test(l.text) && digits(l.text) < 3 && /\p{L}{2}/u.test(l.text) && words(l.text) <= 5);
  const biggest = list => list.reduce((a, b) => (b.height > a.height ? b : a), list[0]);
  const nameLine = biggest(plain.filter(l => words(l.text) >= 2)) ?? biggest(plain);

  const companyLine = all.find(l => l !== nameLine && COMPANY.test(l.text));
  const domain = website.replace(/^(https?:\/\/)?(www\.)?/i, '').split(/[./]/)[0];
  const company = companyLine?.text ?? (domain ? domain[0].toUpperCase() + domain.slice(1) : '');

  // Everything else goes to "Other details" so nothing on the card is lost.
  const extra = all.filter(l => l !== nameLine && l !== companyLine)
    .map(l => l.text)
    .filter(t => !onlyJunkLeft([email, website, phone].reduce((s, v) => (v ? s.replace(v, '') : s), t)));

  return { name: nameLine?.text ?? '', company, phone, email, website, extra: extra.join('\n') };
}
