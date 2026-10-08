// About Connecta (ⓘ): privacy, backups, installing, how people receive the card (spec §3.7).
import { APP_VERSION, SUPPORT_EMAIL } from '../version.js';
import { lastBackupText } from '../core/backup.js';
import { esc } from '../ui.js';

export function render(root, ctx) {
  root.innerHTML = `
    <details open>
      <summary>What Connecta does</summary>
      <p>Connecta is your business card on your phone. Pick one of your businesses, let people scan the QR code, or send them your contact file. Afterwards, note who you met so you remember to follow up.</p>
    </details>

    <details>
      <summary>Privacy</summary>
      <p>Everything you enter (your details, logos, photo and the people you meet) is stored <strong>only on this phone</strong>.</p>
      <p>Nothing is sent anywhere unless you share a card, export a list or make a backup yourself. There are no accounts, no tracking and no analytics.</p>
    </details>

    <details>
      <summary>Backup and store your data</summary>
      <p><strong>${esc(lastBackupText(ctx.state.settings.lastBackupAt))}</strong></p>
      <p>Because your data lives only on this phone, it is lost if the phone is lost, reset or replaced. iPhones can also clear web-app data when storage runs low or the app has not been used for a long time.</p>
      <p><strong>To back up:</strong></p>
      <ol>
        <li>Open <strong>Settings</strong> and tap <strong>Back up now</strong>.</li>
        <li>Save the file somewhere safe: Files / iCloud Drive, Google Drive, or email it to yourself.</li>
        <li>Do this after every event, or at least once a week.</li>
      </ol>
      <p><strong>To restore</strong> (for example on a new phone): install Connecta, open <strong>Settings → Restore from backup</strong> and pick the file. You will be asked to confirm before anything is replaced.</p>
      <p>You can also export the people you met to <strong>Excel</strong> from the People screen and keep that file with your records.</p>
      <button class="primary" data-go="settings">Go to Backup</button>
    </details>

    <details>
      <summary>Installing on your phone</summary>
      <p><strong>iPhone:</strong> open the Connecta link in <strong>Safari</strong> (other browsers can't install it), tap the Share button, then <strong>Add to Home Screen</strong>.</p>
      <p><strong>Android:</strong> open the link in <strong>Chrome</strong>, tap the menu (⋮), then <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
      <p>Once installed, Connecta works without internet.</p>
    </details>

    <details>
      <summary>How people receive your card</summary>
      <p><strong>Scanning:</strong> they open their phone's camera (or Google Lens on Android) and point it at your QR code. A banner appears; one tap opens their contacts with your details filled in, and they tap Save. Phones always ask for that one tap, so no app can add contacts secretly.</p>
      <p><strong>Sending:</strong> tap <strong>Send card</strong> to share your contact file, including your photo and logo, by WhatsApp, SMS, email, AirDrop or Bluetooth. If a phone can't attach files, you can download the file or send your details as a text message instead.</p>
    </details>

    <details>
      <summary>Good to know</summary>
      <ul>
        <li>The QR code holds text only. Your photo and logo appear on your screen and in the file you send, but not in a scan.</li>
        <li>Each detail has a character limit (shown next to it in Profile) so everything fits in one QR code.</li>
        <li>Turn your screen brightness up when people scan; it helps their camera.</li>
        <li>On the Share screen you can switch details off for one person. They switch back on next time.</li>
        <li>Follow-up reminders are added to your phone's calendar.</li>
        <li>Updates arrive automatically the next time you open the app with internet. Your data is not touched.</li>
      </ul>
    </details>

    <details>
      <summary>Problems or suggestions?</summary>
      <p>Contact me: <a href="mailto:${esc(SUPPORT_EMAIL)}?subject=Connecta%20feedback">${esc(SUPPORT_EMAIL)}</a></p>
    </details>

    <p class="hint">Connecta version ${esc(APP_VERSION)}</p>`;
  root.querySelector('[data-go]').addEventListener('click', () => ctx.go('settings'));
}
