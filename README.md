# Connecta

Your business card on your phone: share chosen contact details per business by QR code or contact file, and keep a log of the people you meet. Installable web app (PWA) for iPhone and Android. All data stays on the phone.

Design: `docs/superpowers/specs/2026-10-08-connecta-mobile-business-card-design.md`

## Run it locally

```
python -m http.server 8080
```
Open http://localhost:8080. (The camera and offline mode need `localhost` or HTTPS.)

## Tests

```
npm test
```
Uses Node's built-in test runner (Node 22+). There is nothing to install.

## How the code is organised

| Folder | What lives there |
|---|---|
| `js/core/` | All logic: contact cards, QR, backup, export, calendar. No screen code. Reusable by any future UI. |
| `js/core/storage.js` | The only file that touches the phone's database. Data has a `schemaVersion`; upgrades go in `migrate()` in `model.js`. |
| `js/core/model.js` | Field lists, labels and the per-field character limits (`MAX_LENGTHS`) that keep a full card inside one QR code. |
| `js/screens/` | One file per screen. Each exports `render(root, ctx, params)`. |
| `js/app.js` | Loads data, switches screens (`#share`, `#people`, …), registers offline support. |
| `js/version.js` | App version and the support email shown in About. |
| `vendor/` | Local copies of libraries (no internet needed at runtime). |
| `sw.js` | Offline cache. Every app file must be listed in `FILES` (a test checks this). |

## Libraries (in `vendor/`)

| Library | Version | Used for |
|---|---|---|
| qrcode-generator | 1.4.4 | Drawing the QR code |
| qr-scanner | 1.4.2 | Reading QR codes with the camera |
| SheetJS xlsx (mini) | 0.20.3 | Excel export (loaded only when exporting) |

## Changing the support email

Edit `SUPPORT_EMAIL` in `js/version.js`, then release a new version (below).

## Releasing a new version

1. Change the code and run `npm test`.
2. Bump `APP_VERSION` in `js/version.js` **and** `VERSION` in `sw.js` to the same number (a test checks they match).
3. Commit and push to `main`. Phones pick up the update the next time the app is opened online.

## Publishing (GitHub Pages, free)

Repository: https://github.com/Liezljvv74/Connecta

1. Repository → Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
2. The app's link is `https://liezljvv74.github.io/Connecta/`. Share that link with the group.

## Upgrading later

- **Framework (e.g. React):** keep `js/core/` as it is and rebuild only `js/screens/`.
- **App stores:** wrap the app with Capacitor (https://capacitorjs.com). Storage, sharing and camera access then have native equivalents.
- **Logo/photo in the scanned card:** needs online hosting of each card (out of scope for now; see the spec §9).
