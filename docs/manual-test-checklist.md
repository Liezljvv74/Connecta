# Manual test checklist (real phones)

Run after publishing to GitHub Pages; the camera and install need HTTPS. Use one iPhone and one Android phone. Tick each item on both.

## Install and offline
- [ ] iPhone: Safari → Share → Add to Home Screen. Icon and name "Connecta" appear.
- [ ] Android: Chrome → Install app. Icon appears.
- [ ] Open from the home screen; turn on flight mode; close and reopen. Every screen still works.

## Set up
- [ ] Add photo, name with an accent (e.g. "Zoë"), mobile, email. A photo taken upright on the phone shows upright (not sideways).
- [ ] Each field shows "(max N characters)" and stops accepting text at the limit.
- [ ] Add two businesses with logos; one with its own email.

## QR scanning
- [ ] iPhone Camera scans the QR on the Android screen. One tap shows the contact with correct name (accent intact), business, email; Save works.
- [ ] Android Camera / Google Lens scans the QR on the iPhone screen. Same checks.
- [ ] Switch off Mobile; scan again. The mobile number is not in the contact.
- [ ] Fill every field to its limit. Scanning still works quickly; if not, lower `QR_MAX_BYTES` in `js/core/qr.js` and the limits in `js/core/model.js`.
- [ ] The screen does not dim while the QR is showing.

## Send card
- [ ] Send via WhatsApp. The recipient opens the .vcf and saves it; photo and logo appear.
- [ ] Send via email. Same checks.
- [ ] If the phone has no file sharing: Download and Send-as-text both work.

## People I met
- [ ] Log this person after sharing; event pre-filled on the next entry.
- [ ] Reminder: a calendar file is downloaded (Android) or offered in the share list (iPhone). Opening the file adds the follow-up on the right date with a 9am alert.
- [ ] Save contact from the log opens the phone's contact screen.
- [ ] Export Excel: opens in Excel or Google Sheets on the phone. Phone numbers keep their leading 0 and +.
- [ ] Export CSV opens too.
- [ ] Export one event only, notes only.

## Scan their card
- [ ] Scan a Connecta card from another phone into People, then Save to my contacts.
- [ ] Scan a card from another app (e.g. Blinq/HiHello QR) if available.
- [ ] Scan a website QR: shows "Not a contact card"; nothing saved.
- [ ] Scan → Business card: the live camera shows; hold a paper card in front of it and tap Take photo (also try one held sideways, and "Choose a photo instead"). The People form opens filled in; time it (first time includes a ~10 MB download).
- [ ] Fresh install on Wi-Fi: open Connecta, wait a minute, turn on flight mode, then read a card: it works without ever having scanned one online.
- [ ] Turn on flight mode and read another card: it still works.
- [ ] Open Connecta: the phone asks for location once. Add a person: Date met shows today (editable); Event already shows where you are (e.g. a venue and town) and can be edited. Refuse location: no error; Event shows the last event you typed (empty if none).
- [ ] People → Add to my contacts: people not saved yet are ticked; All / None / Not saved yet work; the button shows the count. Save → one file with everyone ticked; import it once (ⓘ steps); all of them appear in Contacts. After importing, tap Done in Connecta: they show ✓ Saved and are not ticked next time; Not yet: no ✓, and they are still ticked next time. Edit someone's phone: the ✓ goes away.
- [ ] Save a new person → "Also save … to your phone's contacts?" → Yes → iPhone: the contact opens, tap Create New Contact. Android: the contact file downloads and a short message points to ⓘ → Saving people to your phone's contacts; follow those steps (open it, Contacts, Allow, Save). iPhone: check whether Contacts is in the share list, else Save to Files → open → Create New Contact. Check the contact has name, company, phone, email. Not now just saves to People.
- [ ] Deny camera permission: the help text appears.

## Backup
- [ ] Back up on phone A; save to Files/Drive.
- [ ] Restore on phone B. Everything matches, including images.
- [ ] Restore a non-backup file: refused, nothing changed.

## About
- [ ] The ⓘ icon opens About from every screen; "Backup and store your data" shows the last backup date.
- [ ] "Problems or suggestions?" opens an email to Liezljvv74@Gmail.com.
