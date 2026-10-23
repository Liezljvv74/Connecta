// Reads the text on a photo of a paper business card, on the phone (Tesseract).
// Its ~7 MB of files download in the background or on first use; sw.js keeps them for offline.
import { loadScript } from '../ui.js';

const OCR_DIR = new URL('vendor/tesseract/', location.href).href;
let ocrWorker = null;

function getOcrWorker() {
  ocrWorker ??= loadScript(`${OCR_DIR}tesseract.min.js`)
    .then(() => self.Tesseract.createWorker('eng', 1, {
      workerPath: `${OCR_DIR}worker.min.js`, corePath: OCR_DIR, langPath: OCR_DIR,
      workerBlobURL: false, cacheMethod: 'none', // a plain worker URL lets sw.js serve the files offline
    }))
    .catch(err => { ocrWorker = null; throw err; });
  return ocrWorker;
}

// Downloads the card-reading files in the background so the first card scan also works offline.
// Skipped on mobile data or Data Saver; iPhones don't say which connection they use, so they download on either.
// The reader it starts is kept, so a card scan straight after uses it instead of downloading again.
export async function prepareCardReading(nav = navigator) {
  if (nav.connection?.type === 'cellular' || nav.connection?.saveData || !nav.serviceWorker?.controller) return;
  if (await caches.match(`${OCR_DIR}eng.traineddata.gz`)) return; // loaded last, so present = all done
  await getOcrWorker();
}

// Returns the card's lines as [{ text, height }]. Photos are often sideways, so it first finds which way up
// reads best on a small copy (quick), then reads the full-size photo once.
// Errors carry a message to show the user.
// ponytail: up to 4 small readings to find the way up; Tesseract's own orientation detection needs ~10 MB more data.
export async function readCard(source) {
  // First, so a camera photo is the moment the button was tapped.
  const img = await createImageBitmap(source).catch(() => {
    throw new Error("Couldn't use this picture. Try again, or choose a JPEG or PNG photo.");
  });
  try {
    const worker = await getOcrWorker().catch(() => {
      throw new Error('Card reading needs internet the first time, to download about 7 MB. Try again when you are online.');
    });
    try {
      const fit = size => Math.min(1, size / Math.max(img.width, img.height));
      let best = { angle: 0, confidence: -1 };
      for (const angle of [0, 90, 270, 180]) {
        const { data } = await worker.recognize(rotated(img, fit(800), angle));
        if (data.confidence > best.confidence) best = { angle, confidence: data.confidence };
        if (data.confidence >= 70) break;
      }
      const { data } = await worker.recognize(rotated(img, fit(1600), best.angle), {}, { blocks: true });
      // Unsure words are mostly smudges, icons and the background (e.g. lined paper): leave them out.
      return (data.blocks ?? []).flatMap(b => b.paragraphs).flatMap(p => p.lines)
        .map(l => l.words.filter(w => w.confidence >= 60))
        .filter(words => words.length)
        .map(words => ({ text: words.map(w => w.text).join(' '), height: Math.max(...words.map(w => w.bbox.y1 - w.bbox.y0)) }));
    } catch {
      throw new Error("Couldn't read the card. Try again.");
    }
  } finally {
    img.close(); // a full photo is tens of MB once decoded
  }
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
