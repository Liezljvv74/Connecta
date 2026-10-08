// Small UI helpers shared by the screens.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Use for EVERY typed or scanned value placed into HTML.
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);

// An app update reloads the page; never do that under someone's fingers.
export const canReloadNow = (doc = document) =>
  doc.hidden || !(doc.querySelector('dialog[open], form#person') || doc.activeElement?.matches('input, textarea, select'));

export function toast(message) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = message;
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

// Modal dialog. `html` goes inside a <form> so callers can read inputs from `form.elements`.
export function dialog(html, buttons) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form class="dialog-body">${html}</form><div class="dialog-actions">${buttons.map((b, i) =>
      `<button type="button" data-i="${i}" class="${b.primary ? 'primary' : ''}${b.danger ? ' danger' : ''}">${esc(b.label)}</button>`).join('')}</div>`;
    const form = d.querySelector('form');
    form.addEventListener('submit', e => e.preventDefault());
    d.addEventListener('click', e => {
      const i = e.target.closest('button[data-i]')?.dataset.i;
      if (i === undefined) return;
      resolve({ value: buttons[i].value, form });
      d.close();
    });
    d.addEventListener('cancel', () => resolve({ value: null, form }));
    d.addEventListener('close', () => d.remove());
    document.body.append(d);
    d.showModal();
  });
}

export async function confirmDialog(message, okLabel = 'OK', danger = false) {
  const { value } = await dialog(`<p>${esc(message)}</p>`, [
    { label: 'Cancel', value: false },
    { label: okLabel, value: true, primary: !danger, danger },
  ]);
  return value === true;
}

export function pickFile(accept) {
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept });
    input.addEventListener('change', () => resolve(input.files[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

const scripts = {};
export function loadScript(src) {
  return (scripts[src] ??= new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement('script'), { src });
    s.onload = () => resolve();
    s.onerror = () => { delete scripts[src]; reject(new Error(`Could not load ${src}`)); };
    document.head.append(s);
  }));
}
