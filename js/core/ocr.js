// Reads the text on a photo of a paper business card, on the phone (Tesseract).
// Its ~10 MB of files download in the background or on first use; sw.js keeps them for offline.
import { loadScript } from '../ui.js';

const OCR_DIR = new URL('vendor/tesseract/', location.href).href;
// English, Afrikaans and German: together they know ë, é, ä, ö, ü… ("Stormvoël", "Augenärztin").
const LANGS = ['eng', 'afr', 'deu'];
// Two readers: a quick English-only one to find which way up the card is (three languages are ~3× slower),
// and the full one for the final reading.
const FINDER = 'eng';
const READER = LANGS.join('+');
const workers = {};

function getWorker(langs) {
  workers[langs] ??= loadScript(`${OCR_DIR}tesseract.min.js`)
    .then(() => self.Tesseract.createWorker(langs, 1, {
      workerPath: `${OCR_DIR}worker.min.js`, corePath: OCR_DIR, langPath: OCR_DIR,
      workerBlobURL: false, cacheMethod: 'none', // a plain worker URL lets sw.js serve the files offline
    }))
    .catch(err => { delete workers[langs]; throw err; });
  return workers[langs];
}

// Starts both readers in the background (called when Business card is chosen), so they are ready for the photo.
export function warmUpCardReading() {
  for (const langs of [FINDER, READER]) getWorker(langs).catch(() => {});
}

// Frees the readers' memory when the Scan screen is left; they warm up again next time.
export function releaseCardReading() {
  for (const langs of Object.keys(workers)) {
    workers[langs].then(w => w.terminate()).catch(() => {});
    delete workers[langs];
  }
}

// Downloads the card-reading files in the background so the first card scan also works offline.
// Skipped on mobile data or Data Saver; iPhones don't say which connection they use, so they download on either.
// The reader it starts is kept, so a card scan straight after uses it instead of downloading again.
export async function prepareCardReading(nav = navigator) {
  if (nav.connection?.type === 'cellular' || nav.connection?.saveData || !nav.serviceWorker?.controller) return;
  const cached = await Promise.all(LANGS.map(l => caches.match(`${OCR_DIR}${l}.traineddata.gz`)));
  if (cached.every(Boolean)) return; // the language files load last, so present = all done
  await getWorker(READER);
}

// Returns the card's lines as [{ text, height }]. Photos are often sideways, so it first finds which way up
// reads best on a small copy with the quick English reader, then reads the photo once with all languages.
// Errors carry a message to show the user.
// ponytail: up to 4 small readings to find the way up; Tesseract's own orientation detection needs ~10 MB more data.
export async function readCard(source) {
  // First, so a camera photo is the moment the button was tapped.
  const img = await createImageBitmap(source).catch(() => {
    throw new Error("Couldn't use this picture. Try again, or choose a JPEG or PNG photo.");
  });
  try {
    const [finder, reader] = await Promise.all([getWorker(FINDER), getWorker(READER)]).catch(() => {
      throw new Error('Card reading needs internet the first time, to download about 10 MB. Try again when you are online.');
    });
    try {
      // Sizes and the stop mark were measured on the example cards: the right way up scores 67+, wrong ways 41 or less;
      // 1200 px reads them exactly as well as 1600 px, and faster.
      const fit = size => Math.min(1, size / Math.max(img.width, img.height));
      let best = { angle: 0, confidence: -1 };
      for (const angle of [0, 90, 270, 180]) {
        const { data } = await finder.recognize(rotated(img, fit(600), angle));
        if (data.confidence > best.confidence) best = { angle, confidence: data.confidence };
        if (data.confidence >= 60) break;
      }
      const { data } = await reader.recognize(rotated(img, fit(1200), best.angle), {}, { blocks: true });
      return (data.blocks ?? []).flatMap(b => b.paragraphs).flatMap(p => p.lines)
        .map(l => l.words.filter(keepWord))
        .filter(words => words.length)
        .map(words => ({ text: words.map(w => w.text).join(' '), height: Math.max(...words.map(w => w.bbox.y1 - w.bbox.y0)) }));
    } catch {
      throw new Error("Couldn't read the card. Try again.");
    }
  } finally {
    img.close(); // a full photo is tens of MB once decoded
  }
}

// Unsure short scraps are smudges, icons and the background (e.g. lined paper: "ea", "IRE", "BRASS"): leave them out.
// A longer word is kept even when unsure, so an unusual letter never makes a word disappear ("Stormvoël").
function keepWord(w) {
  if (w.confidence >= 60) return true;
  const letters = w.text.replace(/[^\p{L}]/gu, '').length;
  return letters >= 6 && letters >= w.text.length * 0.8;
}

function rotated(img, scale, angle) {
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const side = angle % 180 !== 0;
  const canvas = Object.assign(document.createElement('canvas'), { width: side ? h : w, height: side ? w : h });
  const c = canvas.getContext('2d');
  c.translate(canvas.width / 2, canvas.height / 2);
  c.rotate(angle * Math.PI / 180);
  c.drawImage(img, -w / 2, -h / 2, w, h);
  return canvas;
}
