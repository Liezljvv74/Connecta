// Scan someone else's QR business card into People I met (spec §3.5).
import QrScanner from '../../vendor/qr-scanner.min.js';
import { parseScanned, personVCard } from '../core/vcard.js';
import { makeFile, shareFile, safeFileName } from '../core/share.js';
import { esc } from '../ui.js';

const CAMERA_HELP = `
  <div class="warn"><strong>The camera isn't available.</strong>
  <p>Allow camera access for Connecta:</p>
  <p><strong>iPhone:</strong> Settings → Safari → Camera → Allow. If Connecta is on your home screen, also check Settings → Connecta.</p>
  <p><strong>Android:</strong> Chrome → ⋮ → Settings → Site settings → Camera, and allow this site.</p>
  <button type="button" data-act="again">Try again</button></div>`;

export function render(root, ctx) {
  root.innerHTML = `
    <p class="hint">Point the camera at someone's QR business card.</p>
    <div class="camera"><video playsinline muted></video></div>
    <div id="result" aria-live="polite"></div>`;
  const result = root.querySelector('#result');
  let current = null;

  const scanner = new QrScanner(root.querySelector('video'), r => found(r.data), {
    returnDetailedScanResult: true,
    preferredCamera: 'environment',
    highlightScanRegion: true,
  });
  const start = () => scanner.start().catch(() => { result.innerHTML = CAMERA_HELP; });

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

  root.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'again') { current = null; result.innerHTML = ''; start(); }
    if (act === 'log') ctx.go('people', { log: { ...current, source: 'scanned' } });
    if (act === 'contact') shareFile(makeFile(personVCard(current), `${safeFileName(current.name)}.vcf`, 'text/vcard'), current.name);
  });

  start();
  return () => scanner.destroy();
}
