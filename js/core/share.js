// Getting files and text off the phone: share sheet first, download or SMS/email as fallback (spec §4.2).
import { personVCard, contactIntent } from './vcard.js';

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

// Puts a person from People / Scan into the phone's contacts: Android opens its "new contact" screen,
// other phones get the contact file (iPhone shows it with "Create New Contact").
export function saveContact(p, nav = navigator, loc = location) {
  if (/Android/i.test(nav.userAgent)) {
    loc.href = contactIntent(p);
    return Promise.resolve('opened');
  }
  return shareFile(makeFile(personVCard(p), `${safeFileName(p.name)}.vcf`, 'text/vcard'), p.name);
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
