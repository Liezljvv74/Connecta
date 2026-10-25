// About Connecta (ⓘ): privacy, backups, installing, how people receive the card (spec §3.7).
import { APP_VERSION, SUPPORT_EMAIL } from '../version.js';
import { lastBackupText } from '../core/backup.js';
import { esc } from '../ui.js';

export function render(root, ctx) {
  root.innerHTML = `
    <details open>
      <summary>What Connecta does</summary>
      <p>Connecta is your digital business card, with quick networking notes. Pick one of your businesses, let people scan the QR code, or send them your contact file. Afterwards, note who you met so you remember to follow up.</p>
    </details>

    <details>
      <summary>Privacy</summary>
      <p>Everything you enter (your details, logos, photo and the people you meet) is stored <strong>only on this phone</strong>.</p>
      <p>Nothing is sent anywhere unless you share a card, export a list or make a backup yourself. There are no accounts, no tracking and no analytics.</p>
      <p><strong>One exception, the place name:</strong> Connecta fills in <strong>Event</strong> with where you are when you add a person. For this it asks the phone for your location (the phone asks your permission once) when you open the app and when you add a person, and sends only those coordinates to <strong>OpenStreetMap</strong>, a free map service, to get the place name. Nothing else is sent, and nothing about the people you meet. If you don't allow location (or there is no signal), Event shows the last event you typed instead, and you can always change it.</p>
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
      <p><strong>Reading paper business cards</strong> needs an extra download of about 10 MB, once. Connecta does this by itself in the background the first time you open it on Wi-Fi. On iPhone it can't tell Wi-Fi from mobile data, so it may use mobile data. If it hasn't happened yet when you first scan a paper card, it downloads then, on Wi-Fi or mobile data. After that, card reading works without internet too.</p>
      <p>Tip: after installing, open Connecta once on Wi-Fi and leave it open for a minute.</p>
    </details>

    <details>
      <summary>How people receive your card</summary>
      <p><strong>Scanning:</strong> they open their phone's camera (or Google Lens on Android) and point it at your QR code. A banner appears; one tap opens their contacts with your details filled in, and they tap Save. Phones always ask for that one tap, so no app can add contacts secretly.</p>
      <p><strong>Sending:</strong> tap <strong>Send card</strong> to share your contact file, including your photo and logo, by WhatsApp, SMS, email, AirDrop or Bluetooth. If a phone can't attach files, you can download the file or send your details as a text message instead.</p>
    </details>

    <details>
      <summary>Saving people to your phone's contacts</summary>
      <p>After you save someone in People, Connecta asks whether to add them to your phone's contacts too. You can also tap <strong>Save contact</strong> next to anyone in People. Connecta then makes a <strong>contact file</strong> (for example <em>JOHAN SOUTHEY.vcf</em>) with their name, company, phone, email, website and notes. A web app isn't allowed to write to your contacts by itself, so you add the file with a few taps.</p>
      <p><strong>Several people at once:</strong> in People, tap <strong>Add to my contacts</strong>. Tick everyone you want (<strong>All</strong>, <strong>None</strong> or <strong>Not saved yet</strong> to start from), then tap <strong>Save … to contacts</strong>. They all go into one file (for example <em>Connecta contacts 2026-10-23 (5).vcf</em>) that you import once with the steps below.</p>
      <p><strong>Done:</strong> Connecta can't see your contacts, so after importing, come back to Connecta and tap <strong>Done</strong> (or <strong>Not yet</strong> if you'll do it later). People you confirmed show <em>✓ Saved to contacts</em> with the date and aren't ticked next time. If you later change someone's name, company, phone, email or website, the ✓ goes away so you can save the new details.</p>
      <p><strong>Android (e.g. Samsung):</strong> the contact file is downloaded.</p>
      <ol>
        <li>Tap <strong>Open</strong> on the download message, or tap the <strong>download notification</strong> at the top of the screen. You can also find it later in <strong>My Files → Downloads</strong>.</li>
        <li>Choose <strong>Contacts</strong> (tap <strong>Just once</strong> or <strong>Always</strong>).</li>
        <li>If Contacts asks <em>"Allow Contacts to send you notifications?"</em>, tap <strong>Allow</strong>. Samsung uses a notification to finish the import; if you don't allow it, the contact may not be saved. You can switch these notifications off later in Settings → Apps → Contacts → Notifications.</li>
        <li>Choose where to save (phone, Samsung or Google account) and tap <strong>Save</strong> or <strong>Import</strong>.</li>
      </ol>
      <p><strong>Not saved?</strong> Import it from inside Contacts: open <strong>Contacts</strong> → menu <strong>☰</strong> → <strong>Manage contacts</strong> → <strong>Import contacts</strong> → <strong>Internal storage</strong> → <strong>Download</strong> → choose the file → <strong>Import</strong>. On Google Contacts: <strong>Fix &amp; manage</strong> → <strong>Import from file</strong>.</p>
      <p><strong>iPhone:</strong> the share list opens.</p>
      <ol>
        <li>Choose <strong>Contacts</strong> if it is in the list; the contact opens.</li>
        <li>If Contacts isn't in the list, choose <strong>Save to Files</strong>, then open the <strong>Files</strong> app and tap the contact file.</li>
        <li>Tap <strong>Create New Contact</strong> (or <strong>Add to Existing Contact</strong>), then <strong>Done</strong>.</li>
      </ol>
      <p>Tip: the place where you met (Event) is added to the contact's notes as <em>"Met at: …"</em>.</p>
    </details>

    <details>
      <summary>Good to know</summary>
      <ul>
        <li>The QR code holds text only. Your photo and logo appear on your screen and in the file you send, but not in a scan.</li>
        <li>Each detail has a character limit (shown next to it in Profile) so everything fits in one QR code.</li>
        <li>Turn your screen brightness up when people scan; it helps their camera.</li>
        <li>On the Share screen you can switch details off for one person. They switch back on next time.</li>
        <li><strong>Reminder</strong> (People) makes a calendar file for the follow-up date. Open that file to add it to your calendar: on Android it lands in <strong>Downloads</strong>; on iPhone choose <strong>Save to Files</strong>, then open it from the <strong>Files</strong> app.</li>
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
