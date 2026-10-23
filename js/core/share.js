// Getting files and text off the phone: share sheet first, download or SMS/email as fallback (spec §4.2).
import { personVCard } from './vcard.js';
import { dialog, esc } from '../ui.js';

export const makeFile = (content, filename, type) => new File([content], filename, { type });

export const canShareFiles = file => !!navigator.canShare?.({ files: [file] });

export const safeFileName = name => name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'contact';

export function downloadFile(file) {
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function shareFile(file, title = '') {
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      // Any other failure: fall through to download so the user still gets the file.
    }
  }
  downloadFile(file);
  return 'downloaded';
}

// Puts a person from People / Scan into the phone's contacts, as a contact file. iPhone shows it with
// "Create New Contact". Android's Chrome can only download it (and won't open Contacts for a web page),
// so the user is told where to tap.
export async function saveContact(p) {
  const fileName = `${safeFileName(p.name)}.vcf`;
  const result = await shareFile(makeFile(personVCard(p), fileName, 'text/vcard'), p.name);
  if (result === 'downloaded') {
    await dialog(`
      <h2>One more step</h2>
      <p>The contact file <strong>${esc(fileName)}</strong> is in your Downloads.</p>
      <ol>
        <li>Tap <strong>Open</strong> on the download message, or the <strong>download notification</strong> at the top of the screen (or open <strong>My Files → Downloads</strong>).</li>
        <li>Choose <strong>Contacts</strong> and tap <strong>Save</strong> (or <strong>Import</strong>).</li>
      </ol>`, [{ label: 'OK', primary: true }]);
  }
  return result;
}

export async function shareText(text, title = '') {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  location.href = `sms:?&body=${encodeURIComponent(text)}`;
  return 'sms';
}

export function emailText(text, subject) {
  location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
