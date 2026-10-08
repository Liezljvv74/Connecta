// Starts the app: loads saved data, shows the screen named in the URL hash, registers offline support.
import { loadAll, savePart, requestPersist } from './core/storage.js';
import { esc } from './ui.js';

const TITLES = { share: 'Share', people: 'People I met', scan: 'Scan a card', profile: 'Profile', settings: 'Settings', about: 'About Connecta' };

const ctx = {
  state: null,
  params: null,
  save: key => savePart(key, ctx.state[key]),
  go(name, params = null) {
    ctx.params = params;
    if (location.hash === '#' + name) show();
    else location.hash = name;
  },
  refresh: () => show(),
};

let cleanup = null;
let showing = 0;

async function show() {
  const token = ++showing;
  const hash = location.hash.slice(1);
  const name = Object.hasOwn(TITLES, hash) ? hash : 'share';
  const params = ctx.params;
  ctx.params = null;
  cleanup?.();
  cleanup = null;
  document.getElementById('title').textContent = TITLES[name];
  for (const a of document.querySelectorAll('.tabs a')) {
    if (a.hash === '#' + name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const main = document.getElementById('screen');
  let screen;
  try {
    screen = await import(`./screens/${name}.js`);
  } catch (e) {
    if (token === showing) main.innerHTML = `<p class="error">Could not open this screen: ${esc(e.message)}</p>`;
    return;
  }
  if (token !== showing) return;
  const root = document.createElement('div'); // a fresh element per screen, so old listeners never pile up
  main.replaceChildren(root);
  scrollTo(0, 0);
  cleanup = screen.render(root, ctx, params) ?? null;
}

async function start() {
  try {
    ctx.state = await loadAll();
  } catch (e) {
    document.getElementById('screen').innerHTML = `<p class="error">Could not open your saved data: ${esc(e.message)}</p>`;
    return;
  }
  requestPersist();
  addEventListener('hashchange', show);
  show();
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js');
    // A new version took over: reload once so the new files are used. Skipped on first install.
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) location.reload(); });
  }
}

start();
