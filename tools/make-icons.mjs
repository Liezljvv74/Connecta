// Generates the app icons (light-blue square, white card, three dark-blue QR-style corner marks).
// Run: node tools/make-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const LIGHT_BLUE = [151, 175, 218]; // #97AFDA, logo blue 40% lighter
const DARK_BLUE = [49, 73, 116]; // #314974, logo blue 40% darker
const WHITE = [255, 255, 255];

function pixel(x, y) {
  if (x < 0.18 || x > 0.82 || y < 0.18 || y > 0.82) return LIGHT_BLUE;
  for (const [cx, cy] of [[0.36, 0.36], [0.64, 0.36], [0.36, 0.64]]) {
    const m = Math.max(Math.abs(x - cx), Math.abs(y - cy));
    if (m < 0.035 || (m > 0.065 && m < 0.1)) return DARK_BLUE;
  }
  return WHITE;
}

function png(size) {
  const row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel((x + 0.5) / size, (y + 0.5) / size);
      raw.set([r, g, b, 255], y * row + 1 + x * 4);
    }
  }
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

mkdirSync('icons', { recursive: true });
for (const size of [180, 192, 512]) writeFileSync(`icons/icon-${size}.png`, png(size));
