# Connecta

Your business card on your phone: share chosen contact details per business by QR code or contact file, read other people's cards (QR or paper), and keep a log of the people you meet. Installable web app (PWA) for iPhone and Android, no server, no accounts. Everything is stored on the phone; the only thing ever sent out is your coordinates, to OpenStreetMap, to name the place you are at (see Data and privacy).

Design: `docs/superpowers/specs/2026-10-08-connecta-mobile-business-card-design.md` (written before paper-card reading and the place lookup were added; its "out of scope" list is partly outdated).
Phone test list: `docs/manual-test-checklist.md`.

## What it does

Five tabs plus ⓘ About (the About screen explains all of this to the user, with phone-specific steps).

| Screen | What it does |
|---|---|
| **Share** (home) | Shows the QR code for the chosen business, with a switcher when there is more than one. Each detail has a toggle, "Sharing with this person", to switch it off for this one person; the toggles reset when the screen is reopened. **Send card** shares the contact file (.vcf, with photo and logo) through the phone's share sheet; without file sharing it offers download, text message or email. **Log this person** opens the People form. The screen stays awake while the QR code is showing. If the card is too long for one QR code, the longest fields are suggested for switching off. |
| **People** | The log of people met: name, company, phone, email, website, other details, event, notes, follow-up date, date met, which business card was given and how they were added. Event is pre-filled with the current place name (or the last event typed) and Date met with today. Search covers name, company, event and notes. Per person: **Reminder** (a calendar .ics file for the follow-up date, with a 9am alert, that the user opens to add to their calendar), **Save contact** (a .vcf file), Edit, Delete. **Add to my contacts** saves everyone ticked into one .vcf; people are marked "✓ Saved to contacts" only after the user confirms the import. **Export to Excel** (.xlsx, or CSV) with a choice of contact details, event notes, and one event or everyone. |
| **Scan** | **QR code** mode reads someone's QR business card with the camera and shows the details with "Add to People I met" and "Save to my contacts". **Business card** mode photographs a paper card (or picks a photo) and reads it on the phone; the People form opens pre-filled for checking. Sideways photos are handled. |
| **Profile** | My details shared by every business (name, photo, mobile, work phone, email, website, address, LinkedIn/social link) and the list of businesses. Each business has a name, logo, job title, its own values for any detail (overriding the personal ones) and which details are shared by default. Each field has a character limit, shown in the form, so a full card fits in one QR code. |
| **Settings** | **Back up now** (one JSON file with everything), **Restore from backup** (confirmed before anything is replaced; refuses files from a newer app version or damaged files), **Delete all data** (type DELETE to confirm). |
| **About** | What the app does, privacy, backups, installing, how people receive the card, saving people to contacts step by step (Android and iPhone), tips, support email, version number. |

Other behaviour:

- **Card reading** uses Tesseract (English, Afrikaans and German). Its ~10 MB of files are downloaded in the background 5 s after the app opens, unless Android reports mobile data or Data Saver (iPhone can't tell, so it downloads on any connection), or on first use. After that it works offline.
- **Updates** install themselves: the service worker checks for a new version on every return to the app, and the app reloads once when nobody is typing. Data is not touched.
- **Offline**: every app file is cached by `sw.js`; the app asks the browser for persistent storage, but that is not guaranteed, hence the backup reminders in About.

## Data and privacy

- All data is in IndexedDB on the phone (database `connecta`, parts `me`, `businesses`, `people`, `settings`, with a `schemaVersion`). No accounts, no sync, no analytics.
- **Place lookup**: when the app opens and when a person is added, the phone's location (if permitted) is sent, coordinates only, to OpenStreetMap's Nominatim service to get a place name for Event. Nothing else is sent. If location is refused, unavailable or offline, Event falls back to the last event the user typed. The same place within 150 m reuses the last name instead of asking again.
- Files leave the phone only when the user shares, downloads, exports or backs up.
- The QR code holds plain text (vCard 3.0, at most 1000 bytes); photo and logo go only in the sent contact file. Pictures are shrunk to at most 400 px (photo as JPEG, logo as PNG) so files stay small enough for WhatsApp and email.

## Run it locally

```
python -m http.server 8080
```
Open http://localhost:8080. (The camera, location and offline mode need `localhost` or HTTPS.)

## Tests

```
npm test
```
Uses Node's built-in test runner (Node 22+). There is nothing to install. The tests cover the core modules and UI helpers, that every app file is cached and exists, that the version numbers match, and that `sw.js` is stamped.

## How the code is organised

| Folder / file | What lives there |
|---|---|
| `index.html` | The shell: header, `<main>`, the five tabs. Screens are loaded into it. |
| `js/app.js` | Loads data, switches screens by URL hash (`#share`, `#people`, …), starts the place lookup, registers offline support and the update check, starts the card-reading download. |
| `js/ui.js` | Shared UI helpers: HTML escaping (`esc`, used for every typed or scanned value), toast, dialogs, file picker, script loader, keep-screen-awake. |
| `js/version.js` | App version and the support email shown in About. |
| `js/core/` | All logic, no screen code: contact cards and sharing rules (`card.js`), vCard build/parse (`vcard.js`), QR (`qr.js`), paper-card reading (`ocr.js`, `cardtext.js`), place lookup (`place.js`), sharing and saving files (`share.js`), backup (`backup.js`), Excel/CSV export (`export.js`), calendar file (`ics.js`), image shrinking (`image.js`). Reusable by any future UI. |
| `js/core/storage.js` | The only file that touches IndexedDB. Data has a `schemaVersion`; upgrades go in `migrate()` in `model.js`. |
| `js/core/model.js` | Field lists, labels, the per-field character limits (`MAX_LENGTHS`) that keep a full card inside one QR code, and the shape of a business and a person. |
| `js/screens/` | One file per screen. Each exports `render(root, ctx, params)` and may return a cleanup function. |
| `css/app.css` | All styling. |
| `vendor/` | Local copies of libraries (no internet needed at runtime). |
| `sw.js` | Offline cache. Every app file must be listed in `FILES` (a test checks this). Card-reading files are cached separately under `OCR_CACHE` and kept across updates. |
| `manifest.webmanifest`, `icons/`, `Public/` | Install manifest, app icons (made by `tools/make-icons.mjs`), the logo. |
| `tools/` | `stamp.mjs` and `build-hash.mjs` (release fingerprint), `make-icons.mjs`. |
| `tests/` | Node tests for the core modules, the UI helpers, the theme colours and `sw.js`. |
| `docs/` | The design spec and the manual phone-test checklist. |

## Libraries (in `vendor/`)

| Library | Version | Used for |
|---|---|---|
| qrcode-generator | 1.4.4 | Drawing the QR code |
| qr-scanner | 1.4.2 | Reading QR codes with the camera |
| SheetJS xlsx (mini) | 0.20.3 | Excel export (loaded only when exporting) |
| Tesseract.js (+ core 6.0.0, English, Afrikaans and German `best_int` data) | 6.0.1 | Reading paper business cards (`vendor/tesseract/`, ~10 MB, downloaded in the background or on first use; if you replace these files, rename `OCR_CACHE` in `sw.js`) |

## Changing the support email

Edit `SUPPORT_EMAIL` in `js/version.js`, then release a new version (below).

## Releasing a new version

1. Change the code.
2. Bump `APP_VERSION` in `js/version.js` **and** `VERSION` in `sw.js` to the same number (a test checks they match). This is the number shown in About.
3. Run `npm run stamp`. It writes a fingerprint of all app files into `sw.js`, so phones always fetch the new files. `npm test` fails if you forget.
4. Run `npm test`, then commit and push to `main`. Phones pick up the update the next time the app is opened online (also when returning to an already open app).

## Publishing (GitHub Pages, free)

Repository: https://github.com/Liezljvv74/Connecta

1. Repository → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
2. The app's link is `https://liezljvv74.github.io/Connecta/`. Share that link with the group.

## Limits of a web app

- A web app cannot write to the phone's contacts or calendar by itself. Connecta makes the contact or calendar file and the user adds it with a few taps (About explains how on Android and iPhone). Android's Chrome only downloads such files; iPhone offers the share list.
- Install needs Safari on iPhone and Chrome on Android (see About → Installing).
- iPhones can clear web-app data when storage runs low or the app is unused for a long time, hence backups.

## Upgrading later

- **Framework (e.g. React):** keep `js/core/` as it is and rebuild only `js/screens/`.
- **App stores:** wrap the app with Capacitor (https://capacitorjs.com). Storage, sharing, contacts, calendar and camera access then have native equivalents.
- **Logo/photo in the scanned card:** needs online hosting of each card (out of scope for now; see the spec §9).
