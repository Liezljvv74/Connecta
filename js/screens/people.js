// People I met: quick log, search, follow-up dates, save to contacts (one or many), export (spec §3.4).
import { newPerson, isoDate } from '../core/model.js';
import { exportRows, eventsIn, toCsv, toXlsx, exportFileName } from '../core/export.js';
import { makeFile, shareFile, saveContacts } from '../core/share.js';
import { currentPlace } from '../core/place.js';
import { esc, dialog, confirmDialog, toast, loadScript } from '../ui.js';

const XLSX_SRC = 'vendor/xlsx.mini.min.js';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORM_FIELDS = [
  ['name', 'Name', 'text'], ['company', 'Company', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'],
  ['website', 'Website', 'url'], ['event', 'Event', 'text'], ['metDate', 'Date met', 'date'], ['notes', 'Notes: what you talked about', 'textarea'],
  ['followUpDate', 'Follow-up date', 'date'], ['extra', 'Other details', 'textarea'],
];

// The newest first, and the grey line under a name: used by the list and by "Add to my contacts".
const byNewest = (a, b) => (b.metAt || '').localeCompare(a.metAt || '');
const summary = p => [p.company, p.event, p.metAt && isoDate(new Date(p.metAt))].filter(Boolean).join(' · ');
// What goes into the phone's contact: changing any of these means the saved contact is out of date.
const CONTACT_FIELDS = ['name', 'company', 'phone', 'email', 'website'];

export function render(root, ctx, params) {
  if (params?.log) return renderForm(root, ctx, newPerson(params.log), true);
  const existing = params?.edit && ctx.state.people.find(p => p.id === params.edit);
  if (existing) return renderForm(root, ctx, existing, false);
  renderList(root, ctx);
}

function renderForm(root, ctx, person, isNew) {
  root.innerHTML = `
    <button type="button" class="link" data-act="cancel">← People</button>
    <form class="card" id="person">
      <h2>${isNew ? 'Log a person' : 'Edit'}</h2>
      ${person.sharedBusinessName ? `<p class="hint">You gave them your ${esc(person.sharedBusinessName)} card.</p>` : ''}
      ${FORM_FIELDS.map(([key, label, type]) => type === 'textarea'
        ? `<label>${esc(label)}<textarea name="${key}" rows="3">${esc(person[key])}</textarea></label>`
        : `<label>${esc(label)}<input name="${key}" type="${type}" value="${esc(key === 'metDate' ? isoDate(new Date(person.metAt)) : person[key])}"${key === 'event' ? ' list="events"' : ''}></label>`).join('')}
      <datalist id="events">${eventsIn(ctx.state.people).map(ev => `<option value="${esc(ev)}">`).join('')}</datalist>
    </form>
    <div class="actions">
      <button type="button" class="primary" data-act="save">Save</button>
      ${isNew ? '' : '<button type="button" class="danger" data-act="delete">Delete</button>'}
    </div>`;
  if (isNew) root.querySelector('[name=name]').focus();
  let autoPlace = ''; // the place name Connecta filled in, so it isn't remembered as a typed event
  if (isNew && !person.event) fillEvent(root.querySelector('[name=event]'), ctx.state.settings.lastEvent).then(p => { autoPlace = p; });
  let saving = false; // a double tap on Save saves, and asks about contacts, only once

  root.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cancel') ctx.go('people');
    if (act === 'save' && !saving) {
      const data = Object.fromEntries(new FormData(root.querySelector('#person')));
      if (!data.name.trim()) { toast('Add at least a name.'); return; }
      saving = true;
      const { metDate, ...fields } = data;
      if (CONTACT_FIELDS.some(k => (fields[k] ?? '').trim() !== (person[k] ?? ''))) delete person.savedToContacts;
      for (const [key, value] of Object.entries(fields)) person[key] = value.trim();
      if (metDate && metDate !== isoDate(new Date(person.metAt))) person.metAt = new Date(`${metDate}T12:00`).toISOString();
      if (isNew) ctx.state.people.push(person);
      await ctx.save('people');
      if (person.event && person.event !== autoPlace) { ctx.state.settings.lastEvent = person.event; await ctx.save('settings'); }
      toast('Saved');
      // A web app can't write contacts itself; this hands the phone a contact file.
      if (isNew && !person.savedToContacts && (await dialog(`<p>Also save ${esc(person.name)} to your phone's contacts?</p>`,
        [{ label: 'Not now', value: false }, { label: 'Yes', value: true, primary: true }])).value) {
        await saveToContacts(ctx, [person]);
      }
      ctx.go('people');
    }
    if (act === 'delete' && await confirmDialog(`Delete ${person.name}?`, 'Delete', true)) {
      ctx.state.people = ctx.state.people.filter(p => p.id !== person.id);
      await ctx.save('people');
      ctx.go('people');
    }
  });
}

// Makes one contact file for these people; once the user says it's imported, remembers the date
// so they aren't ticked again next time.
async function saveToContacts(ctx, list) {
  if (!await saveContacts(list)) return;
  const today = isoDate();
  for (const p of list) p.savedToContacts = today;
  await ctx.save('people');
}

// Event = where you are now (editable); without a place (location refused, no signal…) the last typed event.
// Anything typed while the place is being looked up wins. Returns the place name it filled in.
async function fillEvent(input, lastEvent) {
  input.placeholder = 'Finding where you are…';
  const place = await currentPlace();
  input.placeholder = 'Event or place';
  if (input.value || !input.isConnected) return '';
  input.value = place || lastEvent || '';
  return place;
}

function renderList(root, ctx) {
  const { people } = ctx.state;
  root.innerHTML = `
    <div class="actions">
      <button type="button" class="primary" data-act="new">Add person</button>
      <button type="button" data-act="export">Export to Excel</button>
      <button type="button" data-act="contacts">Add to my contacts</button>
    </div>
    <input type="search" id="q" placeholder="Search name, company, event, notes" aria-label="Search people">
    <ul class="list" id="list"></ul>`;
  const list = root.querySelector('#list');

  const draw = query => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = [...people]
      .sort(byNewest)
      .filter(p => {
        const text = [p.name, p.company, p.event, p.notes].join(' ').toLowerCase();
        return words.every(w => text.includes(w));
      });
    list.innerHTML = shown.length
      ? shown.map(p => `
        <li class="person">
          <button type="button" class="link" data-act="edit" data-id="${p.id}">
            <strong>${esc(p.name)}</strong>
            <small>${esc(summary(p))}</small>
            ${p.followUpDate ? `<small class="due">Follow up ${esc(p.followUpDate)}</small>` : ''}
            ${p.savedToContacts ? `<small>✓ Saved to contacts ${esc(p.savedToContacts)}</small>` : ''}
          </button>
          <div class="row-actions">
            <button type="button" data-act="contact" data-id="${p.id}">Save contact</button>
          </div>
        </li>`).join('')
      : `<li class="hint">${people.length ? 'No matches.' : 'No one yet. People you log or scan appear here.'}</li>`;
  };

  root.querySelector('#q').addEventListener('input', e => draw(e.target.value));

  root.addEventListener('click', async e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const p = people.find(x => x.id === btn.dataset.id);
    switch (btn.dataset.act) {
      case 'new':
        ctx.go('people', { log: {} });
        break;
      case 'edit':
        ctx.go('people', { edit: p.id });
        break;
      case 'contact':
        await saveToContacts(ctx, [p]);
        draw(root.querySelector('#q').value);
        break;
      case 'contacts':
        if (!people.length) { toast('Log someone first, then you can add them to your contacts.'); break; }
        if (await contactsDialog(ctx, people)) draw(root.querySelector('#q').value);
        break;
      case 'export':
        if (!people.length) { toast('Log someone first, then you can export.'); break; }
        exportDialog(people);
        break;
    }
  });

  draw('');
}

// Pick who goes into one contact file: everyone, no one, or only people not saved to contacts yet.
async function contactsDialog(ctx, people) {
  let boxes = [];
  const { value } = await dialog(`
    <h2>Add to my contacts</h2>
    <p class="hint">Tick who to add. They go into one contact file that you import once.</p>
    <div class="pick-quick">Tick:
      <button type="button" class="link" data-pick="all">All</button>
      <button type="button" class="link" data-pick="none">None</button>
      <button type="button" class="link" data-pick="new">Not saved yet</button>
    </div>
    <div class="pick-list">${[...people].sort(byNewest).map(p => `
      <label class="check"><input type="checkbox" name="pick" value="${p.id}"${p.savedToContacts ? '' : ' checked'}>
        <span><strong>${esc(p.name)}</strong>
          <small>${esc(summary(p))}</small>
          ${p.savedToContacts ? `<small>✓ Saved ${esc(p.savedToContacts)}</small>` : ''}</span>
      </label>`).join('')}
    </div>`,
  [{ label: 'Save to contacts', value: 'go', primary: true }, { label: 'Cancel', value: null }], d => {
    // Wire the quick buttons and keep the count on the main button. A box starts ticked when not saved yet,
    // so "Not saved yet" is simply each box's starting state.
    boxes = [...d.querySelectorAll('input[name=pick]')];
    const saveButton = d.querySelector('.dialog-actions .primary');
    const count = () => {
      const n = boxes.filter(b => b.checked).length;
      saveButton.textContent = n === 1 ? 'Save 1 person to contacts' : `Save ${n} people to contacts`;
      saveButton.disabled = n === 0;
    };
    d.addEventListener('change', count);
    d.addEventListener('click', e => {
      const pick = e.target.closest('[data-pick]')?.dataset.pick;
      if (!pick) return;
      for (const b of boxes) b.checked = pick === 'all' || (pick === 'new' && b.defaultChecked);
      count();
    });
    count();
  });

  if (value !== 'go') return false;
  const ticked = new Set(boxes.filter(b => b.checked).map(b => b.value));
  await saveToContacts(ctx, people.filter(p => ticked.has(p.id)));
  return true;
}

async function exportDialog(people) {
  loadScript(XLSX_SRC).catch(() => {}); // load now, so sharing still happens straight after the tap
  const { value, form } = await dialog(`
    <h2>Export people</h2>
    <fieldset><legend>Include</legend>
      <label class="check"><input type="checkbox" name="contacts" checked> Contact details</label>
      <label class="check"><input type="checkbox" name="notes" checked> Event notes</label>
    </fieldset>
    <label>Which people
      <select name="event"><option value="">Everyone</option>${eventsIn(people).map(ev => `<option value="${esc(ev)}">${esc(ev)}</option>`).join('')}</select>
    </label>
    <fieldset><legend>Format</legend>
      <label class="check"><input type="radio" name="format" value="xlsx" checked> Excel (.xlsx)</label>
      <label class="check"><input type="radio" name="format" value="csv"> CSV (other spreadsheet apps)</label>
    </fieldset>`,
  [{ label: 'Export', value: 'go', primary: true }, { label: 'Cancel', value: null }]);
  if (value !== 'go') return;

  const f = form.elements;
  const options = { contacts: f.contacts.checked, notes: f.notes.checked, event: f.event.value };
  let rows;
  try {
    rows = exportRows(people, options);
  } catch (err) {
    toast(err.message);
    return;
  }
  try {
    if (f.format.value === 'xlsx') {
      await loadScript(XLSX_SRC);
      await shareFile(makeFile(toXlsx(rows), exportFileName('xlsx', options.event), XLSX_TYPE), 'People I met');
    } else {
      await shareFile(makeFile(toCsv(rows), exportFileName('csv', options.event), 'text/csv'), 'People I met');
    }
  } catch {
    toast('Could not create the file. Try CSV instead.');
  }
}
