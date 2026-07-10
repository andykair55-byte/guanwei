const fs = require('fs');
const path = require('path');

const PNG_PATH = path.join(__dirname, '..', 'docs', '1.front', 'person.png');
const JPG_PATH = path.join(__dirname, '..', 'docs', '1.front', 'person.jpg');

let imgPath;
if (fs.existsSync(PNG_PATH)) imgPath = PNG_PATH;
else if (fs.existsSync(JPG_PATH)) imgPath = JPG_PATH;
else {
  console.error('No image found');
  process.exit(1);
}

const sharp = require('sharp');

(async () => {
  const img = sharp(imgPath);
  const meta = await img.metadata();
  const { width, height } = meta;
  console.log(`Image: ${width} x ${height}, format: ${meta.format}`);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;

  const bgR = data[0], bgG = data[1], bgB = data[2];
  console.log(`BG: R=${bgR} G=${bgG} B=${bgB}`);
  console.log('');

  const tol = 20;

  function isBg(x, y) {
    const idx = (y * width + x) * channels;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    return Math.abs(r - bgR) < tol && Math.abs(g - bgG) < tol && Math.abs(b - bgB) < tol;
  }

  function bbox(x1, y1, x2, y2) {
    let minX = x2, minY = y2, maxX = x1, maxY = y1;
    let found = false;
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        if (!isBg(x, y)) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return found ? { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
  }

  console.log('=== Character Rows (left 300px) ===');
  const rows = [];
  let inRow = false, rs = 0;
  for (let y = 0; y < height; y++) {
    let has = false;
    for (let x = 0; x < 300; x++) {
      if (!isBg(x, y)) { has = true; break; }
    }
    if (has && !inRow) { inRow = true; rs = y; }
    if (!has && inRow) {
      inRow = false;
      const bb = bbox(0, rs, 300, y);
      if (bb) rows.push({ start: rs, end: y - 1, bbox: bb });
    }
  }
  rows.forEach((r, i) => {
    const b = r.bbox;
    console.log(`Row ${i+1}: y=${r.start}-${r.end} h=${r.end-r.start+1} | bbox x=${b.minX}-${b.maxX} y=${b.minY}-${b.maxY} w=${b.w} h=${b.h}`);
  });

  console.log('');
  console.log('=== Top Buildings (x=280-1080, y=0-230) ===');
  const topB = [];
  let inB = false, bs = 0;
  for (let x = 280; x < 1080; x++) {
    let has = false;
    for (let y = 0; y < 230; y++) {
      if (!isBg(x, y)) { has = true; break; }
    }
    if (has && !inB) { inB = true; bs = x; }
    if (!has && inB) {
      inB = false;
      const bb = bbox(bs, 0, x-1, 230);
      if (bb) topB.push({ sx: bs, ex: x - 1, bb });
    }
  }
  topB.forEach((b, i) => {
    const bb = b.bb;
    console.log(`Top ${i+1}: x=${b.sx}-${b.ex} | bbox x=${bb.minX}-${bb.maxX} y=${bb.minY}-${bb.maxY} w=${bb.w} h=${bb.h}`);
  });

  console.log('');
  console.log('=== Bottom Buildings (x=280-1080, y=230-460) ===');
  const botB = [];
  inB = false; bs = 0;
  for (let x = 280; x < 1080; x++) {
    let has = false;
    for (let y = 230; y < 460; y++) {
      if (!isBg(x, y)) { has = true; break; }
    }
    if (has && !inB) { inB = true; bs = x; }
    if (!has && inB) {
      inB = false;
      const bb = bbox(bs, 230, x-1, 460);
      if (bb) botB.push({ sx: bs, ex: x - 1, bb });
    }
  }
  botB.forEach((b, i) => {
    const bb = b.bb;
    console.log(`Bot ${i+1}: x=${b.sx}-${b.ex} | bbox x=${bb.minX}-${bb.maxX} y=${bb.minY}-${bb.maxY} w=${bb.w} h=${bb.h}`);
  });

  if (rows.length > 0) {
    console.log('');
    console.log('=== Chars in Row 1 (x=50-280) ===');
    const r1 = rows[0];
    const chars = [];
    let inC = false, cs = 0;
    for (let x = 50; x < 280; x++) {
      let has = false;
      for (let y = r1.start; y <= r1.end; y++) {
        if (!isBg(x, y)) { has = true; break; }
      }
      if (has && !inC) { inC = true; cs = x; }
      if (!has && inC) {
        inC = false;
        const bb = bbox(cs, r1.start, x-1, r1.end + 1);
        if (bb) chars.push({ sx: cs, ex: x - 1, bb });
      }
    }
    chars.forEach((c, i) => {
      const bb = c.bb;
      console.log(`Char ${i+1}: x=${c.sx}-${c.ex} | bbox x=${bb.minX}-${bb.maxX} y=${bb.minY}-${bb.maxY} w=${bb.w} h=${bb.h}`);
    });

    console.log('');
    console.log('=== Chars in each row ===');
    rows.forEach((row, ri) => {
      const rowChars = [];
      let inC = false, cs = 0;
      for (let x = 50; x < 280; x++) {
        let has = false;
        for (let y = row.start; y <= row.end; y++) {
          if (!isBg(x, y)) { has = true; break; }
        }
        if (has && !inC) { inC = true; cs = x; }
        if (!has && inC) {
          inC = false;
          const bb = bbox(cs, row.start, x-1, row.end + 1);
          if (bb) rowChars.push({ sx: cs, ex: x - 1, bb });
        }
      }
      console.log(`Row ${ri+1} chars:`);
      rowChars.forEach((c, i) => {
        const bb = c.bb;
        console.log(`  Char ${i+1}: srcX=${bb.minX} srcY=${bb.minY} srcW=${bb.w} srcH=${bb.h}`);
      });
    });
  }
})();
