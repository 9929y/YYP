#!/usr/bin/env node
/**
 * Writes seven 800×800 fully transparent PNGs for the projects hub carousel.
 * Zero new dependencies — uses Node zlib only.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets/images/projects/placeholders');
const SIZE = 800;
const COUNT = 7;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function transparentPng(width, height) {
  // RGBA, all zeros (fully transparent). Each scanline starts with filter byte 0.
  const row = Buffer.alloc(1 + width * 4, 0);
  const raw = Buffer.alloc(height * row.length);
  for (let y = 0; y < height; y++) {
    row.copy(raw, y * row.length);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const png = transparentPng(SIZE, SIZE);

for (let i = 1; i <= COUNT; i++) {
  const name = `card-${String(i).padStart(2, '0')}.png`;
  const dest = path.join(OUT_DIR, name);
  fs.writeFileSync(dest, png);
  console.log(`wrote ${path.relative(ROOT, dest)} (${png.length} bytes)`);
}
