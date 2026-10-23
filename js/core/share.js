// Getting files and text off the phone: share sheet first, download or SMS/email as fallback (spec §4.2).
import { personVCard } from './vcard.js';
import { isoDate } from './model.js';
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

// Puts people from People / Scan into the phone's contacts, as ONE contact file (imported in one go).
// iPhone gets the share list; Android's Chrome can only download it (and won't open Contacts for a web page).
// The step-by-step help is in About → "Saving people to your phone's contacts".
export async function saveContacts(people) {
  const one = people.length === 1;
  const fileName = one ? `${safeFileName(people[0].name)}.vcf` : `Connecta contacts ${isoDate()} (${people.length}).vcf`;
  const result = await shareFile(makeFile(people.map(personVCard).join(''), fileName, 'text/vcard'), one ? people[0].name : 'Contacts');
  if (result === 'downloaded') {
    await dialog(`
      <p><strong>${esc(fileName)}</strong> has been downloaded and can now be imported into your contacts${one ? '' : ` (${people.length} people in one go)`}.</p>
      <p class="hint">How: tap ⓘ (top right) → Saving people to your phone's contacts.</p>`,
    [{ label: 'OK', primary: true }]);
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
