// QR code for the Share screen (spec §4.3).

// ponytail: starting guess for "reliably scannable from a phone screen"; tune after the real-phone checks.
export const QR_MAX_BYTES = 1000;

export const byteLength = text => new TextEncoder().encode(text).length;

export const fitsQr = text => byteLength(text) <= QR_MAX_BYTES;

export function qrSvg(text, lib = globalThis.qrcode) {
  const qr = lib(0, 'M');
  // The library reads one byte per character, so hand it the UTF-8 bytes to keep accents intact.
  qr.addData(String.fromCharCode(...new TextEncoder().encode(text)), 'Byte');
  qr.make();
  return qr.createSvgTag(4, 4);
}
