# Connecta — Mobile Business Card: Design Spec

Date: 2026-10-08
Status: Draft, awaiting owner review

## 1. Purpose

A phone-only digital business card. The owner runs several businesses, picks one, and shares chosen contact details by QR code or by sending a contact file. The app also logs the people met so follow-ups actually happen.

**Who uses it:** the owner, plus people they share the link with in a group. Every user's data stays on their own phone. No accounts, no server, no monthly cost.

**Success looks like:**
- Someone scans the QR code with their normal camera, taps once, and the owner's details are in their contacts.
- Someone without their phone receives a contact file (with photo and logo) or a text message they can save later.
- Switching business takes one tap; hiding a field for one person takes one tap.
- After an event, the owner has a list of who they met, what they discussed, and calendar reminders to follow up.
- The app works fully offline once installed, on both iPhone and Android.

## 2. Decisions made

| Decision | Choice | Why |
|---|---|---|
| Platform | Installable web app (PWA) shared by link | Works on iPhone and Android, no app store, no fees |
| Tech | Plain HTML/CSS/JavaScript modules, no framework, no build step | Smallest, fewest moving parts; structured so a framework or app-store wrapper (Capacitor) can be added later |
| Hosting | GitHub Pages (free, static) | One fixed link for the group; no server logic |
| Storage | On the phone only (IndexedDB) | Privacy, no server |
| Contact details | Personal details shared across businesses; each business can override or add | Owner chose option C |
| What is shared | Per-business default fields + per-person on/off switches on the Share screen | Owner chose option C |
| QR contents | Plain-text vCard (no photo, no logo) | Saves directly into the scanner's contacts with no internet; images make the code unscannable |
| Photo and logo | Shown on screen beside the QR code; included in the sent contact file | Recipient still sees the face and logo |
| Extra features | "People I met" log + "Scan their card back" | Owner chose both |

**Known limits, accepted by the owner:**
- No phone lets a contact be saved with zero taps. The recipient always confirms with one tap (Apple and Google requirement).
- The scanned QR card does not carry the logo or photo. To be revisited later (would need online hosting of cards).
- Screen brightness cannot be controlled by a web app; the owner may need to raise it manually.
- Follow-up reminders go into the phone's calendar; the app cannot send its own notifications without a server.

## 3. Screens

Navigation is a bottom tab bar: **Share · People · Scan · Profile · Settings**. An **ⓘ About** icon sits in the top-right header on every screen.

### 3.1 Share (home)
- Opens on the business used last.
- Shows: business name and logo, owner's photo, the QR code, and a list of the fields being shared with an on/off switch beside each.
- Tap the business name to switch business. Switching resets the per-person switches to that business's defaults.
- Per-person switches are temporary: they reset each time the Share screen is opened, so a hidden field is never accidentally hidden (or shown) for the next person.
- QR code updates instantly when a switch changes.
- Keeps the screen awake while visible (Wake Lock, where the phone supports it).
- Buttons:
  - **Send card** — see 4.2.
  - **Log this person** — opens the quick-log form (3.4) with business and today's date pre-filled.
- If no personal details or no business exists yet, shows a short guide with buttons to set them up instead of an empty QR code.

### 3.2 Profile → My details
Personal details shared by every business:
first name, last name, photo, mobile, work phone, email, website, address, LinkedIn/social link.

### 3.3 Profile → Businesses
List of businesses; add, edit, delete, reorder. Each business has:
- business name (required), logo, job title
- optional overrides for any personal field (e.g. a business email or website). An empty override means "use my personal value".
- default shared fields: a tick list of which fields this business shares.

Deleting a business asks for confirmation. Log entries that referenced it keep the business name as text.

### 3.4 People (the "People I met" log)
- List, newest first, with search (name, company, event, notes).
- Each entry: name, company, phone, email, other details, event tag, notes, follow-up date, which of the owner's businesses was shared, date met, how it was added (shared / scanned / typed).
- Quick-log form: only the name is needed; everything else optional. The event tag remembers the last value used, so logging several people at one event is fast.
- Per entry:
  - **Add follow-up reminder** — creates a calendar event file (.ics) and opens it via the share sheet or download, so it lands in the phone's calendar.
  - **Save to my contacts** — creates a contact file for that person and opens it.
  - Edit, delete (with confirmation).
- **Export** — opens an export choice, then delivers the file via share sheet or download:
  - **What to include:** Contact details, Event notes (event, notes, follow-up date, date met, business shared), or both. At least one must be ticked.
  - **Which people:** all, or one event (picked from the event tags in the log).
  - **Format:** **Excel (.xlsx)** (default) or CSV. Excel keeps phone numbers as text, so leading zeros and `+` country codes are not lost; CSV is for other spreadsheet apps.
  - File name: `connecta-people-YYYY-MM-DD.xlsx` (or `-<event>-` when filtered to one event).

### 3.5 Scan
- Opens the camera and reads another person's QR card.
- If it is a contact card (vCard or MECARD): shows the details, then **Add to People I met** (opens the quick-log form pre-filled) and **Save to my contacts**.
- If it is anything else (e.g. a website link): shows what was read and saves nothing.
- If camera permission is blocked: explains how to allow it in the phone's settings.

### 3.6 Settings
- **Back up now** — saves everything (details, businesses, logos, photo, log) to one file via share sheet or download.
- **Restore from backup** — picks a backup file, checks it is valid, shows what it contains, and asks for confirmation before replacing current data.
- Shows "Last backup: <date>" or "Never backed up" as a warning.
- **Delete all my data** — with a typed confirmation.

### 3.7 About (ⓘ icon)
Read-only information pages:
- **What Connecta does** — one paragraph.
- **Privacy** — everything is stored only on this phone; nothing is sent anywhere unless you share or back it up yourself; no accounts, tracking or analytics.
- **Backup and store your data** — why it matters (iPhones can clear web-app data when storage is low or the app is unused for a long time), step-by-step how to back up and restore, and where to keep the file (Files, Google Drive, email to yourself). Shows last backup date.
- **Installing on your phone** — iPhone (Safari → Share → Add to Home Screen; must be Safari) and Android (Chrome → Install app).
- **How people receive your card** — scanning with iPhone camera / Android camera or Google Lens, the one confirm tap, and the send-card options.
- **Good to know** — QR code has no photo/logo; turn brightness up for scanning; follow-ups go to your calendar; updates arrive automatically when the app opens online.
- **Version** — app version number.

## 4. Sharing details

### 4.1 Building the card
- Effective value of a field = business override if filled, else personal value.
- Shared fields = business defaults, minus anything switched off on the Share screen. Empty fields are never included.
- Business name goes in the vCard `ORG` field, job title in `TITLE`.
- Format: vCard 3.0 (widest support across iPhone and Android), UTF-8, correct escaping of commas, semicolons, new lines and accented characters.

### 4.2 Send card
1. If the phone can share files: open the share sheet with a `.vcf` file containing the shared fields, **plus photo and logo** (WhatsApp, SMS, email, AirDrop, Bluetooth, etc.).
2. If the phone cannot share files, offer two choices:
   - **Download contact file** — saves the full `.vcf` for manual attaching.
   - **Send as text** — your details as neat plain text (name, numbers, email, website), via the share sheet, or an SMS/email link if no share sheet exists.

### 4.3 QR code
- Contains the vCard text only (no photo, no logo).
- Error correction level M.
- Size check: if the card text exceeds the scannability limit (starting value 1,000 bytes, a named constant to tune after real-phone testing), the app shows a warning naming the longest fields and does not show the code until a field is switched off or shortened.

### 4.4 Images
Photo and logos are shrunk on import (longest side 400 px, JPEG/PNG compressed) so contact files stay small enough for WhatsApp and email.

## 5. Data (stored on the phone)

All records carry `schemaVersion` so later versions can upgrade stored data safely.

- **me**: `{ firstName, lastName, photo, mobile, workPhone, email, website, address, social }`
- **businesses[]**: `{ id, name, logo, title, overrides: {field: value}, defaultFields: [field], order }`
- **people[]**: `{ id, name, company, phone, email, website, extra, event, notes, followUpDate, sharedBusinessName, metAt, source: "shared"|"scanned"|"typed" }`
- **settings**: `{ lastBusinessId, lastEvent, lastBackupAt }`

Storage uses IndexedDB. The app asks the browser for persistent storage on first use (reduces, but does not remove, the risk of the phone clearing data, hence backup).

**Backup file**: one JSON file, `connecta-backup-YYYY-MM-DD.json`, containing `{ app: "connecta", schemaVersion, exportedAt, me, businesses, people, settings }` with images embedded. Restore rejects files that are not Connecta backups or are from a newer, unknown schema version.

## 6. Code structure

Built so the screens can later be replaced (e.g. by React or an app-store wrapper) without touching the logic.

```
index.html               app shell, tab bar, About icon
manifest.webmanifest     install info (name, icons, colours)
sw.js                    offline caching; new version picked up on next online open
css/app.css
js/app.js                starts the app, switches screens
js/core/                 logic only, no screen code — reusable by any future UI
  storage.js             the only module that touches IndexedDB; schema versions
  vcard.js               build vCards (QR and file versions), parse scanned vCard/MECARD, plain-text card
  card.js                merge personal + business + switches into the shared field list
  backup.js              create and validate backup files
  export.js              People log export: pick columns/rows, write Excel (.xlsx) or CSV
  ics.js                 follow-up calendar file
  image.js               shrink photos/logos
  share.js               share sheet / download / text fallbacks
js/screens/              one file per screen: share, profile, people, scan, settings, about
vendor/                  local copies of the QR drawing and QR reading libraries (works offline)
icons/
tests/                   automated checks for js/core (run with Node's built-in test runner)
README.md                structure, how to run, how to publish, how to upgrade
```

**Libraries** (copied into `vendor/`, exact versions recorded in README):
- QR drawing: `qrcode-generator` (small, no dependencies).
- QR reading: `qr-scanner` (uses the phone's built-in detector where available, falls back to its own decoder on iPhone).
- Excel writing: SheetJS (`xlsx`) mini build, loaded only when an Excel export is requested so normal app start stays fast.

## 7. Error handling summary

| Situation | Behaviour |
|---|---|
| Nothing set up yet | Share screen shows setup guide |
| QR text too long | Warning naming the long fields; no code shown until fixed |
| Large photo/logo | Shrunk automatically |
| File sharing unsupported | Choice: download file or send as text |
| Camera blocked | Instructions to allow it |
| Scanned code isn't a contact | Shows the text; nothing saved |
| Invalid/newer backup file | Rejected with a clear message; current data untouched |
| Restore valid backup | Preview + confirm before replacing |
| Delete business / entry / all data | Confirmation required |
| Storage not persistent / never backed up | Reminder in Settings and About |

## 8. Testing

**Automated (tests/, Node test runner, `js/core` only):**
- vCard building: personal + business merge, overrides, switched-off and empty fields, special characters and accents, escaping, photo/logo only in file version.
- QR size check at and around the limit.
- Parsing scanned vCard 3.0/4.0 and MECARD.
- Plain-text card format.
- Backup: round trip, rejecting wrong/newer files.
- Export: column choice (contacts / notes / both), event filter, phone numbers kept as text in Excel, CSV escaping; .ics output.

**Manual checklist on real phones (iPhone + Android):**
- Scan the QR code with the iPhone Camera and Android Camera / Google Lens; confirm one-tap save with accents intact.
- Send card via WhatsApp and email; open and save the file on both phones; photo and logo appear.
- Text fallback produces a readable message.
- Scan another app's QR card into People.
- Follow-up reminder lands in the calendar; Excel export opens in Excel / Google Sheets on the phone with phone numbers intact; CSV opens too.
- Install to home screen on both; works in flight mode.
- Backup on one phone, restore on another.
- Tune the QR size limit based on results.

## 9. Out of scope (for now)

- Logo/photo delivered via QR scan (needs online hosting).
- App store release (path kept open via Capacitor).
- Accounts, sync between devices, analytics on who viewed a card.
- Reading paper business cards (OCR).
- In-app notifications.
