// scripts/config.js: where firm config and artwork come from. Tests and preflight point the two env
// variables at fixtures; the shipped plugin uses the files beside this module.
const fs = require('fs');
const path = require('path');

function firmConfigPath() { return process.env.KENYA_CONVEYANCING_FIRM_CONFIG || path.join(__dirname, 'firm-config.json'); }
function loadFirmConfig() {
  const p = firmConfigPath();
  if (!fs.existsSync(p)) { console.error(`\nREFUSED: firm-config.json not found at ${p}. No document was written.\n`); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function assetsDir() { return process.env.KENYA_CONVEYANCING_ASSETS_DIR || path.join(__dirname, 'assets'); }

// Pixel size of a PNG (IHDR) or a baseline/progressive JPEG (first SOF marker). Returns null for anything else.
function imageSize(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { type: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { type: 'jpg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return null;
}

function loadImage(base) {
  for (const ext of ['png', 'jpeg', 'jpg']) {
    const p = path.join(assetsDir(), `${base}.${ext}`);
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p);
      const size = imageSize(data);
      if (!size) { console.error(`\nREFUSED: ${p} is not a readable PNG or JPEG.\n`); process.exit(1); }
      return { data, type: size.type, path: p, width: size.width, height: size.height };
    }
  }
  return null;
}

module.exports = { firmConfigPath, loadFirmConfig, assetsDir, imageSize, loadImage };
