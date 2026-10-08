// People I met: quick log, search, follow-up reminders, save to contacts, export (spec §3.4).
import { newPerson, isoDate } from '../core/model.js';
import { personVCard } from '../core/vcard.js';
import { followUpIcs } from '../core/ics.js';
import { exportRows, eventsIn, toCsv, toXlsx, exportFileName } from '../core/export.js';
import { makeFile, shareFile, safeFileName } from '../core/share.js';
import { esc, dialog, confirmDialog, toast, loadScript } from '../ui.js';

const XLSX_SRC = 'vendor/xlsx.mini.min.js';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORM_FIELDS = [
  ['name', 'Name', 'text'], ['company', 'Company', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'],
  ['website', 'Website', 'url'], ['event', 'Event', 'text'], ['notes', 'Notes: what you talked about', 'textarea'],
  ['followUpDate', 'Follow-up date', 'date'], ['extra', 'Other details', 'textarea'],
];

export function render(root, ctx, params) {
  if (params?.log) return renderForm(root, ctx, newPerson({ event: ctx.state.settings.lastEvent, ...params.log }), true);
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
        : `<label>${esc(label)}<input name="${key}" type="${type}" value="${esc(person[key])}"${key === 'event' ? ' list="events"' : ''}></label>`).join('')}
      <datalist id="events">${eventsIn(ctx.state.people).map(ev => `<option value="${esc(ev)}">`).join('')}</datalist>
    </form>
    <div class="actions">
      <button type="button" class="primary" data-act="save">Save</button>
      ${isNew ? '' : '<button type="button" class="danger" data-act="delete">Delete</button>'}
    </div>`;
  if (isNew) root.querySelector('[name=name]').focus();

  root.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cancel') ctx.go('people');
    if (act === 'save') {
      const data = Object.fromEntries(new FormData(root.querySelector('#person')));
      if (!data.name.trim()) { toast('Add at least a name.'); return; }
      for (const [key, value] of Object.entries(data)) person[key] = value.trim();
      if (isNew && !ctx.state.people.includes(person)) ctx.state.people.push(person); // double tap logs once
      await ctx.save('people');
      if (person.event) { ctx.state.settings.lastEvent = person.event; await ctx.save('settings'); }
      toast('Saved');
      ctx.go('people');
    }
    if (act === 'delete' && await confirmDialog(`Delete ${person.name}?`, 'Delete', true)) {
      ctx.state.people = ctx.state.people.filter(p => p.id !== person.id);
      await ctx.save('people');
      ctx.go('people');
    }
  });
}

function renderList(root, ctx) {
  const { people } = ctx.state;
  root.innerHTML = `
    <div class="actions">
      <button type="button" class="primary" data-act="new">Add person</button>
      <button type="button" data-act="export">Export to Excel</button>
    </div>
    <input type="search" id="q" placeholder="Search name, company, event, notes" aria-label="Search people">
    <ul class="list" id="list"></ul>`;
  const list = root.querySelector('#list');

  const draw = query => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = [...people]
      .sort((a, b) => (b.metAt || '').localeCompare(a.metAt || ''))
      .filter(p => {
        const text = [p.name, p.company, p.event, p.notes].join(' ').toLowerCase();
        return words.every(w => text.includes(w));
      });
    list.innerHTML = shown.length
      ? shown.map(p => `
        <li class="person">
          <button type="button" class="link" data-act="edit" data-id="${p.id}">
            <strong>${esc(p.name)}</strong>
            <small>${esc([p.company, p.event, p.metAt && isoDate(new Date(p.metAt))].filter(Boolean).join(' · '))}</small>
            ${p.followUpDate ? `<small class="due">Follow up ${esc(p.followUpDate)}</small>` : ''}
          </button>
          <div class="row-actions">
            <button type="button" data-act="remind" data-id="${p.id}">Reminder</button>
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
      case 'remind':
        if (!p.followUpDate) { toast('Set a follow-up date first: tap the person to edit.'); break; }
        shareFile(makeFile(followUpIcs(p), `follow-up-${safeFileName(p.name)}.ics`, 'text/calendar'), `Follow up: ${p.name}`);
        break;
      case 'contact':
        shareFile(makeFile(personVCard(p), `${safeFileName(p.name)}.vcf`, 'text/vcard'), p.name);
        break;
      case 'export':
        if (!people.length) { toast('Log someone first, then you can export.'); break; }
        exportDialog(people);
        break;
    }
  });

  draw('');
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
