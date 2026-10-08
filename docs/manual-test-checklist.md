# Manual test checklist (real phones)

Run after publishing to GitHub Pages; the camera and install need HTTPS. Use one iPhone and one Android phone. Tick each item on both.

## Install and offline
- [ ] iPhone: Safari → Share → Add to Home Screen. Icon and name "Connecta" appear.
- [ ] Android: Chrome → Install app. Icon appears.
- [ ] Open from the home screen; turn on flight mode; close and reopen. Every screen still works.

## Set up
- [ ] Add photo, name with an accent (e.g. "Zoë"), mobile, email.
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
- [ ] Reminder: the follow-up appears in the phone calendar on the right date with a 9am alert.
- [ ] Save contact from the log opens the phone's contact screen.
- [ ] Export Excel: opens in Excel or Google Sheets on the phone. Phone numbers keep their leading 0 and +.
- [ ] Export CSV opens too.
- [ ] Export one event only, notes only.

## Scan their card
- [ ] Scan a Connecta card from another phone into People, then Save to my contacts.
- [ ] Scan a card from another app (e.g. Blinq/HiHello QR) if available.
- [ ] Scan a website QR: shows "Not a contact card"; nothing saved.
- [ ] Deny camera permission: the help text appears.

## Backup
- [ ] Back up on phone A; save to Files/Drive.
- [ ] Restore on phone B. Everything matches, including images.
- [ ] Restore a non-backup file: refused, nothing changed.

## About
- [ ] The ⓘ icon opens About from every screen; "Backup and store your data" shows the last backup date.
- [ ] "Problems or suggestions?" opens an email to Liezljvv74@Gmail.com.
