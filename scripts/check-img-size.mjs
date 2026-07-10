import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imgPath = path.join(__dirname, '..', 'public', 'assets', 'person-sprites.jpg');

const buf = fs.readFileSync(imgPath);

const marker = buf.readUInt16BE(0);
if (marker !== 0xFFD8) {
  console.error('Not a JPEG');
  process.exit(1);
}

let offset = 2;
while (offset < buf.length) {
  const marker = buf.readUInt16BE(offset);
  const length = buf.readUInt16BE(offset + 2);
  
  if (marker === 0xFFC0 || marker === 0xFFC1 || marker === 0xFFC2) {
    const height = buf.readUInt16BE(offset + 5);
    const width = buf.readUInt16BE(offset + 7);
    console.log(`JPEG dimensions: ${width} x ${height}`);
    break;
  }
  
  offset += 2 + length;
}
