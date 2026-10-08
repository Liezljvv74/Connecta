// Profile: personal details shared by all businesses, and the list of businesses (spec §3.2, §3.3).
import { LABELS, SHAREABLE, OVERRIDABLE, MAX_LENGTHS, newBusiness } from '../core/model.js';
import { sortedBusinesses } from '../core/card.js';
import { shrinkImage } from '../core/image.js';
import { esc, toast, confirmDialog, pickFile } from '../ui.js';

const TEXT_FIELDS = ['firstName', 'lastName', 'mobile', 'workPhone', 'email', 'website', 'address', 'social'];
const INPUT_TYPES = { mobile: 'tel', workPhone: 'tel', email: 'email', website: 'url', social: 'url' };

// Every input shows and enforces its character limit, so the QR code never overflows (spec §3.2).
function field(name, label, value, type = 'text', placeholder = '') {
  const max = MAX_LENGTHS[name.replace(/^o:/, '')];
  const text = `${esc(label)} <small>(max ${max} characters)</small>`;
  if (name.endsWith('address')) {
    return `<label>${text}<textarea name="${name}" rows="2" maxlength="${max}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
  }
  return `<label>${text}<input name="${name}" type="${type}" maxlength="${max}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
}

async function pickImage(type) {
  const file = await pickFile('image/*');
  if (!file) return null;
  try {
    return await shrinkImage(file, { type });
  } catch {
    toast('Could not read that picture. Try a JPG or PNG.');
    return null;
  }
}

export function render(root, ctx, params) {
  if (params?.edit && ctx.state.businesses.some(b => b.id === params.edit)) return renderBusiness(root, ctx, params.edit);
  const { me, businesses } = ctx.state;
  const list = sortedBusinesses(businesses);
  root.innerHTML = `
    <section class="card">
      <h2>My details</h2>
      <p class="hint">Shared by all your businesses. A business can replace any of these with its own.</p>
      <div class="photo-row">
        ${me.photo ? `<img class="photo" src="${esc(me.photo)}" alt="Your photo">` : '<div class="photo empty">No photo</div>'}
        <button type="button" data-act="photo">${me.photo ? 'Change photo' : 'Add photo'}</button>
        ${me.photo ? '<button type="button" class="link" data-act="remove-photo">Remove</button>' : ''}
      </div>
      <form id="me">${TEXT_FIELDS.map(k => field(k, LABELS[k], me[k], INPUT_TYPES[k])).join('')}</form>
    </section>
    <section class="card">
      <h2>Businesses</h2>
      <ul class="list">${list.map((b, i) => `
        <li class="row">
          ${b.logo ? `<img class="logo-sm" src="${esc(b.logo)}" alt="">` : ''}
          <span class="grow">${esc(b.name || 'Unnamed business')}</span>
          <button type="button" data-act="up" data-id="${b.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move ${esc(b.name)} up">↑</button>
          <button type="button" data-act="edit" data-id="${b.id}">Edit</button>
        </li>`).join('')}</ul>
      ${list.length ? '' : '<p class="hint">Add each business you want a card for.</p>'}
      <button type="button" class="primary" data-act="add">Add business</button>
    </section>`;

  root.querySelector('#me').addEventListener('change', e => {
    me[e.target.name] = e.target.value.trim();
    ctx.save('me');
  });

  root.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'photo': {
        const photo = await pickImage('image/jpeg');
        if (photo) { me.photo = photo; await ctx.save('me'); ctx.refresh(); }
        break;
      }
      case 'remove-photo':
        me.photo = ''; await ctx.save('me'); ctx.refresh();
        break;
      case 'add': {
        const b = newBusiness(list.length ? list[list.length - 1].order + 1 : 0);
        businesses.push(b);
        await ctx.save('businesses');
        ctx.go('profile', { edit: b.id });
        break;
      }
      case 'edit':
        ctx.go('profile', { edit: btn.dataset.id });
        break;
      case 'up': {
        list.forEach((b, i) => { b.order = i; });
        const i = list.findIndex(b => b.id === btn.dataset.id);
        [list[i - 1].order, list[i].order] = [list[i].order, list[i - 1].order];
        await ctx.save('businesses');
        ctx.refresh();
        break;
      }
    }
  });
}

function renderBusiness(root, ctx, id) {
  const { me } = ctx.state;
  const b = ctx.state.businesses.find(x => x.id === id);

  const draw = () => {
    root.innerHTML = `
      <button type="button" class="link" data-act="back">← Profile</button>
      <section class="card">
        <h2>${esc(b.name || 'New business')}</h2>
        <div class="photo-row">
          ${b.logo ? `<img class="logo" src="${esc(b.logo)}" alt="Logo">` : '<div class="logo empty">No logo</div>'}
          <button type="button" data-act="logo">${b.logo ? 'Change logo' : 'Add logo'}</button>
          ${b.logo ? '<button type="button" class="link" data-act="remove-logo">Remove</button>' : ''}
        </div>
        <form id="biz">
          ${field('name', 'Business name (required)', b.name)}
          ${field('title', LABELS.title, b.title)}
          <h3>This business's own details</h3>
          <p class="hint">Leave a field empty to use your personal details (shown in grey).</p>
          ${OVERRIDABLE.map(k => field('o:' + k, LABELS[k], b.overrides[k] || '', INPUT_TYPES[k], me[k] || '')).join('')}
          <h3>Shared by default</h3>
          <p class="hint">You can still switch any of these off for one person on the Share screen.</p>
          ${SHAREABLE.map(k => `<label class="check"><input type="checkbox" name="d:${k}" ${b.defaultFields.includes(k) ? 'checked' : ''}> ${esc(LABELS[k])}</label>`).join('')}
        </form>
      </section>
      <div class="actions">
        <button type="button" class="primary" data-act="back">Done</button>
        <button type="button" class="danger" data-act="delete">Delete business</button>
      </div>`;
  };

  root.addEventListener('change', e => {
    const { name, value, checked } = e.target;
    if (name.startsWith('o:')) {
      const key = name.slice(2);
      if (value.trim()) b.overrides[key] = value.trim();
      else delete b.overrides[key];
    } else if (name.startsWith('d:')) {
      const key = name.slice(2);
      b.defaultFields = SHAREABLE.filter(k => (k === key ? checked : b.defaultFields.includes(k)));
    } else {
      b[name] = value.trim();
      if (name === 'name') root.querySelector('h2').textContent = b.name || 'New business';
    }
    ctx.save('businesses');
  });

  root.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    switch (btn.dataset.act) {
      case 'back':
        if (!b.name) { toast('Give this business a name first.'); return; }
        ctx.go('profile');
        break;
      case 'logo': {
        const logo = await pickImage('image/png');
        if (logo) { b.logo = logo; await ctx.save('businesses'); draw(); }
        break;
      }
      case 'remove-logo':
        b.logo = ''; await ctx.save('businesses'); draw();
        break;
      case 'delete':
        if (await confirmDialog(`Delete ${b.name || 'this business'}? People you logged keep the business name.`, 'Delete', true)) {
          ctx.state.businesses = ctx.state.businesses.filter(x => x.id !== b.id);
          await ctx.save('businesses');
          ctx.go('profile');
        }
        break;
    }
  });

  draw();
}
