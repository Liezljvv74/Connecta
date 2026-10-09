// Share (home): pick a business, show the QR code, switch fields off for this person, send the card (spec §3.1, §4).
import { buildCard, availableFields, pickBusiness, sortedBusinesses, longestFields, PERSONAL_CARD } from '../core/card.js';
import { buildVCard, plainText } from '../core/vcard.js';
import { qrSvg, fitsQr } from '../core/qr.js';
import { makeFile, canShareFiles, shareFile, downloadFile, shareText, emailText, safeFileName } from '../core/share.js';
import { esc, dialog, toast, keepScreenAwake } from '../ui.js';

export function render(root, ctx) {
  const { me, businesses, settings } = ctx.state;
  const named = sortedBusinesses(businesses).filter(b => b.name);
  const hasName = !!(me.firstName || me.lastName);

  if (!hasName) {
    root.innerHTML = `
      <section class="card">
        <h2>Let's set up your card</h2>
        <p>Add your name and contact details. A business with its own name and logo is optional.</p>
        <button type="button" class="primary" data-act="setup">Go to Profile</button>
      </section>`;
    root.querySelector('[data-act=setup]').addEventListener('click', () => ctx.go('profile'));
    return;
  }

  let biz = pickBusiness(named, settings.lastBusinessId) ?? PERSONAL_CARD; // no business: share personal details
  let hidden = new Set(); // per-person switches; reset every time this screen opens

  const letScreenDim = keepScreenAwake();

  function draw() {
    const card = buildCard(me, biz, hidden);
    const qrText = buildVCard(card);
    const fields = availableFields(me, biz);
    root.innerHTML = `
      <button type="button" class="biz-switch" data-act="switch" aria-label="Business: ${esc(biz.name || 'Personal card')}${named.length > 1 ? '. Tap to change.' : ''}">
        ${biz.logo ? `<img class="logo" src="${esc(biz.logo)}" alt="">` : ''}
        <span>${esc(biz.name || 'Personal card')}</span>${named.length > 1 ? '<span aria-hidden="true">▾</span>' : ''}
      </button>
      <div class="qr-area">
        ${me.photo ? `<img class="photo" src="${esc(me.photo)}" alt="Your photo">` : ''}
        ${fitsQr(qrText)
          ? `<div class="qr" role="img" aria-label="QR code with your contact details">${qrSvg(qrText)}</div>`
          : `<div class="warn"><strong>Too much for one QR code.</strong> Switch off or shorten: ${esc(longestFields(card).join(', '))}.</div>`}
        <p class="name">${esc([me.firstName, me.lastName].filter(Boolean).join(' '))}</p>
      </div>
      <section class="card">
        <h2>Sharing with this person</h2>
        ${fields.length
          ? fields.map(f => `
            <label class="toggle">
              <span><strong>${esc(f.label)}</strong><small>${esc(f.value)}</small></span>
              <input type="checkbox" data-key="${f.key}" ${hidden.has(f.key) ? '' : 'checked'}>
            </label>`).join('')
          : '<p class="hint">Only your name and business name are shared. Choose more under Profile → Businesses.</p>'}
      </section>
      <div class="actions">
        <button type="button" class="primary" data-act="send">Send card</button>
        <button type="button" data-act="log">Log this person</button>
      </div>`;
  }

  root.addEventListener('change', e => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (e.target.checked) hidden.delete(key);
    else hidden.add(key);
    draw();
  });

  root.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'switch' && named.length > 1) {
      const { value } = await dialog('<h2>Choose business</h2>', [
        ...named.map(b => ({ label: b.name, value: b.id, primary: b.id === biz.id })),
        { label: 'Cancel', value: null },
      ]);
      if (!value) return;
      biz = named.find(b => b.id === value);
      hidden = new Set();
      settings.lastBusinessId = biz.id;
      ctx.save('settings');
      draw();
    }
    if (act === 'send') sendCard(buildCard(me, biz, hidden));
    if (act === 'log') ctx.go('people', { log: { sharedBusinessName: biz.name, source: 'shared' } });
  });

  draw();
  return letScreenDim;
}

async function sendCard(card) {
  const name = [card.firstName, card.lastName].filter(Boolean).join(' ');
  const file = makeFile(buildVCard(card, { withImages: true }), `${safeFileName(name)}.vcf`, 'text/vcard');
  if (canShareFiles(file)) {
    await shareFile(file, name);
    return;
  }
  const { value } = await dialog(
    '<h2>Send your card</h2><p>This phone can\'t attach the contact file directly. Choose another way:</p>',
    [
      { label: 'Download contact file', value: 'download', primary: true },
      { label: 'Send as text message', value: 'text' },
      { label: 'Send as email', value: 'email' },
      { label: 'Cancel', value: null },
    ],
  );
  if (value === 'download') {
    downloadFile(file);
    toast('Contact file saved to your downloads. Attach it to a message or email.');
  }
  if (value === 'text') shareText(plainText(card), name);
  if (value === 'email') emailText(plainText(card), `Contact details: ${name}`);
}
