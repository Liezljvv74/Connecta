// Scan someone else's QR business card (spec §3.5), or read a paper business card from a photo, into People I met.
import QrScanner from '../../vendor/qr-scanner.min.js';
import { parseScanned, personVCard } from '../core/vcard.js';
import { parseCardText } from '../core/cardtext.js';
import { makeFile, shareFile, safeFileName } from '../core/share.js';
import { esc, toast, pickFile, loadScript } from '../ui.js';

// Card reading runs on the phone (Tesseract). Its ~7 MB of files download on first use; sw.js keeps them for offline.
const OCR_DIR = new URL('vendor/tesseract/', location.href).href;
let ocrWorker = null;

const CAMERA_HELP = `
  <div class="warn"><strong>The camera isn't available.</strong>
  <p>Allow camera access for Connecta:</p>
  <p><strong>iPhone:</strong> Settings → Safari → Camera → Allow. If Connecta is on your home screen, also check Settings → Connecta.</p>
  <p><strong>Android:</strong> Chrome → ⋮ → Settings → Site settings → Camera, and allow this site.</p>
  <button type="button" data-act="again">Try again</button></div>`;

export function render(root, ctx) {
  root.innerHTML = `
    <div class="actions">
      <button type="button" data-act="mode-qr">QR code</button>
      <button type="button" data-act="mode-card">Business card</button>
    </div>
    <div id="qr">
      <p class="hint">Point the camera at someone's QR business card.</p>
      <div class="camera"><video playsinline muted></video></div>
    </div>
    <div id="card" hidden>
      <p class="hint">Hold a paper business card so it fills the camera, then tap Take photo. Connecta reads it and fills in the details for you to check.</p>
      <div class="camera"><video playsinline muted></video></div>
      <div class="actions"><button type="button" class="primary" data-act="photo">Take photo</button></div>
      <button type="button" class="link" data-act="pick">Choose a photo instead</button>
    </div>
    <div id="result" aria-live="polite"></div>`;
  const result = root.querySelector('#result');
  const cardVideo = root.querySelector('#card video');
  const photoButton = root.querySelector('[data-act=photo]');
  let current = null;
  let reading = false;
  let mode = 'qr';
  let cardStream = null;

  const scanner = new QrScanner(root.querySelector('#qr video'), r => found(r.data), {
    returnDetailedScanResult: true,
    preferredCamera: 'environment',
    highlightScanRegion: true,
  });
  const startQr = () => scanner.start().catch(() => { result.innerHTML = CAMERA_HELP; });

  async function startCardCamera() {
    try {
      cardStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      if (mode !== 'card') { stopCardCamera(); return; } // switched back while the camera was starting
      cardVideo.srcObject = cardStream;
      await cardVideo.play();
    } catch {
      result.innerHTML = CAMERA_HELP;
    }
  }
  function stopCardCamera() {
    cardStream?.getTracks().forEach(t => t.stop());
    cardStream = null;
  }
  const start = () => (mode === 'qr' ? startQr() : startCardCamera());

  function setMode(next) {
    mode = next;
    for (const b of root.querySelectorAll('[data-act^=mode-]')) {
      const on = b.dataset.act === `mode-${mode}`;
      b.classList.toggle('primary', on);
      b.setAttribute('aria-pressed', on);
    }
    root.querySelector('#qr').hidden = mode !== 'qr';
    root.querySelector('#card').hidden = mode !== 'card';
    current = null;
    result.innerHTML = '';
    if (mode === 'qr') stopCardCamera(); else scanner.stop();
    start();
  }

  function found(text) {
    scanner.stop();
    current = parseScanned(text);
    if (!current) {
      result.innerHTML = `
        <div class="card"><h2>Not a contact card</h2>
          <p class="hint">This code contains:</p>
          <p class="scanned-text">${esc(text)}</p>
          <button type="button" data-act="again">Scan again</button></div>`;
      return;
    }
    result.innerHTML = `
      <div class="card"><h2>${esc(current.name || 'Contact')}</h2>
        ${[current.company, current.phone, current.email, current.website].filter(Boolean).map(v => `<p>${esc(v)}</p>`).join('')}
        ${current.extra ? `<p class="hint pre">${esc(current.extra)}</p>` : ''}
        <div class="actions">
          <button type="button" class="primary" data-act="log">Add to People I met</button>
          <button type="button" data-act="contact">Save to my contacts</button>
        </div>
        <button type="button" class="link" data-act="again">Scan again</button></div>`;
  }

  // source: the live camera (its current frame) or a chosen photo file.
  async function readPhoto(source) {
    if (!source || reading) return;
    reading = true;
    cardVideo.pause(); // freeze the picture that is being read
    photoButton.disabled = true;
    photoButton.textContent = 'Reading the card…';
    result.innerHTML = '<p class="hint">Reading the card… this takes a few seconds (longer the first time).</p>';
    try {
      const person = parseCardText(await readCard(source));
      if (!person.name && !person.phone && !person.email) {
        result.innerHTML = '<p class="hint">No details found. Try again in good light, with the card filling the photo.</p>';
        return;
      }
      ctx.go('people', { log: { ...person, source: 'card' } });
    } catch {
      result.innerHTML = `<p class="hint">Couldn't read the card. The first time, card reading needs internet to download (about 7 MB).</p>`;
    } finally {
      reading = false;
      photoButton.disabled = false;
      photoButton.textContent = 'Take photo';
      if (cardStream) cardVideo.play().catch(() => {});
    }
  }

  root.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'mode-qr') setMode('qr');
    if (act === 'mode-card') setMode('card');
    if (act === 'photo' && cardStream) readPhoto(cardVideo);
    if (act === 'pick') pickFile('image/*').then(readPhoto);
    if (act === 'again') { current = null; result.innerHTML = ''; start(); }
    if (act === 'log') ctx.go('people', { log: { ...current, source: 'scanned' } });
    if (act === 'contact') shareFile(makeFile(personVCard(current), `${safeFileName(current.name)}.vcf`, 'text/vcard'), current.name);
  });

  setMode('qr');
  return () => { scanner.destroy(); stopCardCamera(); };
}

const createOcrWorker = () => loadScript(`${OCR_DIR}tesseract.min.js`)
  .then(() => self.Tesseract.createWorker('eng', 1, {
    workerPath: `${OCR_DIR}worker.min.js`, corePath: OCR_DIR, langPath: OCR_DIR,
    workerBlobURL: false, cacheMethod: 'none', // a plain worker URL lets sw.js serve the files offline
  }));

function getOcrWorker() {
  ocrWorker ??= createOcrWorker().catch(err => { ocrWorker = null; throw err; });
  return ocrWorker;
}

// Downloads the card-reading files in the background so the first card scan also works offline.
// Skipped on mobile data or Data Saver; iPhones don't say which connection they use, so they download on either.
export async function prepareCardReading(nav = navigator) {
  if (nav.connection?.type === 'cellular' || nav.connection?.saveData || !nav.serviceWorker?.controller) return;
  if (await caches.match(`${OCR_DIR}eng.traineddata.gz`)) return; // loaded last, so present = all done
  const worker = await createOcrWorker(); // fetches exactly the files this phone needs; sw.js keeps them
  await worker.terminate();
}

// Returns the card's lines as [{ text, height }]. Photos are often sideways, so it first finds which way up
// reads best on a small copy (quick), then reads the full-size photo once.
// ponytail: up to 4 small readings to find the way up; Tesseract's own orientation detection needs ~10 MB more data.
async function readCard(source) {
  const img = await createImageBitmap(source); // first, so a camera photo is the moment the button was tapped
  const worker = await getOcrWorker();
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
