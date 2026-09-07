#!/usr/bin/env node
/*
 * apply-mak-theme.js
 * Bakes the MAK & Partners dark house theme into the built Conveyancing Tracker
 * artifact (MAK marketplace copy only). Idempotent: re-running replaces the
 * previously injected block rather than stacking a second one.
 *
 * It embeds the cream/gold MAK logo as a data URI so the artifact stays a
 * single self-contained file for CoWork.
 *
 *   node artifact/apply-mak-theme.js
 *   node artifact/apply-mak-theme.js --in assets/artifact-template.html
 *
 * Run this AFTER build-artifact.js (which regenerates artifact-template.html
 * from the shared shell + view.js and would drop the theme).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const scripts = path.join(__dirname, '..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

const htmlPath = path.resolve(scripts, arg('--in', 'assets/artifact-template.html'));
const cssPath = path.resolve(scripts, 'assets/mak-theme.css');
const logoPath = path.resolve(scripts, 'assets/mak-logo-cream.png');

for (const p of [htmlPath, cssPath, logoPath]) {
  if (!fs.existsSync(p)) { console.error('ERROR: missing', p); process.exit(1); }
}

let css = fs.readFileSync(cssPath, 'utf8');
const logoB64 = fs.readFileSync(logoPath).toString('base64');
css = css.split('__MAK_LOGO_DATAURI__').join(`data:image/png;base64,${logoB64}`);

const block = `<style id="mak-theme">\n${css}\n</style>`;
let html = fs.readFileSync(htmlPath, 'utf8');

const re = /<style id="mak-theme">[\s\S]*?<\/style>/;
if (re.test(html)) {
  html = html.replace(re, block);
  console.log('Replaced existing MAK theme block.');
} else if (html.includes('</head>')) {
  html = html.replace('</head>', `${block}\n</head>`);
  console.log('Injected MAK theme block before </head>.');
} else {
  console.error('ERROR: no </head> found in', htmlPath);
  process.exit(1);
}

fs.writeFileSync(htmlPath, html);
console.log('Wrote', htmlPath, `(logo ${Math.round(logoB64.length / 1024)}kb inlined)`);
