import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, paint) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = paint(x, y, size);
      const i = row + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function paint(x, y, size) {
  const bg = [15, 118, 110];
  const fg = [236, 253, 245];
  const cx = size / 2;
  const cy = size * 0.52;
  const dx = (x - cx) / size;
  const dy = (y - cy) / size;
  if (y < size * 0.08 || y > size * 0.92 || x < size * 0.08 || x > size * 0.92) {
    return bg;
  }
  const inBox =
    Math.abs(dx) < 0.28 && dy > -0.22 && dy < 0.26 && Math.abs(dy) + Math.abs(dx) * 0.15 < 0.28;
  const lid = Math.abs(dx) < 0.32 && dy > -0.34 && dy < -0.2;
  const stripe = Math.abs(dx) < 0.06 && dy > -0.18 && dy < 0.22;
  if (inBox || lid || stripe) return fg;
  return bg;
}

writeFileSync(join(outDir, "icon-192.png"), png(192, paint));
writeFileSync(join(outDir, "icon-512.png"), png(512, paint));
writeFileSync(join(outDir, "apple-touch-icon.png"), png(180, paint));
createHash("sha256");
console.log("icons written");
