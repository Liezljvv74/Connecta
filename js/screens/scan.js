// Scan someone else's QR business card (spec §3.5), or read a paper business card from a photo, into People I met.
import QrScanner from '../../vendor/qr-scanner.min.js';
import { parseScanned, personVCard } from '../core/vcard.js';
import { parseCardText } from '../core/cardtext.js';
import { makeFile, shareFile, safeFileName } from '../core/share.js';
import { readCard } from '../core/ocr.js';
import { esc, pickFile } from '../ui.js';

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
  let mode = null;
  let cardStream = null;
  let cameraRequest = 0; // only the newest camera request may keep its stream
  let left = false; // the user has left this screen

  const scanner = new QrScanner(root.querySelector('#qr video'), r => found(r.data), {
    returnDetailedScanResult: true,
    preferredCamera: 'environment',
    highlightScanRegion: true,
  });
  const startQr = () => scanner.start().catch(() => { result.innerHTML = CAMERA_HELP; });

  async function startCardCamera() {
    stopCardCamera();
    const request = cameraRequest;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      // Switched mode, tapped again or left while the camera was starting: this stream is no longer wanted.
      if (request !== cameraRequest) { stream.getTracks().forEach(t => t.stop()); return; }
      cardStream = stream;
      cardVideo.srcObject = stream;
      await cardVideo.play();
    } catch {
      if (request === cameraRequest) result.innerHTML = CAMERA_HELP;
    }
  }
  function stopCardCamera() {
    cameraRequest++;
    cardStream?.getTracks().forEach(t => t.stop());
    cardStream = null;
  }
  const start = () => (mode === 'qr' ? startQr() : startCardCamera());

  function setMode(next) {
    if (next === mode) return; // tapping the chosen mode again must not start a second camera
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
      if (left) return;
      if (!person.name && !person.phone && !person.email) {
        result.innerHTML = '<p class="hint">No details found. Try again in good light, with the card filling the photo.</p>';
        return;
      }
      ctx.go('people', { log: { ...person, source: 'card' } });
    } catch (err) {
      result.innerHTML = `<p class="hint">${esc(err.message)}</p>`;
    } finally {
      reading = false;
      if (left) return;
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
  return () => { left = true; scanner.destroy(); stopCardCamera(); };
}
