#!/usr/bin/env node
// scripts/procedures/fetch-source.js <slug> <kenya-law-akn-url>
//
// Caches the text of an Act or regulation into _source/<slug>.txt with its provenance,
// so a procedure can quote primary law the way a form schema quotes the Ministry's own
// file. Nothing in the procedure library may quote a statute from memory.
//
// Why this exists at all: asked for the Land Control Act by name, the Kenya Law MCP in
// this project returned the Air Passenger Service Charge Act. Confidently. A procedure
// library built on recall is a hallucination engine wearing a citation.
//
// The file it writes is the evidence the lint checks propositions against. Re-run to
// refresh; the header records when it was fetched and what the law was current to.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.join(__dirname, '_source');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const [slug, url] = process.argv.slice(2);
if (!slug || !url) {
  console.error('usage: node fetch-source.js <slug> <kenya-law-akn-url>');
  console.error('  e.g. node fetch-source.js land-control-act https://new.kenyalaw.org/akn/ke/act/1967/34/eng@2022-12-31');
  process.exit(2);
}
if (!/^https:\/\/(new\.)?kenyalaw\.org\//.test(url)) {
  console.error(`refused: ${url} is not a Kenya Law URL. Primary law is cached from the official source only.`);
  process.exit(2);
}

const r = spawnSync('curl', ['-sS', '-L', '-A', UA, url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (r.status !== 0) { console.error('fetch failed:', (r.stderr || '').trim()); process.exit(1); }
const html = r.stdout || '';
if (html.length < 2000) { console.error(`fetch returned only ${html.length} bytes; refusing to cache a stub.`); process.exit(1); }

// The legislative text sits inside <la-akoma-ntoso>. Taking the whole page would cache the
// site's navigation and related-document lists as though they were law.
const open = html.indexOf('<la-akoma-ntoso');
const close = html.indexOf('</la-akoma-ntoso>');
if (open === -1 || close === -1 || close < open) {
  console.error('could not find the <la-akoma-ntoso> body on that page. Refusing to guess at what the law is.');
  process.exit(1);
}
let body = html.slice(open, close);

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&hellip;/g, '…')
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/&[lr]squo;/g, '’').replace(/&[lr]dquo;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const text = decode(
  body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
)
  .split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim())
  .filter((l, i, all) => l !== '' || (i > 0 && all[i - 1] !== ''))
  .join('\n').trim();

if (text.length < 1000) { console.error(`extracted only ${text.length} characters; refusing to cache a stub.`); process.exit(1); }

const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
const asAt = (url.match(/@([\d-]+)/) || [])[1] || 'unknown';
const header = [
  '# Cached primary law. Do not edit by hand.',
  `# slug:     ${slug}`,
  `# title:    ${(titleMatch ? decode(titleMatch[1]) : '').replace(/\s*-\s*Kenya Law\s*$/, '').trim()}`,
  `# source:   ${url}`,
  `# as at:    ${asAt}`,
  `# fetched:  ${new Date().toISOString().slice(0, 10)}`,
  '# Every proposition in a procedure schema must quote text that appears below.',
  '', '',
].join('\n');

fs.mkdirSync(SRC, { recursive: true });
const out = path.join(SRC, slug + '.txt');
fs.writeFileSync(out, header + text + '\n', 'utf8');
console.log(`cached ${text.length} characters to ${path.relative(process.cwd(), out)} (as at ${asAt})`);
