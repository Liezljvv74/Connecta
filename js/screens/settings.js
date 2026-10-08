// Settings: backup, restore and delete all data (spec §3.6).
import { makeBackup, readBackup, backupFileName, backupSummary, lastBackupText } from '../core/backup.js';
import { replaceAll, clearAll } from '../core/storage.js';
import { emptyData } from '../core/model.js';
import { makeFile, shareFile } from '../core/share.js';
import { esc, dialog, confirmDialog, toast, pickFile } from '../ui.js';

export function render(root, ctx) {
  const { settings } = ctx.state;
  root.innerHTML = `
    <section class="card">
      <h2>Backup and restore</h2>
      <p class="${settings.lastBackupAt ? 'hint' : 'warn'}">${esc(lastBackupText(settings.lastBackupAt))}</p>
      <p class="hint">Your data lives only on this phone. Back up after each event and keep the file in Files, Google Drive or your email.</p>
      <div class="actions">
        <button type="button" class="primary" data-act="backup">Back up now</button>
        <button type="button" data-act="restore">Restore from backup</button>
      </div>
    </section>
    <section class="card">
      <h2>Delete all data</h2>
      <p class="hint">Removes your details, businesses and everyone you logged from this phone.</p>
      <button type="button" class="danger" data-act="wipe">Delete all my data</button>
    </section>`;

  root.addEventListener('click', async e => {
    const act = e.target.closest('[data-act]')?.dataset.act;

    if (act === 'backup') {
      const now = new Date();
      const data = { ...ctx.state, settings: { ...settings, lastBackupAt: now.toISOString() } };
      const outcome = await shareFile(makeFile(makeBackup(data, now), backupFileName(now), 'application/json'), 'Connecta backup');
      if (outcome !== 'cancelled') {
        settings.lastBackupAt = now.toISOString();
        await ctx.save('settings');
        ctx.refresh();
      }
    }

    if (act === 'restore') {
      const file = await pickFile('.json,application/json');
      if (!file) return;
      let data;
      try {
        data = readBackup(await file.text());
      } catch (err) {
        await dialog(`<h2>Can't restore this file</h2><p>${esc(err.message)}</p><p>Nothing was changed.</p>`, [{ label: 'OK', value: true, primary: true }]);
        return;
      }
      if (!await confirmDialog(`Replace everything on this phone with this backup (${backupSummary(data)})? This cannot be undone.`, 'Replace', true)) return;
      await replaceAll(data);
      ctx.state = data;
      toast('Backup restored');
      ctx.go('share');
    }

    if (act === 'wipe') {
      const { value, form } = await dialog(`
        <h2>Delete all data?</h2>
        <p>This removes your details, businesses and everyone you logged from this phone. Make a backup first if you might need them.</p>
        <label>Type DELETE to confirm<input name="confirm" autocomplete="off"></label>`,
      [{ label: 'Delete everything', value: 'go', danger: true }, { label: 'Cancel', value: null }]);
      if (value !== 'go') return;
      if (form.elements.confirm.value.trim().toUpperCase() !== 'DELETE') { toast('Nothing deleted. Type DELETE to confirm.'); return; }
      await clearAll();
      ctx.state = emptyData();
      toast('All data deleted');
      ctx.go('share');
    }
  });
}
