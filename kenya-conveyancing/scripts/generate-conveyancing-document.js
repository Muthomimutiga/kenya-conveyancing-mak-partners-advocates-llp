#!/usr/bin/env node
// Conveyancing Document Generator. Firm identity, artwork and bank details come from firm-config.json.
// Usage: node generate-conveyancing-document.js <data.json> <output.docx>
// data.json carries an "advocate" block from the firm directory for any document that names the advocate (see commands/setup-conveyancing.md).
//
// Handles:
//   sale_agreement — Agreement for Sale

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, BorderStyle, WidthType, VerticalAlign,
  UnderlineType, LineRuleType, ShadingType, PageNumber, TabStopType, PageBreak,
  ImageRun, LevelFormat,
} = require('docx');
const DOCX = require('docx'); // the whole library, handed to firm extensions (see "Firm extensions" below)
const fs   = require('fs');
const path = require('path');

const FirmLetter = require('./firm-letter.js'); // the one firm letter page (header, footer, sign-off, engagement letter)
const dataPath = process.argv[2];
const outputPath = process.argv[3];

if (!dataPath || !outputPath) {
  console.error('Usage: node generate-conveyancing-document.js <data.json> <output.docx>');
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// ─── Required-field hard-fail (no blank-field legal documents) ───────────────
// Firm rule: a generator emits complete, verbatim work product or fails loudly.
// A document that silently renders blank parties / blank price / blank
// consideration is unrecoverable if it reaches a client, so every builder
// validates its required fields before it builds anything.
function requireFields(fields, label) {
  const missing = fields.filter(k => d[k] == null || String(d[k]).trim() === '');
  if (missing.length) {
    console.error(
      `\n[${label}] cannot generate: missing required field(s):\n` +
      missing.map(k => `  - ${k}`).join('\n') +
      `\n\nCollect these (from the Conveyance Airtable record or the user) and re-run.\n` +
      `The generator will not emit a blank-field legal document.\n`
    );
    process.exit(1);
  }
}

// Numeric consistency: deposit + balance must reconcile to the purchase price.
// Catches a stale balance or a typo before it reaches a contract that would
// otherwise state two contradictory prices.
function assertMoneyConsistent() {
  const num = (v) => (v == null ? null : Number(String(v).replace(/[, ]/g, '').replace(/\/-?$/, '')));
  const price = num(d.purchase_price_figures);
  const dep = num(d.deposit_figures);
  const bal = num(d.balance_figures);
  if (price != null && dep != null && bal != null && !Number.isNaN(price + dep + bal) && Math.abs((dep + bal) - price) > 1) {
    console.error(
      `\n[money check] deposit (${d.deposit_figures}) + balance (${d.balance_figures}) ` +
      `does not equal purchase price (${d.purchase_price_figures}). Fix the figures before generating.\n`
    );
    process.exit(1);
  }
}

// VAT must equal 16% of the fees on a client-facing fee note / engagement letter
// (Advocates' Remuneration Order fees + 16% VAT). An LLM arithmetic slip on a
// statutory fee document is a real exposure, so refuse to write on a mismatch.
function assertVat(fees, vat, label) {
  const num = (v) => (v == null ? null : Number(String(v).replace(/[, ]/g, '')));
  const f = num(fees), v = num(vat);
  if (f != null && v != null && !Number.isNaN(f) && !Number.isNaN(v) && Math.abs(v - Math.round(f * 0.16)) > 1) {
    console.error(
      `\n[${label}] VAT (${vat}) is not 16% of legal fees (${fees}); expected ~${Math.round(f * 0.16)}. ` +
      `Fix the figures before generating.\n`
    );
    process.exit(1);
  }
}

// An LRA transfer/discharge instrument is lodged at the Lands Registry; a blank
// transferor/transferee/property would be a registry-grade defect. Accept either
// single-name or array party forms, but refuse to build if a side is empty.
function requireTransferParties(label) {
  const has = (v) => v != null && String(v).trim() !== '';
  const hasArr = (a) => Array.isArray(a) && a.length > 0;
  const probs = [];
  if (!has(d.property_lr_no) && !has(d.title_no)) probs.push('property LR / title number');
  if (!has(d.vendor_name) && !hasArr(d.transferors)) probs.push('transferor(s)');
  if (!has(d.purchaser_name) && !hasArr(d.transferees)) probs.push('transferee(s)');
  if (probs.length) {
    console.error(`\n[${label}] cannot generate: missing ${probs.join(', ')}. A registry instrument must not be lodged blank.\n`);
    process.exit(1);
  }
}

// ─── Firm details (loaded from firm-config.json) ─────────────────────────────
// config.js is the single place that knows where the firm's config and artwork live, so the
// generator, firm-letter.js and the tests all read one installation.
const { loadFirmConfig, loadImage, assetsDir } = require('./config');
const firmConfig   = loadFirmConfig();

// ─── Per-user advocate identity (from the firm directory, and nowhere else) ──
// The firm has several conveyancing fee earners. Anything that names or numbers
// an INDIVIDUAL advocate (who signs a letter, whose P.105 sits under a signature,
// who has conduct of the matter) must be the person running the plugin, not one
// firm-level partner. Anything that names the FIRM (the letterhead, the DRAWN BY
// block, the applicant on an LRA 84, the Commissioner for Oaths) stays firm-level
// in firm-config.json and is shared by everyone.
//
// ─── Advocate identity: who signs this document ──────────────────────────────
// One source, and only one: d.advocate, written by the drafting command from the
// firm's Team Members directory in Airtable after the sign-in step, carrying the
// Team Members record id it was read from.
//
// There is NO fallback: not to the firm partner's details, and not to any file on
// the machine. A document that names or signs for an individual advocate carries
// that advocate's own name and P.105 number, read from the directory, or it is not
// produced. Two fallbacks have been removed for the same reason, that a fee earner
// ends up signing in someone else's name: the 1.1.x firm-partner fallback signed
// every letter with the Managing Partner's P.105, and the user-config.json
// fallback ($KENYA_CONVEYANCING_USER_CONFIG, ~/.config/kenya-conveyancing/,
// ~/.kenya-conveyancing/) let a stale file on one machine sign a client's letter in
// an advocate who never saw it, and skipped the record-id check on the way past.
//
// Resolution is lazy: many conveyancing documents carry no individual-advocate
// reference and must not be refused for want of one.
function titleCaseName(s) {
  return String(s || '').toLowerCase().replace(/(^|[\s'\-.])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}
function normaliseAdvocate(src, origin) {
  if (!src || typeof src !== 'object') return null;
  const s = (k) => String(src[k] == null ? '' : src[k]).replace(/\s+/g, ' ').trim();
  const name = s('name') || s('advocate_name');
  if (!name && !(s('p105_no') || s('advocate_p105_no'))) return null;
  return {
    origin,
    source:       src._source || '',
    recordId:     s('record_id'),
    signinId:     s('signin_id'),
    name,
    nameCaps:     (s('name_caps') || s('advocate_name_caps') || name).toUpperCase(),
    p105:         (s('p105_no') || s('advocate_p105_no')).toUpperCase(),
    practiceNo:   (s('practice_no') || s('advocate_practice_no')).toUpperCase(),
    practiceYear: s('practice_year') || s('advocate_practice_no_year'),
    email:        (s('email') || s('advocate_email')).toLowerCase(),
  };
}
function refuse(reason) {
  console.error(`\nREFUSED: ${reason}\nNo document was written.\n`);
  process.exit(1);
}

// ─── Firm extensions (scripts/firm-extensions/) ──────────────────────────────
// A firm's own precedents, a document type no other firm has, belong in that firm's build and
// never in this template: the template is shared, and one firm's text in it is a leak. A build
// carries them in scripts/firm-extensions/, which the client generator lays over the template from
// the firm's own inputs, so a regenerated build keeps them. Two kinds of file are recognised:
//
//   <doc_type>.js      serves a doc_type that no built-in builder and no library form claims.
//                      module.exports = (ctx) => ({ children: [...], numbering: [...]?, pageBorders: {...}? })
//   registry-cover.js  returns a cover sheet placed before a registry instrument (the generator
//                      adds the page break and keeps the page number off the cover), or null for none.
//                      module.exports = (ctx) => [...] | null
//
// ctx = { d, docType, firmConfig, docx, scriptsDir, extensionsDir, assetsDir, refuse }. An extension
// gets the docx library through ctx and must not require() anything itself: the plugin directory
// has no node_modules at a client. With no firm-extensions directory nothing here does anything.
const EXTENSIONS_DIR = process.env.KENYA_CONVEYANCING_EXTENSIONS_DIR || path.join(__dirname, 'firm-extensions');
function loadFirmExtension(name) {
  if (!/^[a-z][a-z0-9_-]*$/.test(String(name || ''))) return null;
  const p = path.join(EXTENSIONS_DIR, name + '.js');
  if (!fs.existsSync(p)) return null;
  const mod = require(p);
  if (typeof mod !== 'function') refuse(`firm extension ${name}.js does not export a function. No document was built from it.`);
  return mod;
}
function extensionContext() {
  return { d, docType: d.doc_type, firmConfig, docx: DOCX, scriptsDir: __dirname, extensionsDir: EXTENSIONS_DIR, assetsDir: assetsDir(), refuse };
}
let EXT_RESULT = null; // what a firm-extension builder returned, read again when the document is assembled
let REGISTRY_COVER = false;

// ─── Form library (scripts/form-schemas) ──────────────────────────────────────
// Resolve {{field}} placeholders in schema text against the data file. A field the
// data does not carry resolves to an empty string; required fields are checked
// separately in buildGenericLRAForm and refused by name before anything is written.
// The four party placeholders also read the arrays. A company is passed as
// transferors: [{ company_name, is_company, reg_no }] with no vendor_name, which is
// what the Party Type Rule directs, and {{vendor_name}} used to resolve to nothing and
// print a form with no party on it.
function partyJoin(list, kind) {
  if (!Array.isArray(list)) return '';
  return list.map(p => kind === 'id' ? (p.id_no || p.reg_no || '') : (p.company_name || p.name || ''))
    .filter(x => String(x).trim() !== '').join(', ');
}
const PARTY_FALLBACK = {
  vendor_name:    () => partyJoin(d.transferors, 'name'),
  vendor_id:      () => partyJoin(d.transferors, 'id'),
  purchaser_name: () => partyJoin(d.transferees, 'name'),
  purchaser_id:   () => partyJoin(d.transferees, 'id'),
};
// Fields the schema's own author declared optional. The Ministry prints plenty of rows that
// only apply sometimes: LRA 5's registration row is labelled "Registration No.( if applicable)"
// and its field carries the prompt "where the Donee is a body corporate". An absent optional
// value is a blank the form is meant to carry, not a hole, and refusing it made a power of
// attorney to an individual donee impossible to draft. Populated when a schema loads.
const DOT_RULE = '\u2026'.repeat(10);
let optionalFields = new Set();
function fill(text, where) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\{\{(\w+)\}\}/g, (_, k) => {
      let v = d[k];
      if ((v === undefined || v === null || String(v).trim() === '') && PARTY_FALLBACK[k]) {
        const fromParty = PARTY_FALLBACK[k]();
        if (fromParty) v = fromParty;
      }
      if (v === undefined || v === null || String(v).trim() === '') {
        if (optionalFields.has(k)) {
          // A blank in a table cell is the empty box the Ministry prints and you write in.
          // A blank in running text is a dotted rule: LRA 37 prints "in favour of" followed
          // by a dot leader on each of its four share lines, and dropping the rule left the
          // unused lines reading "in favour of" and then nothing, which is a broken sentence
          // rather than a blank to complete.
          const inACell = /^detail_rows|table block|filing_box/.test(String(where || ''));
          return inACell ? '' : DOT_RULE;
        }
        refuse(`[${d.doc_type}] ${where || 'the schema'} needs the field "${k}", and the data file has no value for it. ` +
          'A {{field}} in a registry form marks a fact, not a blank the Ministry prints: the form would go out with a hole in it. ' +
          'Supply it in the data file, or take the placeholder out of the schema.');
      }
      return String(v);
    });
}

// Load a library form schema by doc_type. Returns null for a doc_type that is not
// an LRA form id at all (the caller then reports an unknown doc_type); refuses for
// an lra_NN with no schema file, and for a schema missing any field the form needs
// to be labelled correctly.
function loadFormSchema(docType) {
  // The library began as LRA forms only. The Land Control Board's consent application is
  // prescribed by the Land Control Regulations, not the land registration ones, and a
  // transaction can be void for want of it, so the family had to widen.
  if (!/^(lra|lcb)_\d+$/.test(String(docType))) return null;
  const p = path.join(__dirname, 'form-schemas', docType + '.json');
  if (!fs.existsSync(p)) refuse(`unknown doc_type "${docType}". Run node scripts/form-schemas/build-index.js and check _index.json for the forms this plugin drafts.`);
  const s = JSON.parse(fs.readFileSync(p, 'utf8'));
  optionalFields = new Set((s.custom_fields || []).filter(c => c.required === false).map(c => c.name));
  for (const k of ['form_id', 'form_number', 'regulation', 'doc_title', 'party_mode', 'body_text', 'execution']) {
    if (s[k] === undefined || s[k] === '') refuse(`[${docType}] schema is missing "${k}". A registry instrument must not be generated mislabelled.`);
  }
  return s;
}
function tryAdvocate() {
  return normaliseAdvocate(d.advocate, 'directory');
}
let advocateResolved = null;
function resolveAdvocate(label) {
  if (advocateResolved) return advocateResolved;
  const a = tryAdvocate();
  const where = label ? `[${label}] ` : '';
  if (!a) refuse(where +
    'no advocate identity was supplied. This document names or signs for an individual advocate, and the ' +
    'generator will not sign it with anyone else\'s details. The drafting command must sign in first (one ' +
    'record in the Sign-ins table of the conveyancing base), look the person up in Team Members, and pass the ' +
    '"advocate" block in the data file. A fee earner who is not in Team Members yet runs /setup-conveyancing once.');
  if (!/^rec[A-Za-z0-9]{14}$/.test(a.recordId)) refuse(where +
    'the "advocate" block carries no Team Members record_id. Identity must be read from the firm directory ' +
    'after signing in, not typed from memory. Sign in, look the person up, and pass their record id.');
  if (!a.name) refuse(where + 'the advocate block has no name.');
  if (!/^P\.105\/\d{2,6}\/\d{2,4}$/.test(a.p105)) refuse(where +
    `the P.105 number "${a.p105 || '(blank)'}" is missing or not in the form P.105/NNNN/YY. Correct it in Team Members with /setup-conveyancing.`);
  console.error(`Signing as ${a.name}, ${a.p105} [Team Members ${a.recordId}]`);
  advocateResolved = a;
  return a;
}

// True when an individual advocate (other than the firm partner) is signing.
// Used to keep engagement-letter prose sensible rather than naming the same
// person twice when the partner drafts for himself.
function hasUserAdvocate() {
  const a = tryAdvocate();
  return !!(a && a.name) && a.nameCaps !== String(firmConfig.firm_partner || '').toUpperCase();
}

function advocateName()     { return titleCaseName(resolveAdvocate().name); }
function advocateEmail()    { return resolveAdvocate().email || firmConfig.firm_email; }
function advocateNameCaps() { return resolveAdvocate().nameCaps; }

// A P.105 number identifies the advocate personally. A blank one under a
// signature is worse than no document at all, so refuse rather than emit it.
function advocateP105(label) { return resolveAdvocate(label).p105; }

// ─── Page geometry (A4) ───────────────────────────────────────────────────────
const A4_W = 11906;
const A4_H = 16838;
const LRA_TYPES     = ['lra_33', 'lra_63', 'lra_58', 'lra_84'];
const MARGIN_TOP    = 1440;
const MARGIN_BOTTOM = 1440;
const MARGIN_SIDE   = 1440;
const FIRM_NAME    = firmConfig.firm_name;
const FIRM_NAME_TC = firmConfig.firm_name_tc;
// FIRM-level: the principal / managing partner of the firm. This is NOT the
// advocate having conduct of a matter. For that, use advocateName() /
// advocateNameCaps() / advocateP105(), which read the advocate block the
// drafting command passes after signing in to the firm directory.
const FIRM_PARTNER = firmConfig.firm_partner;
const FIRM_LINE2   = firmConfig.firm_line2;
const FIRM_PO      = firmConfig.firm_po;
const FIRM_TEL     = firmConfig.firm_tel;
const FIRM_EMAIL   = firmConfig.firm_email;
const FIRM_CITY    = (firmConfig.firm_city || 'NAIROBI').toUpperCase();

// ─── Font config (from firm) ─────────────────────────────────────────────────
const FONT_BODY         = firmConfig.font_correspondence || 'Garamond';
const FONT_PLEADINGS    = firmConfig.font_court          || 'Book Antiqua';

// ─── Letterhead config ────────────────────────────────────────────────────────
const LH_MODE           = firmConfig.letterhead_mode || 'generated';
const FONT_LH           = firmConfig.font_letterhead || 'Georgia';
const LH_H1_SIZE        = firmConfig.font_size_header_line1 || 56;
const LH_H2_SIZE        = firmConfig.font_size_header_line2 || 22;
const LH_MONO_SIZE      = firmConfig.font_size_monogram     || 96;
const FIRM_HEADER_LINE1 = firmConfig.firm_name_header_line1
  || FIRM_NAME_TC.split('&')[0].trim().toUpperCase();
const FIRM_HEADER_LINE2 = firmConfig.firm_name_header_line2
  || ('& ' + (FIRM_NAME_TC.split('&')[1] || '').trim()).toUpperCase();
const FIRM_MONOGRAM     = firmConfig.firm_monogram
  || FIRM_NAME_TC.split(' ').filter(w => w.length > 2).map(w => w[0]).join('').slice(0, 3).toUpperCase();

// The letterhead artwork. firm-letter.js already loaded it through config.js, so the two modules
// can never disagree about which files a firm installed. "logo" mode takes the firm's own logo.
const LH_HEADER_IMG = LH_MODE === 'image' ? FirmLetter.HEADER_IMG
  : LH_MODE === 'logo' ? loadImage('firm-logo')
  : null;
const LH_FOOTER_IMG = LH_MODE === 'image' ? FirmLetter.FOOTER_IMG : null;

// ─── Letterhead sizing ─────────────────────────────────────────────────────────
// The render height MUST be derived from the image, never hardcoded. A fixed height silently
// distorts any letterhead whose aspect ratio differs from the one it was tuned to, and a firm's
// letterhead is its identity on the page, so it is never stretched. config.loadImage carries the
// pixel width and height of the PNG or JPEG it read.
const LH_IMG_W = 624;
function lhFitHeight(img, fallback) {
  return (img && img.width) ? Math.round(LH_IMG_W * img.height / img.width) : fallback;
}
const LH_HEADER_FIT_H = lhFitHeight(LH_HEADER_IMG, 123);
const LH_FOOTER_FIT_H = lhFitHeight(LH_FOOTER_IMG, 134);

// ─── Colours ─────────────────────────────────────────────────────────────────
// The firm's two brand colours come from firm-config.json; the literals are only the fallback for
// a config that does not carry them.
const BLACK  = '1A1A1A';
const NAVY   = firmConfig.brand_navy || '0D2458';
const NAVY_T = '1B3A7A';
const GOLD   = firmConfig.brand_gold || 'C9A12C';
const GOLD2  = firmConfig.brand_gold || 'C9A12C';
const IVORY  = 'FFFFFF';

// ─── Font helpers ─────────────────────────────────────────────────────────────
// A children array must hold runs. A bare string in one serialises into <w:p> with no
// <w:r><w:t> wrapper, and both Word and LibreOffice drop it silently: that is how every
// sale agreement's spousal consent came to declare nothing. Every helper that takes
// "children" passes them through here, so a string is wrapped instead of lost.
function asRuns(children, wrap) {
  const one = wrap || ((t) => antiqua(t));
  if (children === undefined || children === null) return [];
  if (!Array.isArray(children)) return [one(children)];
  return children.map(c => (typeof c === 'string' || typeof c === 'number') ? one(String(c)) : c);
}
function antiqua(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: FONT_PLEADINGS, size: 24, color: BLACK, ...opts });
}

// ─── Cover page paragraph helpers ────────────────────────────────────────────
function ip(children, opts = {}) {
  return new Paragraph({ shading: { fill: IVORY, type: ShadingType.CLEAR }, ...opts, children });
}
function navyBand(children, opts = {}) {
  return new Paragraph({ shading: { fill: NAVY, type: ShadingType.CLEAR }, indent: { left: -MARGIN_SIDE, right: -MARGIN_SIDE }, ...opts, children });
}
function goldRule(before = 0, after = 0, thick = false) {
  return new Paragraph({ shading: { fill: IVORY, type: ShadingType.CLEAR }, border: { bottom: { style: BorderStyle.SINGLE, size: thick ? 10 : 4, color: GOLD, space: 1 } }, spacing: { before, after }, children: [] });
}
function cvSpacer(pts) {
  return ip([], { spacing: { before: 0, after: pts } });
}

// ─── Paragraph helpers ────────────────────────────────────────────────────────
function spacingB(after = 80) {
  return { before: 0, after, line: 240, lineRule: LineRuleType.AUTO };
}

// Standard body paragraph — Book Antiqua 12pt, justified, spacing after 160
function paraB(children, opts = {}) {
  const c = asRuns(children);
  return new Paragraph({ children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED, ...opts });
}

function spacer() {
  return new Paragraph({ children: [], spacing: { before: 0, after: 160 } });
}

function spacerSm() {
  return new Paragraph({ children: [], spacing: { before: 0, after: 80 } });
}

// ─── Letterhead ───────────────────────────────────────────────────────────────
function buildLetterhead() {
  const noBorder  = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  const addressLine = new Paragraph({
    children: [new TextRun({ text: `${FIRM_LINE2} \u2022 ${FIRM_PO} \u2022 ${FIRM_TEL} \u2022 ${FIRM_EMAIL}`, font: 'Arial', color: NAVY, size: 16 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 60 }
  });
  const goldLine = new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 14, space: 1, color: GOLD } },
    spacing: { before: 120, after: 0 }
  });

  if (LH_MODE === 'image' && LH_HEADER_IMG) return [FirmLetter.firstPageSpacer()]; // the header itself is anchored in the page header (firm-letter.js)

  const headerTable = new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [6400, 2626],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders, width: { size: 6400, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 0, right: 280 }, verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({ children: [new TextRun({ text: FIRM_HEADER_LINE1, font: FONT_LH, bold: true, color: NAVY, size: LH_H1_SIZE })], spacing: { before: 0, after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: FIRM_HEADER_LINE2, font: FONT_LH, color: NAVY, size: LH_H2_SIZE, characterSpacing: 120 })], spacing: { before: 0, after: 0 } }),
            ]
          }),
          new TableCell({
            borders: noBorders, width: { size: 2626, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
            shading: { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' },
            children: [new Paragraph({ children: [new TextRun({ text: FIRM_MONOGRAM, font: FONT_LH, bold: true, color: GOLD, size: LH_MONO_SIZE })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 } })]
          })
        ]
      })
    ]
  });

  return [headerTable, goldLine, addressLine];
}

// ─── Plain page-number footer (for registry documents) ───────────────────────
function buildPageNumberFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({ children: [PageNumber.CURRENT], font: 'Garamond', color: BLACK, size: 20 }),
        ]
      })
    ]
  });
}

// ─── Footer (identical to litigation generator) ───────────────────────────────
function buildLetterheadFooter() {
  if (LH_FOOTER_IMG) {
    return new Footer({
      children: [
        new Paragraph({ children: [new ImageRun({ data: LH_FOOTER_IMG.data, transformation: { width: LH_IMG_W, height: LH_FOOTER_FIT_H }, type: LH_FOOTER_IMG.type })], spacing: { before: 0, after: 0 } })
      ]
    });
  }
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 8, space: 0, color: '000000' } },
        spacing: { before: 100 },
        children: [new TextRun({ text: FIRM_NAME_TC, font: FONT_BODY, bold: true, size: 15, color: '000000' })]
      })
    ]
  });
}

// ─── Helpers for indented clause paragraphs ───────────────────────────────────

// Top-level clause heading: "1.   INTERPRETATION" — bold, underlined
function clauseHeading(number, title) {
  return new Paragraph({
    children: [
      antiqua(`${number}.\u00a0\u00a0\u00a0 ${title}`, { bold: true, underline: { type: UnderlineType.SINGLE } })
    ],
    spacing: spacingB(80),
    alignment: AlignmentType.LEFT,
  });
}

// Sub-clause paragraph (1.1, 1.2 etc.) — hanging indent 720
function subClause(number, children) {
  const c = asRuns(children);
  return new Paragraph({
    children: [antiqua(`${number}\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 720 },
  });
}

// (a)(b)(c) sub-sub-clause — indent 1440
function subSubClause(label, children) {
  const c = asRuns(children);
  return new Paragraph({
    children: [antiqua(`${label}\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 1440, hanging: 720 },
  });
}

// (i)(ii)(iii) list — indent 2160
function romanItem(label, children) {
  const c = asRuns(children);
  return new Paragraph({
    children: [antiqua(`${label}\u00a0\u00a0\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 2160, hanging: 720 },
  });
}

// Definition paragraph inside 1.1 block — indent 1440
function definitionPara(children) {
  const c = asRuns(children);
  return new Paragraph({
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 1440 },
  });
}

// Bulleted list paragraph — same indent as definitionPara but with Word
// native bullet styling. Used for collective definitions (Change of User,
// Sale Completion Date conditions) and the Force Majeure list. Replaces the
// old literal "• " character convention which produced ugly flat-text bullets.
function bulletPara(children) {
  const c = asRuns(children);
  return new Paragraph({
    children: c,
    bullet: { level: 0 },
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720 },
  });
}

// Plain body paragraph (no indent, justified)
function bodyPara(children) {
  const c = asRuns(children);
  return new Paragraph({
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
  });
}

// Centered paragraph
function centeredPara(children, extraOpts = {}) {
  const c = asRuns(children);
  return new Paragraph({ children: c, spacing: spacingB(80), alignment: AlignmentType.CENTER, ...extraOpts });
}

// Horizontal rule paragraph (border bottom as separator)
function horizRule() {
  return new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: BLACK } },
    spacing: { before: 80, after: 80 }
  });
}

// ─── Execution / witness block helpers ────────────────────────────────────────

// Dotted line for signatures (right-aligned under witness columns)
function dottedLine(text) {
  return new Paragraph({
    children: [antiqua(text)],
    spacing: spacingB(80),
    alignment: AlignmentType.LEFT,
  });
}

// ─── Sale agreement facts: blanks, sides, parties, area, tenure, money ───────
// A fact the drafter did not have prints as a dotted rule for completion by hand. It never
// prints as the word "Unknown", and never as empty punctuation: "Messrs. Unknown of ." and
// "measuring approximately  () hectares" both reached a client draft before this.
const UNKNOWN_WORDS = /^(unknown|not known|tba|tbc|to be advised|to be confirmed|n\/?a|none|nil|-+|\?+)$/i;
function known(v) {
  const s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  return s && !UNKNOWN_WORDS.test(s) ? s : '';
}
function orDots(v) { return known(v) || DOT_RULE; }
function numOf(v) {
  if (v == null) return null;
  const s = String(v).replace(/[, ]/g, '').replace(/\/-?=?$/, '').replace(/^kshs?\.?/i, '');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function numberWords(n) {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
}
function roman(n) {
  const map = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']];
  let out = '';
  for (const [v, s] of map) while (n >= v) { out += s; n -= v; }
  return out;
}

// Which side the firm acts for. "acting_for" is the fact; "signing_for" (the "Advocates for the
// ..." line under a letter) is accepted as evidence of it, and the two may not disagree. An
// undertaking that recites "we act for the Purchaser" over a signature "Advocates for the Vendor"
// is a professional undertaking that misstates whom the firm acts for.
function sideOf(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return '';
  if (/^(the )?(purchaser|buyer)s?$/.test(s)) return 'purchaser';
  if (/^(the )?(vendor|seller)s?$/.test(s)) return 'vendor';
  return '?';
}
function actingFor(label) {
  const a = sideOf(d.acting_for), s = sideOf(d.signing_for);
  if (a === '?') refuse(`[${label}] acting_for is "${d.acting_for}". It must be "purchaser" or "vendor", the side the firm acts for in this matter.`);
  if (a && s && s !== '?' && a !== s) refuse(`[${label}] acting_for says the firm acts for the ${a}, but signing_for signs the letter as ` +
    `"Advocates for the ${d.signing_for}". One of them is wrong; correct it before anything goes to the other side.`);
  return a || (s === '?' ? '' : s);
}

// The firm's own name and address go only on the side it acts for. The other side's advocates come
// from the intake, and where nobody knows them yet they print as a dotted rule.
function saleAdvocates() {
  const side = actingFor('sale_agreement');
  const squash = (x) => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isFirm = (x) => !!known(x) && squash(x) === squash(FIRM_NAME);
  const v = { firm: known(d.vendor_advocate_firm), addr: known(d.vendor_advocate_address) };
  const p = { firm: known(d.purchaser_advocate_firm), addr: known(d.purchaser_advocate_address) };
  if (side) {
    const ours = side === 'purchaser' ? p : v, theirs = side === 'purchaser' ? v : p;
    const ourRole = side === 'purchaser' ? 'Purchaser' : 'Vendor', theirRole = side === 'purchaser' ? 'Vendor' : 'Purchaser';
    const theirKey = side === 'purchaser' ? 'vendor_advocate_firm' : 'purchaser_advocate_firm';
    if (ours.firm && !isFirm(ours.firm)) refuse(`[sale_agreement] acting_for says the firm acts for the ${side}, but the data file names ` +
      `${ours.firm} as the ${ourRole}'s advocates. The firm's own details are printed on its own side from the firm configuration.`);
    if (isFirm(theirs.firm)) refuse(`[sale_agreement] acting_for says the firm acts for the ${side}, but the data file also names ` +
      `${FIRM_NAME} as the ${theirRole}'s advocates. Put the other side's advocates in ${theirKey}, or leave it blank for completion by hand.`);
    ours.firm = FIRM_NAME;
    ours.addr = [FIRM_LINE2, FIRM_PO].map(known).filter(Boolean).join(', ');
  }
  return { vendor: v, purchaser: p, side };
}
function advocatesDefinition(a) {
  if (!a.firm) return ` means Messrs. ${DOT_RULE} of ${DOT_RULE}`;
  return ` means Messrs. ${a.firm} of ${a.addr || DOT_RULE}`;
}

// A party is an individual (name, P.O. Box, I.D. No.) or a company (name, registration number,
// P.O. Box). A company registration number is never labelled "I.D. No.", and a company has
// successors, not heirs or personal representatives.
function isCompanyParty(pre) { return d[`${pre}_is_company`] === true; }
function partyDescription(pre) {
  const box = `Post Office Box Number ${orDots(d[`${pre}_po_box`])}, ${orDots(d[`${pre}_town`])}`;
  if (isCompanyParty(pre)) {
    const reg = known(d[`${pre}_reg_no`]) || known(d[`${pre}_id`]);
    return `${d[`${pre}_name`] || ''}, a limited liability company incorporated in the Republic of Kenya (Registration No. ${reg || DOT_RULE}) of ${box}`;
  }
  return `${d[`${pre}_name`] || ''} of ${box} and I.D. No. ${orDots(d[`${pre}_id`])}`;
}

// The officers who execute for a company party: "vendor_directors" / "purchaser_directors", an
// array of names or of { name, title }. Named officers print under their titles; with none named
// the block prints the two titled signature lines for completion by hand, as the reference does.
function companyOfficers(pre) {
  const raw = Array.isArray(d[`${pre}_directors`]) ? d[`${pre}_directors`] : [];
  const defaults = ['DIRECTOR', 'DIRECTOR/SECRETARY'];
  const list = raw.map((o, i) => {
    const name = known(typeof o === 'object' && o ? o.name : o).toUpperCase();
    const title = known(typeof o === 'object' && o ? o.title : '').toUpperCase() || defaults[Math.min(i, 1)];
    return { name, title };
  }).filter(o => o.name || o.title);
  while (list.length < 2) list.push({ name: '', title: defaults[list.length] });
  return list;
}

// Land area, as given, with its unit. Acres are stated as given and converted to hectares
// exactly (1 acre = 0.404686 ha, four decimal places) because the recital is written in hectares.
function areaText() {
  const fig = known(d.property_area_figures), words = known(d.property_area_words);
  if (!fig && !words) return DOT_RULE;
  const u = known(d.property_area_unit).toLowerCase();
  const unit = !u || /^(ha|hectares?)$/.test(u) ? 'hectares' : /^(ac|acres?)$/.test(u) ? 'acres' : u;
  const n = numOf(fig);
  const unitWord = n === 1 ? unit.replace(/s$/, '') : unit;
  let s = words && fig ? `${words} (${fig}) ${unitWord}` : `${words || fig} ${unitWord}`;
  if (unit === 'acres' && n != null) s += ` (${(Math.round(n * 0.404686 * 10000) / 10000).toFixed(4)} hectares)`;
  return s;
}

// Tenure is read from "tenure", and the old "is_leasehold" flag may not contradict it: a template
// that hard-coded is_leasehold false turned a leasehold title into a freehold agreement, exit 0.
function saleTenure() {
  const t = known(d.tenure).toLowerCase();
  if (t && t !== 'freehold' && t !== 'leasehold') refuse(`[sale_agreement] tenure is "${d.tenure}". It must be "freehold" or "leasehold".`);
  if (t && typeof d.is_leasehold === 'boolean' && d.is_leasehold !== (t === 'leasehold')) refuse(`[sale_agreement] tenure is "${t}" but ` +
    `is_leasehold is ${d.is_leasehold}. The two contradict each other, so the agreement would state the wrong interest. Set is_leasehold from the tenure.`);
  const lease = t ? t === 'leasehold' : d.is_leasehold === true;
  if (lease) {
    const missing = [];
    if (!known(d.lease_term_years)) missing.push('lease_term_years (the term the lease was granted for, in years, e.g. 99; not the years remaining)');
    if (!known(d.lessor)) missing.push('lessor (who granted the lease, e.g. the Government of Kenya, a County Government or the developer)');
    if (missing.length) refuse(`[sale_agreement] the title is leasehold, so the agreement must state the lease. Pass "lease_term_years" ` +
      `and "lessor" in the data file. Missing: ${missing.join('; ')}.`);
  }
  return lease;
}

// ─── Build Agreement for Sale ──────────────────────────────────────────────────
function buildSaleAgreement() {
  requireFields(['vendor_name', 'purchaser_name', 'property_lr_no', 'purchase_price_words', 'purchase_price_figures', 'completion_date'], 'sale_agreement');
  assertMoneyConsistent();
  const isLease = saleTenure();
  const advs = saleAdvocates();
  const vendorCo = isCompanyParty('vendor'), purchaserCo = isCompanyParty('purchaser');

  // Money. A sale with no deposit says so; a deposit prints its percentage only when it is a whole
  // percentage of the price, and never a hard-coded "ten percentum" that may be false.
  const price = numOf(d.purchase_price_figures), dep = numOf(d.deposit_figures), bal = numOf(d.balance_figures);
  const noDeposit = (dep == null || dep === 0) && !known(d.deposit_words);
  if (!noDeposit) {
    const miss = ['deposit_words', 'deposit_figures', 'balance_words', 'balance_figures'].filter(k => !known(d[k]));
    if (miss.length) refuse(`[sale_agreement] a deposit is stated, so the agreement needs the deposit and the balance in words and ` +
      `figures. Missing: ${miss.join(', ')}. For a sale with no deposit, set deposit_words and deposit_figures to null.`);
  } else if (price != null && bal != null && Math.abs(bal - price) > 1) {
    refuse(`[sale_agreement] no deposit is stated, so the balance (${d.balance_figures}) must equal the purchase price ` +
      `(${d.purchase_price_figures}). Fix the figures before generating.`);
  }
  let depositPct = '';
  if (!noDeposit && price && dep) {
    const pct = Math.round((dep / price) * 100 * 1e6) / 1e6;
    if (Number.isInteger(pct) && pct > 0 && pct < 100) depositPct = ` being ${numberWords(pct)} percentum (${pct}%) of the Purchase Price`;
  }

  // Charge. A charged title names its chargee in the completion documents.
  const chargee = known(d.chargee_name);
  if (chargee && d.is_charged !== true) refuse(`[sale_agreement] chargee_name is "${chargee}" but is_charged is not true. ` +
    'A title with a chargee is charged: set is_charged to true so the Discharge of Charge is a completion document.');
  const children = [];

  // ── COVER PAGE ─────────────────────────────────────────────────────────────

  const cvT  = (text, opts = {}) => new TextRun({ text, font: FONT_BODY, size: 24, color: BLACK, ...opts });
  const cvP  = (runs, align = AlignmentType.CENTER, sp = {}) =>
    new Paragraph({ children: runs, alignment: align, spacing: { before: 0, after: 0, ...sp } });
  const cvGap  = (twips) => new Paragraph({ children: [], spacing: { before: twips, after: 0 } });

  // (standard margin provides top spacing)

  // ── DATED line ─────────────────────────────────────────────────────────────
  children.push(cvP([cvT('DATED the ____________ day of ________________________________ 202….', { bold: true })], AlignmentType.LEFT));
  children.push(cvGap(600));

  // ── Vendor ─────────────────────────────────────────────────────────────────
  children.push(cvP([cvT(d.vendor_name || '', { bold: true, size: 28 })]));
  children.push(cvGap(80));
  children.push(cvP([cvT('(the “Vendor”)')]));
  children.push(cvGap(280));

  // ── Separator ──────────────────────────────────────────────────────────────
  children.push(cvP([cvT('-TO-', { bold: true })]));
  children.push(cvGap(280));

  // ── Purchaser ──────────────────────────────────────────────────────────────
  children.push(cvP([cvT(d.purchaser_name || '', { bold: true, size: 28 })]));
  children.push(cvGap(80));
  children.push(cvP([cvT('(the “Purchaser”)')]));

  // ── Rule ───────────────────────────────────────────────────────────────────
  children.push(cvGap(400));
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLACK, space: 1 } },
    spacing: { before: 0, after: 0 },
  }));
  children.push(cvGap(280));

  // ── Title ──────────────────────────────────────────────────────────────────
  children.push(cvP([cvT('AGREEMENT FOR SALE', { bold: true })]));
  children.push(cvGap(200));
  children.push(cvP([cvT('OVER', { bold: true })]));
  children.push(cvGap(200));
  children.push(cvP([cvT(d.property_lr_no || '', { bold: true })]));

  // ── Push DRAWN BY toward bottom ────────────────────────────────────────────
  children.push(cvGap(1600));

  // ── DRAWN BY + logo ────────────────────────────────────────────────────────
  const saleLogoPath = path.join(__dirname, 'assets', 'sale-agreement-logo.png');
  const saleLogo = fs.existsSync(saleLogoPath) ? fs.readFileSync(saleLogoPath) : null;

  if (saleLogo) {
    children.push(new Paragraph({
      children: [new ImageRun({ data: saleLogo, transformation: { width: 166, height: 69 }, type: 'png' })],
      spacing: { before: 0, after: 120 }
    }));
  }
  children.push(new Paragraph({ children: [cvT('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })], spacing: { before: 0, after: 80 } }));
  children.push(new Paragraph({ children: [cvT(FIRM_NAME_TC, { bold: true })], spacing: { before: 0, after: 0 } }));
  children.push(new Paragraph({ children: [cvT(firmConfig.firm_line2 || '')], spacing: { before: 0, after: 0 } }));
  children.push(new Paragraph({ children: [cvT(firmConfig.firm_po || '')], spacing: { before: 0, after: 0 } }));
  if (firmConfig.firm_tel)   children.push(new Paragraph({ children: [cvT('Tel: ' + firmConfig.firm_tel)],     spacing: { before: 0, after: 0 } }));
  if (firmConfig.firm_email) children.push(new Paragraph({ children: [cvT('Email: ' + firmConfig.firm_email)], spacing: { before: 0, after: 0 } }));

  // ── Page break to body ─────────────────────────────────────────────────────
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── BODY ────────────────────────────────────────────────────────────────────

  // Document title
  children.push(centeredPara([
    antiqua('AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })
  ]));
  children.push(spacer());

  // THIS AGREEMENT paragraph
  children.push(bodyPara([
    antiqua('THIS AGREEMENT is made on the '),
    antiqua(d.date || '___', { bold: true }),
  ]));
  children.push(spacer());

  // BETWEEN
  children.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  children.push(spacer());

  // Vendor party block
  let vendorCapacityText = '';
  if (d.vendor_capacity) {
    vendorCapacityText = ` (acting in his/her capacity as ${d.vendor_capacity})`;
  }
  const vendorSuccessors = vendorCo ? 'its successors and assigns' : 'his/her personal representatives and assigns';
  children.push(bodyPara([
    antiqua(`${partyDescription('vendor')}${vendorCapacityText} (hereinafter called \u201cthe Vendor\u201d which expression shall where the context so admits include ${vendorSuccessors}) of the one part; and`)
  ]));
  children.push(spacer());

  // Purchaser party block
  const purchaserSuccessors = purchaserCo ? 'its successors and assigns' : 'his/her heirs, personal representatives and assigns';
  children.push(bodyPara([
    antiqua(`${partyDescription('purchaser')} (hereinafter called \u201cthe Purchaser\u201d which expression shall where the context so admits include ${purchaserSuccessors}) of the other part.`)
  ]));
  children.push(spacer());

  // WHEREAS
  children.push(bodyPara([antiqua('WHEREAS:', { bold: true })]));
  children.push(spacer());

  // Recital 1
  const leaseTerm = `${known(d.lease_term_years)} years from ${orDots(d.lease_start_date)}`;
  const tenurePhrase = isLease
    ? `the leasehold interest for a term of ${leaseTerm} granted by ${known(d.lessor)} in`
    : 'the freehold interest in';
  children.push(bodyPara([
    antiqua(`${d.vendor_name || ''} is registered as the proprietor of ${tenurePhrase} all that parcel of land known as ${d.property_lr_no || ''} situate at ${d.property_location || ''} and measuring approximately ${areaText()} or thereabouts (hereinafter referred to as \u201cthe Property\u201d).`)
  ]));
  children.push(spacer());

  // Recital 2
  children.push(bodyPara([
    antiqua('The Vendor has agreed to sell and the Purchaser has agreed to purchase the Property at the Purchase Price and upon the terms and conditions hereinafter appearing.')
  ]));
  children.push(spacer());

  // NOW IT IS HEREBY AGREED
  children.push(bodyPara([antiqua('NOW IT IS HEREBY AGREED as follows:', { bold: true })]));
  children.push(spacer());

  // ── CLAUSE 1: INTERPRETATION ─────────────────────────────────────────────
  children.push(clauseHeading('1', 'INTERPRETATION'));
  children.push(spacer());

  children.push(subClause('1.1', [
    antiqua('In this Agreement, unless the context otherwise requires, the following expressions shall have the following meanings:')
  ]));
  children.push(spacer());

  children.push(definitionPara([
    antiqua('\u201cCompletion Date\u201d', { bold: true }),
    antiqua(' means the date stipulated in or ascertained in accordance with the provisions of Clause 5 of this Agreement;')
  ]));
  if (!noDeposit) children.push(definitionPara([
    antiqua('\u201cDeposit\u201d', { bold: true }),
    antiqua(` means the sum of Kenya Shillings ${known(d.deposit_words)} (Kshs. ${known(d.deposit_figures)}/-);`)
  ]));
  children.push(definitionPara([
    antiqua('\u201cLSK Conditions\u201d', { bold: true }),
    antiqua(' means the Law Society of Kenya Conditions of Sale (2015 Edition) as the same may be amended or varied from time to time;')
  ]));
  children.push(definitionPara([
    antiqua('\u201cProperty\u201d', { bold: true }),
    antiqua(` means ${d.property_lr_no || ''}, ${d.property_location || ''};`)
  ]));
  children.push(definitionPara([
    antiqua('\u201cPurchase Price\u201d', { bold: true }),
    antiqua(` means Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/-);`)
  ]));
  children.push(definitionPara([
    antiqua('\u201cThe Vendor\u2019s Advocates\u201d', { bold: true }),
    antiqua(`${advocatesDefinition(advs.vendor)};`)
  ]));
  children.push(definitionPara([
    antiqua('\u201cThe Purchaser\u2019s Advocates\u201d', { bold: true }),
    antiqua(`${advocatesDefinition(advs.purchaser)}.`)
  ]));
  children.push(spacer());

  children.push(subClause('1.2', [
    antiqua('In this Agreement, unless the context otherwise requires:')
  ]));
  children.push(spacer());

  children.push(subSubClause('(a)', 'Words importing the singular number only shall include the plural also and vice versa, and words importing the masculine gender include the feminine gender and neuter and vice versa;'));
  children.push(subSubClause('(b)', 'The expression \u201cperson\u201d shall include any legal or natural person, partnership, trust, company, joint venture, agency, government or local authority department or other body (whether corporate or unincorporated);'));
  children.push(subSubClause('(c)', 'The expression \u201cregistration\u201d means due and effective registration of the Instrument of Transfer in the Land Registry, in favour of the Purchaser;'));
  children.push(subSubClause('(d)', 'Costs, charges, expenses or remuneration shall be deemed to include, in addition, references to any value added tax or similar tax charged or chargeable in respect thereof;'));
  children.push(subSubClause('(e)', 'The expression \u201cmonth\u201d means a calendar month;'));
  children.push(subSubClause('(f)', 'Headings to clauses are for convenience only and shall not affect the construction or interpretation of this Agreement;'));
  children.push(subSubClause('(g)', 'Where the \u201cPurchaser\u201d shall consist of two or more parties such expression shall throughout mean and include such two or more parties and each of them, and all covenants, representations, warranties, agreements and undertakings herein expressed or implied on the part of the Purchaser shall be deemed to be joint and several.'));
  children.push(spacer());

  // ── CLAUSE 2: LSK CONDITIONS ──────────────────────────────────────────────
  children.push(clauseHeading('2', 'LAW SOCIETY OF KENYA CONDITIONS OF SALE'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 The Law Society of Kenya Conditions of Sale (2015 Edition) shall apply to this Agreement and shall be deemed incorporated herein in extenso save in so far as the LSK Conditions are inconsistent with the provisions of this Agreement or are varied or excluded by the terms of this Agreement.')
  ]));
  children.push(spacer());

  // ── CLAUSE 3: AGREEMENT FOR SALE ─────────────────────────────────────────
  children.push(clauseHeading('3', 'AGREEMENT FOR SALE'));
  children.push(spacer());

  children.push(subClause('3.1', [
    antiqua(`The Property is all that piece and parcel of land known as ${d.property_lr_no || ''}, containing by measurement ${areaText()} or thereabouts.`)
  ]));

  children.push(subClause('3.2', [
    antiqua('The Vendor hereby agrees to sell and the Purchaser hereby agrees to purchase the Property together with all improvements thereon at the Purchase Price and upon the terms and conditions set out in this Agreement.')
  ]));

  const interestSold = isLease
    ? `the leasehold interest for the unexpired residue of the term of ${leaseTerm}`
    : 'the freehold interest';
  children.push(subClause('3.3', [
    antiqua(`The interest sold is ${interestSold}, free from all encumbrances.`)
  ]));
  children.push(spacer());

  // ── CLAUSE 4: PURCHASE PRICE AND DEPOSIT ─────────────────────────────────
  children.push(clauseHeading('4', 'PURCHASE PRICE AND DEPOSIT'));
  children.push(spacer());

  if (noDeposit) {
    children.push(subClause('4.1', [
      antiqua('No deposit is payable under this Agreement.')
    ]));
    children.push(subClause('4.2', [
      antiqua(`The Purchase Price of Kenya Shillings ${d.purchase_price_words} (Kshs. ${d.purchase_price_figures}/-) shall be paid in full to the Vendor\u2019s Advocates on or before the Completion Date in exchange for which the Vendor\u2019s Advocates shall release the Completion Documents to the Purchaser\u2019s Advocates.`)
    ]));
  } else {
    children.push(subClause('4.1', [
      antiqua(`The Purchaser shall upon execution of this Agreement pay the Deposit of Kenya Shillings ${known(d.deposit_words)} (Kshs. ${known(d.deposit_figures)}/-)${depositPct} to the Vendor\u2019s Advocates to hold as stakeholders in their client account pending Completion.`)
    ]));
    children.push(subClause('4.2', [
      antiqua(`The Balance of the Purchase Price, being Kenya Shillings ${known(d.balance_words)} (Kshs. ${known(d.balance_figures)}/-), shall be paid to the Vendor\u2019s Advocates on or before the Completion Date in exchange for which the Vendor\u2019s Advocates shall release the Completion Documents to the Purchaser\u2019s Advocates.`)
    ]));
  }
  children.push(spacer());

  // ── CLAUSE 5: COMPLETION ──────────────────────────────────────────────────
  children.push(clauseHeading('5', 'COMPLETION'));
  children.push(spacer());

  children.push(subClause('5.1', [
    antiqua(`The Completion Date shall be on or before ${d.completion_date || '___'}, or on such earlier or later date as the parties may mutually agree in writing.`)
  ]));

  children.push(subClause('5.2', [
    antiqua('On or before the Completion Date, the Vendor\u2019s Advocates shall deliver to the Purchaser/Purchaser\u2019s Advocates the following Completion Documents:')
  ]));
  children.push(spacer());

  // The list is numbered as it is built, so an item added or left out never skips or repeats a numeral.
  // A company vendor has no identity card, passport photographs or spouse: its directors' documents
  // and board resolution stand in their place.
  const completionDocs = [
    'Duly executed Instrument of Transfer in triplicate in favour of the Purchaser and/or their nominee;',
    'Original title document in respect of the Property;',
    'Valid Rates Clearance Certificate for the Property (valid for at least twenty-one (21) days from the Completion Date) together with receipts evidencing payment of land rates for the last three (3) years;',
  ];
  if (isLease) {
    const lessor = known(d.lessor);
    const stateLessor = /national land commission|\bnlc\b|government of (the republic of )?kenya|national government|republic of kenya|president|commissioner of lands/i.test(lessor);
    completionDocs.push('Original valid Land Rent Clearance Certificate issued by the National Land Commission, together with receipts evidencing payment of land rent for the last three (3) years;');
    completionDocs.push(stateLessor
      ? 'Valid consent of the National Land Commission to the transfer;'
      : `Valid consent of the lessor, ${lessor}, to the transfer;`);
  }
  if (d.is_agricultural) completionDocs.push('Valid consent of the Land Control Board to the transfer;');
  completionDocs.push('Copies of the latest utility bills for the Property paid up to the Completion Date;');
  if (!vendorCo) completionDocs.push('Copy of the Vendor’s National Identity Card or Passport;');
  completionDocs.push('Copy of the Vendor’s KRA PIN Certificate;');
  if (!vendorCo) {
    completionDocs.push('Three (3) coloured passport-size photographs of the Vendor;');
    completionDocs.push('Spousal consent from the Vendor’s spouse consenting to the sale of the Property;');
  } else {
    completionDocs.push('Certified copy of the Certificate of Incorporation; Copies of National Identity Cards and KRA PIN certificates of each Director; Three (3) passport-size photographs of each Director; Board Resolution authorising the sale;');
  }
  if (d.is_charged) {
    completionDocs.push(`Duly executed Discharge of Charge in respect of the Property, executed by the Chargee, ${chargee || DOT_RULE}` +
      `${d.charge_redeemed_on_completion === true ? ', the charge being redeemed on Completion' : ''};`);
  }
  completionDocs.push('Every other document necessary to enable the Purchaser to become the registered proprietor of the Property free of any encumbrance.');
  completionDocs.forEach((t, i) => children.push(romanItem(`(${roman(i + 1)})`, t)));
  children.push(spacer());

  // ── CLAUSE 6: MATTERS AFFECTING THE PROPERTY ─────────────────────────────
  children.push(clauseHeading('6', 'MATTERS AFFECTING THE PROPERTY'));
  children.push(spacer());

  children.push(subClause('6.1', [antiqua('The Property is sold subject to:')]));
  children.push(spacer());

  children.push(subSubClause('(a)', 'All subsisting easements, quasi-easements, rights of way (if any), equities, quasi-equities and overriding interests as defined under the Land Registration Act; and'));
  children.push(subSubClause('(b)', 'The acts, reservations, stipulations, conditions and other matters contained or implied in the document of title in respect of the Property, but otherwise free from encumbrances; and'));
  children.push(subSubClause('(c)', 'All present and contingent liabilities or assessments in respect of the construction, maintenance and improvement of roads and sewerage serving the Property.'));
  children.push(spacer());

  children.push(subClause('6.2', [
    antiqua('The Property is otherwise sold in the condition it is at present. The Vendor shall not be required to repair or make further improvements.')
  ]));

  children.push(subClause('6.3', [
    antiqua('Prior to the Completion Date, the Vendor shall point out the boundary beacons of the Property and shall reinstate or replace any missing beacon or beacons at no extra cost to the Purchaser.')
  ]));
  children.push(spacer());

  // ── CLAUSE 7: MOVABLES ───────────────────────────────────────────────────
  children.push(clauseHeading('7', 'MOVABLES'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 The sale includes no movables unless otherwise agreed in writing between the parties.')
  ]));
  children.push(spacer());

  // ── CLAUSE 8: VACANT POSSESSION ──────────────────────────────────────────
  children.push(clauseHeading('8', 'VACANT POSSESSION'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 The Property is sold with vacant possession. The Vendor shall deliver vacant possession of the Property to the Purchaser on the Completion Date following the payment of the Purchase Price in full.')
  ]));
  children.push(spacer());

  // ── CLAUSE 9: BREACH ─────────────────────────────────────────────────────
  children.push(clauseHeading('9', 'BREACH OF AGREEMENT BY EITHER PARTY'));
  children.push(spacer());

  children.push(subClause('9.1', [
    antiqua('If on the Completion Date the Purchaser is not ready, able or willing to complete the sale as required under this Agreement, the Vendor shall give the Purchaser twenty-one (21) days\u2019 notice in writing to comply with the Purchaser\u2019s obligations (time being of the essence). If the Purchaser shall fail to comply with such notice, the Vendor may at the Vendor\u2019s sole discretion:')
  ]));
  children.push(spacer());

  children.push(subSubClause('(a)', 'Extend the time for completion; or'));
  children.push(subSubClause('(b)', 'Rescind this Agreement by notice in writing to the Purchaser, whereupon the Purchaser shall forthwith return all documents delivered by or on behalf of the Vendor; and'));
  children.push(subSubClause('(c)', 'Forfeit ten percentum (10%) of the Purchase Price as liquidated damages, and the monies paid by the Purchaser less the forfeited amount shall be refunded within seven (7) days of such rescission.'));
  children.push(spacer());

  children.push(subClause('9.2', [
    antiqua('If the Vendor shall fail to comply with any of the conditions hereof or if the transaction fails due to breach on the part of the Vendor, the Purchaser shall give the Vendor twenty-one (21) days\u2019 notice in writing to remedy the same (time being of the essence). If the Vendor shall fail to comply, the Purchaser shall be entitled to:')
  ]));
  children.push(spacer());

  children.push(subSubClause('(a)', 'Extend the time for completion; or'));
  children.push(subSubClause('(b)', 'Rescind this Agreement by notice in writing to the Vendor; and'));
  children.push(subSubClause('(c)', 'Demand an immediate full refund of all monies paid, which shall be payable within seven (7) days of such demand.'));
  children.push(spacer());

  // ── CLAUSE 10: NON-MERGER ─────────────────────────────────────────────────
  children.push(clauseHeading('10', 'NON-MERGER'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 This Agreement shall not merge on completion of the sale and purchase of the Property and completion shall not limit, cancel or extinguish the performance of any outstanding duties or obligations under this Agreement.')
  ]));
  children.push(spacer());

  // ── CLAUSE 11: COSTS ─────────────────────────────────────────────────────
  children.push(clauseHeading('11', 'COSTS, DUTIES AND FEES'));
  children.push(spacer());

  children.push(subClause('11.1', [
    antiqua('Each party shall be responsible for the fees of its own legal advisers in connection with this Agreement and the sale and purchase of the Property.')
  ]));

  children.push(subClause('11.2', [
    antiqua('Stamp duty and registration costs payable on the Transfer of the Property to the Purchaser shall be for the account of the Purchaser.')
  ]));

  children.push(subClause('11.3', [
    antiqua('Any rates, rents, taxes and fees due to any relevant authority in respect of the Property on or before the Completion Date shall be paid by the Vendor. If the Vendor fails to pay such sums, the Purchaser may pay the same and recover them from the Purchase Price.')
  ]));
  children.push(spacer());

  // ── CLAUSE 12: GENERAL ────────────────────────────────────────────────────
  children.push(clauseHeading('12', 'GENERAL'));
  children.push(spacer());

  children.push(subClause('12.1', [
    antiqua('No failure or delay to exercise any power, right or remedy by any party shall operate as a waiver of that right, power or remedy.')
  ]));

  children.push(subClause('12.2', [
    antiqua('Each of the provisions of this Agreement is severable and distinct from the others. If any provision becomes invalid, illegal or unenforceable, the remaining provisions shall not be affected.')
  ]));

  children.push(subClause('12.3', [
    antiqua('No amendment or variation to this Agreement shall be binding unless it is in writing and duly executed by or on behalf of the parties.')
  ]));
  children.push(spacer());

  // ── CLAUSE 13: INTENTION TO BE BOUND ─────────────────────────────────────
  children.push(clauseHeading('13', 'INTENTION TO BE BOUND'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 Each of the parties hereby confirms that it has executed this Agreement with the intention to bind itself to the contents hereof.')
  ]));
  children.push(spacer());

  // ── CLAUSE 14: GOVERNING LAW ──────────────────────────────────────────────
  children.push(clauseHeading('14', 'GOVERNING LAW'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('\u00a0\u00a0\u00a0\u00a0\u00a0 This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya. Any dispute arising out of or in connection with this Agreement shall be referred to arbitration by a single arbitrator appointed by the Chairman or Vice-Chairman of the Chartered Institute of Arbitrators (Kenya Branch), whose decision shall be final and binding.')
  ]));
  children.push(spacer());

  // ── CLAUSE 15: NOTICES ────────────────────────────────────────────────────
  children.push(clauseHeading('15', 'NOTICES'));
  children.push(spacer());

  children.push(subClause('15.1', [
    antiqua('Any notice required to be given under this Agreement will only be effective:')
  ]));
  children.push(spacer());

  children.push(subSubClause('(a)', 'If by hand delivery, when delivered and upon signature of a delivery receipt;'));
  children.push(subSubClause('(b)', 'If by registered post, seven (7) days after posting;'));
  children.push(subSubClause('(c)', 'If by commercial courier, five (5) days after dispatch; and'));
  children.push(subSubClause('(d)', 'If by electronic communication, only when actually received in readable form.'));
  children.push(spacer());
  children.push(spacer());

  // ── EXECUTION: IN WITNESS WHEREOF ─────────────────────────────────────────
  children.push(bodyPara([
    antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties as of the day and year first above written.')
  ]));
  children.push(spacer());
  children.push(spacer());

  // ── VENDOR EXECUTION BLOCK ────────────────────────────────────────────────
  children.push(buildExecutionBlock(d.vendor_name, 'Vendor', 'vendor'));
  children.push(spacer());

  // ── PURCHASER EXECUTION BLOCK ─────────────────────────────────────────────
  children.push(buildExecutionBlock(d.purchaser_name, 'Purchaser', 'purchaser'));
  children.push(spacer());

  // ── SPOUSAL CONSENT ───────────────────────────────────────────────────────
  // A company vendor has no spouse; the consent is for an individual vendor who is or may be married.
  if (d.include_spousal_consent && !vendorCo) {
    children.push(spacer());
    children.push(bodyPara([
      antiqua('SPOUSAL CONSENT AND EXECUTION', { bold: true, underline: { type: UnderlineType.SINGLE } })
    ]));
    children.push(spacer());
    children.push(bodyPara([
      antiqua(`In relation to ${d.property_lr_no || ''}:`)
    ]));
    children.push(spacer());
    children.push(bodyPara([
      antiqua('I/We ............................................................. being the holder(s) of National Identity Card Number(s) ........................... and of P.O. Box Number ..................., being the spouse(s) of the Vendor hereby acknowledge and declare that:')
    ]));
    children.push(spacer());

    children.push(subClause('1.', ['I/We have full knowledge of this Agreement;']));
    children.push(subClause('2.', ['I/We understand the nature and effect of this Agreement;']));
    children.push(subClause('3.', ['Neither the Vendor nor the Purchaser has used any compulsion or threat or exercised any undue influence on me/us;']));
    children.push(subClause('4.', ['I/We have been advised to take and have taken independent legal advice regarding this Agreement.']));
    children.push(spacer());

    children.push(bodyPara([
      antiqua('AND I/WE HEREBY CONSENT to the said Agreement.', { bold: true })
    ]));
    children.push(spacer());
    children.push(spacer());
    children.push(spacer());

    children.push(bodyPara([antiqua('...........................................')]),);
    children.push(bodyPara([antiqua('Signature of spouse(s)')]));
    children.push(spacer());
    children.push(spacer());

    children.push(bodyPara([
      antiqua('I CERTIFY that the above-named spouse(s) appeared before me on the _________ day of _________________ 20_____, and acknowledged the above signature or marks to be theirs and that they had freely and voluntarily executed this instrument.')
    ]));
    children.push(spacer());
    children.push(spacer());
    children.push(spacer());

    children.push(bodyPara([antiqua('...........................................')]),);
    children.push(bodyPara([antiqua('Name and signature of person certifying')]));
    children.push(spacer());
  }

  // ── DRAWN BY (end of document) ────────────────────────────────────────────
  children.push(spacer());
  children.push(spacer());
  children.push(bodyPara([antiqua('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(bodyPara([antiqua(FIRM_NAME)]));
  children.push(bodyPara([antiqua(FIRM_LINE2)]));
  children.push(bodyPara([antiqua(FIRM_PO)]));

  return children;
}

// ─── Execution block builder ──────────────────────────────────────────────────
// Produces the "SIGNED by the Vendor/Purchaser" block with witness certification
// One execution block (the signing words, the signature, the witness or advocate's certificate)
// never breaks across a page: the witness signs on the page that carries the party's name. Keep
// with next is not honoured on every renderer, so the whole block sits in a single unsplittable row.
function keepTogether(items) {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [9026],
    borders: { top: none, bottom: none, left: none, right: none, insideH: none, insideV: none },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      borders: { top: none, bottom: none, left: none, right: none },
      width: { size: 9026, type: WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: items,
    })] })],
  });
}

function buildExecutionBlock(partyName, partyRole, pre) {
  if (pre && isCompanyParty(pre)) return buildCompanyExecutionBlock(partyName, partyRole, pre);
  const items = [];

  // Using a table for the execution block: name on left, signature space on right
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  // The signing words, the party's name and the witness certificate stay on one page: the witness
  // signs on the same page as the name, and a block split across a page break invites a challenge.
  const kp = (text, opts = {}) => new Paragraph({ children: [antiqua(text, opts)], spacing: spacingB(80), keepNext: true, keepLines: true });

  // Three columns, the way the registry's jurat is set: the signing words, the brace
  // that gathers them, then the signature. The braces used to sit between the text
  // lines in the left column, so the page printed three paragraphs whose only content
  // was a closing bracket, and the rule was longer than its column and wrapped.
  const braceCell = (n) => new TableCell({
    borders: noBorders,
    width: { size: 400, type: WidthType.DXA },
    children: Array.from({ length: n }, () => kp(')')),
  });
  items.push(new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [5400, 400, 3200],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 5400, type: WidthType.DXA },
            children: [
              kp(`SIGNED by the ${partyRole} the said`),
              kp(partyName || '', { bold: true }),
              kp('in the presence of:'),
              kp('Advocate'),
            ]
          }),
          braceCell(4),
          new TableCell({
            borders: noBorders,
            width: { size: 3200, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [antiqua('_____________________')],
                alignment: AlignmentType.CENTER,
                spacing: spacingB(80),
                keepNext: true,
              })
            ]
          })
        ]
      })
    ]
  }));

  items.push(new Paragraph({ children: [], spacing: { before: 0, after: 160 }, keepNext: true }));
  items.push(new Paragraph({ children: [antiqua(`I CERTIFY THAT I was present and saw ${partyName || ''} the ${partyRole} executing this Agreement for Sale.`)],
    spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED, keepNext: true, keepLines: true }));
  items.push(new Paragraph({ children: [], spacing: { before: 0, after: 160 }, keepNext: true }));
  items.push(kp('Signature of Witness: .............................................'));
  items.push(kp('Name: .................................................................'));
  items.push(kp('Address: ..............................................................'));
  items.push(bodyPara([antiqua('Occupation: ...........................................................')]));

  return [keepTogether(items)];
}

// A company executes under its common seal in the presence of its officers, with the advocate's
// certificate that they appeared (the firm's own template, references/sale-agreement.md). Signing a
// company "the said" as if it were a person, before one witness, is not execution by the company.
function buildCompanyExecutionBlock(partyName, partyRole, pre) {
  const items = [];
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const kp = (text, opts = {}, para = {}) => new Paragraph({ children: [antiqua(text, opts)], spacing: spacingB(80), keepNext: true, keepLines: true, ...para });
  const cell = (w, children, extra = {}) => new TableCell({ borders: noBorders, width: { size: w, type: WidthType.DXA }, children, ...extra });
  const officers = companyOfficers(pre);

  const rows = [
    new TableRow({ cantSplit: true, children: [
      cell(5400, [kp('SEALED with the Common Seal of'), kp(partyName || '', { bold: true }), kp(`the ${partyRole} in the presence of:`)]),
      cell(400, [kp(')'), kp(')'), kp(')')]),
      cell(3200, [kp('')]),
    ] }),
  ];
  officers.forEach((o) => {
    rows.push(new TableRow({ cantSplit: true, children: [
      cell(5400, [kp(''), kp(o.title, { bold: true }), kp(o.name ? o.name : 'Name: ' + DOT_RULE)]),
      cell(400, [kp(')'), kp(')'), kp(')')]),
      cell(3200, [kp(''), kp('_____________________', {}, { alignment: AlignmentType.CENTER })], { verticalAlign: VerticalAlign.BOTTOM }),
    ] }));
  });
  items.push(new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [5400, 400, 3200],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows,
  }));

  const titles = officers.map(o => titleCaseName(o.title).replace(/\/(\w)/g, (m, c) => '/' + c.toUpperCase()));
  const named = titles.length > 1 ? titles.slice(0, -1).join(', ') + ' and ' + titles[titles.length - 1] : titles[0];
  items.push(new Paragraph({ children: [], spacing: { before: 0, after: 160 }, keepNext: true }));
  items.push(new Paragraph({ children: [antiqua(`I CERTIFY that the above-named ${named} respectively appeared before me on the _________ day of _________________ 20_____, and being known to me/identified by _________________________, acknowledged the above signatures to be theirs and that they had freely and voluntarily executed this Agreement and understood its contents.`)],
    spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED, keepNext: true, keepLines: true }));
  items.push(new Paragraph({ children: [], spacing: { before: 0, after: 160 }, keepNext: true }));
  items.push(kp('..................................................'));
  items.push(bodyPara([antiqua('ADVOCATE')]));
  return [keepTogether(items)];
}


// ─── Conveyance Letter builder ────────────────────────────────────────────────
function buildConveyanceLetter() {
  // Correspondence on the letterhead: the shared firm letter page. Signed by the advocate running the plugin.
  return FirmLetter.buildLetter(d, {
    size: 24, signatoryName: advocateNameCaps(), signatoryRole: 'Advocate (' + advocateP105('conveyance_letter') + ')',
    signatoryLine2: d.signing_for ? 'Advocates for the ' + d.signing_for : '',
  });
}
// ─── Undertaking Request builder ──────────────────────────────────────────────
// Firm writes to other side asking them to give a Professional Undertaking
function buildUndertakingRequest() {
  const paras = [];
  // The side comes from acting_for (or, failing that, signing_for). It used to be hard-wired to the
  // Purchaser, so a vendor-side firm's request recited "we act for the Purchaser" over a signature
  // "Advocates for the Vendor".
  const side = actingFor('undertaking_request') || 'purchaser';
  const [ourName, ourRole, theirName, theirRole] = side === 'vendor'
    ? [d.vendor_name, 'Vendor', d.purchaser_name, 'Purchaser']
    : [d.purchaser_name, 'Purchaser', d.vendor_name, 'Vendor'];

  paras.push([
    { text: 'We refer to the above subject matter in which we act for ' },
    { text: ourName || '…', bold: true },
    { text: ` ("the ${ourRole}") while you act for ` },
    { text: theirName || '…', bold: true },
    { text: ` ("the ${theirRole}") herein.` },
  ]);
  paras.push(side === 'vendor' ? [
    { text: 'To enable our client release the completion documents to you, kindly give us your unequivocal and irrevocable Professional Undertaking to pay the balance of the Purchase Price being Kenya Shillings ' },
    { text: `${d.balance_words || '…'} (Kshs. ${d.balance_figures || '…'}/=)`, bold: true },
    { text: ' in the following terms:' },
  ] : [
    { text: 'To enable our client release the balance of the Purchase Price being Kenya Shillings ' },
    { text: `${d.balance_words || '…'} (Kshs. ${d.balance_figures || '…'}/=)`, bold: true },
    { text: ' to you, kindly give us your unequivocal and irrevocable Professional Undertaking in the following terms:' },
  ]);

  // D1's twin, found in the review of the D1 fix. This read only "that_clauses", a name that
  // appears nowhere in commands, skills or the README, while "paragraphs" is the only terms
  // field the plugin documents for any letter. A drafter following the documentation sent the
  // other side a request for a professional undertaking with no terms between the words "in the
  // following terms:" and the generic tail, silently and with exit code 0. Read the documented
  // name, keep the old one working, and refuse rather than ask for an undertaking in no terms.
  const requestTerms = [d.paragraphs, d.that_clauses, d.undertaking_terms]
    .find(v => Array.isArray(v) && v.some(t => String(t == null ? '' : t).trim() !== '')) || [];
  const cleanRequestTerms = requestTerms
    .map(t => (Array.isArray(t) ? t : String(t == null ? '' : t).trim()))
    .filter(t => (Array.isArray(t) ? t.length : t));
  if (!cleanRequestTerms.length) refuse('[undertaking_request] the request sets out no terms. Pass them in ' +
    '"paragraphs", one term per entry, each beginning "THAT ". This letter asks the other side for a ' +
    'professional undertaking, and one that names no terms asks them to promise nothing.');
  cleanRequestTerms.forEach(clause => paras.push(clause));

  paras.push(
    'THAT this Professional Undertaking will remain in force until such time that we will ' +
    'expressly release you from the same, which release shall be granted upon full compliance ' +
    'with the terms specified hereinabove.'
  );
  paras.push(
    'THAT you are solely liable and responsible for full compliance with the Undertakings, ' +
    'Covenants, and Agreements given in this matter by yourselves and, accordingly, you ' +
    'irrevocably confirm and undertake to indemnify us and keep us fully indemnified in ' +
    'respect of all loss and damage which we and/or our client may suffer by reason of any ' +
    'breach by yourselves of the aforesaid Undertakings and/or terms and conditions hereof.'
  );
  paras.push('THAT time shall be of the essence in respect of all obligations herein.');
  paras.push('THAT this undertaking shall be governed by the Laws of Kenya.');

  d.paragraphs = paras;
  d.signing_for = d.signing_for || (side === 'vendor' ? 'Vendor' : 'Purchaser');
  return buildConveyanceLetter();
}

// ─── Undertaking Letter builder ────────────────────────────────────────────────
// Firm gives its own irrevocable undertaking to the other side
function buildUndertakingLetter() {
  // The terms come from the field the plugin's own command documents, "paragraphs".
  // It used to read "clauses", a name that appears nowhere in commands, skills or the
  // README, so a drafter who followed the documentation produced an undertaking with
  // no terms in it and a blank expiry, exit code 0. A professional undertaking is the
  // advocate's personal guarantee: an empty one is refused, not printed.
  const terms = [d.undertaking_terms, d.paragraphs, d.clauses]
    .find(v => Array.isArray(v) && v.some(t => String(t == null ? '' : t).trim() !== '')) || [];
  const cleanTerms = terms.map(t => String(t == null ? '' : t).trim()).filter(Boolean);
  if (!cleanTerms.length) refuse('[undertaking_letter] the undertaking has no terms. Pass them in "paragraphs", ' +
    'one term per entry. A professional undertaking is the advocate\'s personal guarantee and will not be ' +
    'issued with nothing undertaken in it.');
  const longStop = String(d.long_stop_date == null ? '' : d.long_stop_date).trim();
  if (!longStop) refuse('[undertaking_letter] the undertaking has no expiry date. Pass "long_stop_date": the ' +
    'date the undertaking lapses. An undertaking with an open-ended expiry binds the firm indefinitely.');
  const paras = [];
  const side = actingFor('undertaking_letter') || 'purchaser';

  paras.push(side === 'vendor' ? [
    { text: 'We act for ' },
    { text: d.vendor_name || '…', bold: true },
    { text: ' ("the Vendor") in connection with the sale of the above property to your client, ' },
    { text: d.purchaser_name || '…', bold: true },
    { text: ' ("the Purchaser").' },
  ] : [
    { text: 'We act for ' },
    { text: d.purchaser_name || '…', bold: true },
    { text: ' ("the Purchaser") in connection with the purchase of the above property from your client, ' },
    { text: d.vendor_name || '…', bold: true },
    { text: ' ("the Vendor").' },
  ]);
  paras.push([
    { text: 'We hereby ' },
    { text: 'IRREVOCABLY UNDERTAKE', bold: true },
    { text: ' as follows:' },
  ]);

  cleanTerms.forEach((clause, i) => paras.push(`${i + 1}.   ${clause}`));

  paras.push([
    { text: 'This undertaking shall be effective from the date hereof until ' },
    { text: longStop, bold: true },
    { text: '.' },
  ]);

  d.paragraphs = paras;
  d.signing_for = d.signing_for || (side === 'vendor' ? 'Vendor' : 'Purchaser');
  return buildConveyanceLetter();
}

// ─── Shared transfer form builder (LRA 33, LRA 63, …) ────────────────────────
// opts: { formNo, regulation, docTitle, buildDetailRows, buildBody }
function buildTransferForm(opts) {
  const items = [];
  const TW = 8600;
  const thinBorder  = { style: BorderStyle.SINGLE, size: 4, color: BLACK, space: 0 };
  const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
  const noB         = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorder    = noB; // alias used in execution blocks

  function lp(text, opts2 = {}) {
    return new Paragraph({ children: asRuns(text, (t) => antiqua(t, opts2)), spacing: spacingB(80) });
  }
  function lpc(runs, opts2 = {}) {
    const children = asRuns(runs);
    return new Paragraph({ children, alignment: AlignmentType.CENTER, spacing: spacingB(80), ...opts2 });
  }
  function numbered(n, text) {
    return new Paragraph({ children: [antiqua(`${n}.\t${text}`)], spacing: spacingB(80), indent: { left: 360, hanging: 360 } });
  }
  function lettered(l, text) {
    return new Paragraph({ children: [antiqua(`${l}.\t${text}`)], spacing: spacingB(80), indent: { left: 720, hanging: 360 } });
  }
  // A ruled grid: the form's own column headings over one row per line of data.
  function gridTable(columns, rows) {
    const cols = Math.max(columns.length, 1);
    const cw = Math.floor(TW / cols);
    const widthOf = (i) => i === cols - 1 ? TW - cw * (cols - 1) : cw;
    const gcell = (txt, i, bold) => new TableCell({
      borders: cellBorders, width: { size: widthOf(i), type: WidthType.DXA },
      children: [new Paragraph({ children: [antiqua(txt, { bold })], spacing: spacingB(80) })],
    });
    return new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: columns.map((_, i) => widthOf(i)),
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideH: thinBorder, insideV: thinBorder },
      rows: [
        new TableRow({ children: columns.map((c, i) => gcell(c, i, true)) }),
        ...rows.map(r => new TableRow({ children: columns.map((_, i) => gcell(r[i] || '', i, false)) })),
      ],
    });
  }

  // The passport photograph box the registry requires beside a signature.
  function photoBoxTable(w, caption) {
    const photoB = { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 0 };
    return new Table({
      width: { size: w, type: WidthType.DXA },
      columnWidths: [w],
      borders: { top: photoB, bottom: photoB, left: photoB, right: photoB, insideH: noB, insideV: noB },
      rows: [new TableRow({ children: [new TableCell({
        borders: { top: photoB, bottom: photoB, left: photoB, right: photoB },
        width: { size: w, type: WidthType.DXA },
        margins: { top: 160, bottom: 160, left: 80, right: 80 },
        children: [
          new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
          new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: caption, font: 'Garamond', size: 18, color: 'BBBBBB', italics: true })], spacing: { before: 0, after: 160 } }),
          new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
          new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
        ]
      })]})],
    });
  }

  // ── Form header ──────────────────────────────────────────────────────────────
  // ── Head lines a form carries of its own, above everything else ─────────────
  // LRA 96 heads its page SECOND SCHEDULE, over the form number and the Act lines.
  if (Array.isArray(opts.headLines) && opts.headLines.length) {
    opts.headLines.forEach(line => items.push(lpc([antiqua(fill(line, 'head_lines'), { bold: true })])));
    items.push(spacer());
  }

  items.push(new Paragraph({
    children: [
      antiqua(`Form ${opts.formNo}`),
      new TextRun({ text: '\t', font: 'Garamond', size: 24 }),
      antiqua(opts.regulation),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TW }],
    spacing: spacingB(80),
  }));
  items.push(lpc('REPUBLIC OF KENYA'));
  // The lines under REPUBLIC OF KENYA, where a form sets its own (LRA 83 cites the
  // Act by number where the default cites the Regulations).
  if (Array.isArray(opts.actLines) && opts.actLines.length) {
    opts.actLines.forEach(line => items.push(lpc(fill(line, 'act_lines'))));
  } else {
    items.push(lpc('THE LAND REGISTRATION ACT'));
    items.push(lpc('THE LAND REGISTRATION (GENERAL) REGULATIONS, 2017'));
  }
  items.push(spacer());

  // ── Registry filing box — top/bottom lines, no verticals ────────────────────
  // Not every form carries one: filingBox "none" leaves it out, and an array of
  // lines gives the box the form's own wording, one line per column.
  const filingBox = opts.filingBox || 'default';
  const rCol = Math.floor(TW / 3);
  if (Array.isArray(filingBox) && filingBox.length) {
    const bCol = Math.floor(TW / filingBox.length);
    items.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: filingBox.map((_, i) => i === filingBox.length - 1 ? TW - bCol * (filingBox.length - 1) : bCol),
      borders: { top: noB, bottom: noB, left: noB, right: noB, insideH: noB, insideV: noB },
      rows: [new TableRow({ children: filingBox.map((line, i) => new TableCell({
        borders: { top: thinBorder, bottom: thinBorder, left: noB, right: noB },
        width: { size: i === filingBox.length - 1 ? TW - bCol * (filingBox.length - 1) : bCol, type: WidthType.DXA },
        // a column may carry its label over its blank, as the registry's boxes read
        children: fill(line, 'filing_box').split('\n').map(part => lp(part)),
      })) })],
    }));
  } else if (filingBox !== 'none') items.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [rCol, rCol, TW - rCol * 2],
    borders: { top: noB, bottom: noB, left: noB, right: noB, insideH: noB, insideV: noB },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: { top: thinBorder, bottom: noB, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp('Date Received')] }),
        new TableCell({ borders: { top: thinBorder, bottom: noB, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp('Presentation Book')] }),
        new TableCell({ borders: { top: thinBorder, bottom: noB, left: noB, right: noB }, width: { size: TW - rCol * 2, type: WidthType.DXA }, children: [lp('Official Fees Paid')] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: { top: noB, bottom: thinBorder, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp('\u2026\u2026\u2026')] }),
        new TableCell({ borders: { top: noB, bottom: thinBorder, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp('No\u2026\u2026\u2026')] }),
        new TableCell({ borders: { top: noB, bottom: thinBorder, left: noB, right: noB }, width: { size: TW - rCol * 2, type: WidthType.DXA }, children: [lp('Kshs\u2026\u2026\u2026')] }),
      ]}),
    ]
  }));

  items.push(spacer());
  // Lines a form prints between the filing box and its title (a matter heading, the
  // Act, the title number), verbatim and in order.
  if (Array.isArray(opts.preTitleLines) && opts.preTitleLines.length) {
    opts.preTitleLines.forEach(line => items.push(lpc([antiqua(fill(line, 'pre_title_lines'), { bold: true })])));
    items.push(spacer());
  }
  items.push(lpc(opts.docTitle));
  // The title line: the standard "<label>: <number>", nothing at all, or the lines the
  // form prints in its place (a matter heading, for one), verbatim and in order.
  const titleLine = opts.titleLine || 'default';
  if (Array.isArray(titleLine)) {
    titleLine.forEach(line => items.push(lpc([antiqua(fill(line, 'title_line'), { bold: true })])));
  } else if (titleLine !== 'none') {
    const titleNo = String(d.title_no || d.property_lr_no || '').trim();
    if (!titleNo) refuse(`[${d.doc_type}] the form prints a title number and the data file carries neither ` +
      '"property_lr_no" nor "title_no". A registry form must not be lodged with a blank title line.');
    items.push(lpc([antiqua(`${opts.titleLabel || 'TITLE NO'}: ${titleNo}`, { bold: true })]));
  }
  items.push(spacer());

  // ── Parties (allow override for forms like LRA 58 that use different party types) ─
  // partyMode: two_party (default) names both sides; single_party names only the first
  // side; none names neither (a form whose facts are all in its own detail rows).
  const partyMode = opts.partyMode || 'two_party';
  const transferorsAll = (opts._partyOverride?.transferors) || d.transferors || [{ name: d.vendor_name || '', id_no: d.vendor_id || '', pin: '' }];
  const transfereesAll = (opts._partyOverride?.transferees) ?? d.transferees ?? [{ name: d.purchaser_name || '', id_no: d.purchaser_id || '', pin: '' }];
  const transferors = partyMode === 'none' ? [] : transferorsAll;
  const transferees = partyMode === 'two_party' ? transfereesAll : [];

  const transferorNames = transferors.map(t => t.company_name || t.name || '').join(', ');
  const transferorIDs   = transferors.map(t => t.id_no || t.reg_no || '').join(', ');
  const transfereeNames = transferees.map(t => t.company_name || t.name || '').join(', ');
  const transfereeIDs   = transferees.map(t => t.id_no || t.reg_no || '').join(', ');

  const dLabelW = 2600;
  const dValueW = TW - dLabelW;

  // The registry's ID/ Passport/ Company Registration No. label, with the two that do
  // not apply struck through. The party decides: a company's registration number was
  // being labelled a passport because the old classifier guessed from the string, and a
  // Kenyan ID left "Company Registration No." standing.
  function idLabelRuns(idValue, parties) {
    const v = (idValue || '').trim();
    const strike = { strike: true }; // docx's TextRun option is "strike", not "strikethrough"
    const keep = (which) => [
      antiqua('ID/ ', which === 'id' ? {} : strike),
      antiqua('Passport/', which === 'passport' ? {} : strike),
      antiqua('Company Registration No.', which === 'company' ? {} : strike),
    ];
    if (!v) return [antiqua('ID/ Passport/Company Registration No.')];
    const list = Array.isArray(parties) ? parties.filter(Boolean) : [];
    if (list.length && list.every(p => p.company_name || p.is_company || (!p.id_no && p.reg_no))) return keep('company');
    if (list.length && list.some(p => p.company_name || p.is_company)) return keep('company');
    if (/^\d+$/.test(v)) return keep('id');                       // a Kenyan ID number
    if (/[\/]/.test(v) || /^[A-Za-z]{1,4}[.\-\/]/.test(v)) return keep('company'); // CPR/2009/112233, C.123
    if (/^[A-Za-z]/.test(v)) return keep('passport');
    return keep('id');
  }

  function detailRow2(label, value, valueBold = false) {
    const labelChildren = asRuns(label);
    // A value given one item per line prints one paragraph per line. A single text node
    // carrying newlines renders as a space in Word, so several prompts that promise
    // per-line entry produced one solid paragraph in the cell.
    const lines = String(value === undefined || value === null ? '' : value).split('\n');
    const valueParas = (lines.length > 1 ? lines.map(l => l.trim()).filter(Boolean) : lines)
      .map(line => new Paragraph({ children: [antiqua(line, { bold: valueBold })], spacing: spacingB(80) }));
    return new TableRow({ children: [
      new TableCell({ borders: cellBorders, width: { size: dLabelW, type: WidthType.DXA },
        children: [new Paragraph({ children: labelChildren, spacing: spacingB(80) })] }),
      new TableCell({ borders: cellBorders, width: { size: dValueW, type: WidthType.DXA },
        children: valueParas.length ? valueParas : [new Paragraph({ children: [antiqua('')], spacing: spacingB(80) })] }),
    ]});
  }

  // ── Details table (form-specific rows injected via opts) ─────────────────────
  // A form whose facts all live in its body (LRA 16, for one) has no detail rows at
  // all; a table with no rows is not a valid document part, so it is simply omitted.
  const detailRows = opts.buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs, transferors, transferees });
  if (detailRows.length) {
    items.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [dLabelW, dValueW],
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideH: thinBorder, insideV: thinBorder },
      rows: detailRows,
    }));
  }

  // ── Body (form-specific, injected via opts) ──────────────────────────────────
  items.push(spacer());
  opts.buildBody({ lp, lpc, spacer, numbered, lettered, gridTable }).forEach(p => items.push(p));
  items.push(spacer());

  // ── Execution mode ───────────────────────────────────────────────────────────
  // deed        the registry deed blocks with their verification certificate (default)
  // witnessed   one signature attested in the presence of a witness (LRA 67 and kin)
  // declaration a jurat sworn or declared before a Commissioner for Oaths
  // signature   a plain signature, name and date line
  // none        the form carries no signature of its own
  const execMode   = (opts.execution && opts.execution.mode) || 'deed';
  const signerSide = (opts.execution && opts.execution.signer) || 'both';
  const execLabel  = (opts.execution && opts.execution.signer_label) || '';
  // The section 45 certificate is on unless a form says it has none. The four
  // hand-built forms pass no execution at all, so they keep theirs.
  const deedVerification = !(opts.execution && opts.execution.verification === false);
  // An execution option may be one string for both sides, or { transferor, transferee }
  // where the two sides are worded differently (LRA 60 signs one side SIGNED by the
  // duly authorised attorneys of the and the other SIGNED AND SEALED by the ...).
  const perSide = (v, role) => (v && typeof v === 'object' && !Array.isArray(v)) ? (v[role] || '') : (v || '');
  // over is an extra block's own wording, which wins over the form's. A key the entry
  // carries wins even when it is empty: that is how a block says it has no recital of
  // its own, and a deed that misstates the authority a party signed under is the worst
  // defect this library can print. Only an absent key falls through to the form.
  const execOpt = (over, key) => (over && over[key] !== undefined)
    ? over[key]
    : (opts.execution ? opts.execution[key] : undefined);
  const signedLabelOf = (role, over, fallback) => fill(perSide(execOpt(over, 'signed_label'), role), 'execution.signed_label') || fallback;
  const recitalOf     = (role, over) => fill(perSide(execOpt(over, 'signing_recital'), role), 'execution.signing_recital');
  const cellStyleOf   = (over) => execOpt(over, 'signatory_cell') || 'default';
  const headingOf     = (role, over, fallback) => fill(perSide(execOpt(over, 'verification_heading'), role), 'execution.verification_heading') || fallback;
  // The coloured photograph cell, which not every form's execution carries.
  const wantPhoto     = (over) => {
    const v = execOpt(over, 'photograph');
    return v === undefined ? true : v !== false;
  };
  const variantOf     = (over) => execOpt(over, 'verification_variant') || 'default';
  // The common seal block and the director's certificate, which a form that routes a
  // company straight to its attorneys does not print.
  const wantSeal      = (over) => {
    const v = execOpt(over, 'company_seal');
    return v === undefined ? true : v !== false;
  };
  const CERT_HEADING  = 'Certificate of Verification under Section 45 of the Land Registration Act';
  if (execMode === 'deed' || execMode === 'witnessed') {
    items.push(lp('EXECUTION:'));
    items.push(spacer());
  }

  // ── Company execution block ───────────────────────────────────────────────────
  function companyExecutionBlock(party, role, isFirst = false, over = {}) {
    const blockItems = [];
    const roleLabel = role === 'transferor'
      ? (opts.roleLabels?.transferorSingle || opts.roleLabels?.transferor || 'Transferor')
      : (opts.roleLabels?.transfereeSingle || opts.roleLabels?.transferee || 'Transferee');
    const companyName = party.company_name || party.name || '';
    const vb = { style: BorderStyle.SINGLE, size: 4, color: BLACK, space: 0 };
    const vBorders = { top: vb, bottom: vb, left: vb, right: vb };
    const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const photoB = { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 0 };
    const padded = { top: 120, bottom: 120, left: 120, right: 120 };

    // Layout: left (wide) = header + director/secretary; right (narrow) = company seal column
    const rightW = Math.round(TW * 0.20);
    const leftW  = TW - rightW;
    const sigW   = Math.round(leftW / 2); // each signatory sub-column

    // Passport photo box — portrait: 1400 DXA wide × 2400 DXA tall (~25mm × 42mm)
    const photoBoxW = 1400;
    function photoBox() {
      return new Table({
        width: { size: photoBoxW, type: WidthType.DXA },
        columnWidths: [photoBoxW],
        borders: { top: photoB, bottom: photoB, left: photoB, right: photoB, insideH: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideV: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        rows: [new TableRow({ cantSplit: true,
          height: { value: 1400, rule: 'exact' },
          children: [new TableCell({
            borders: { top: photoB, bottom: photoB, left: photoB, right: photoB },
            margins: { top: 80, bottom: 80, left: 60, right: 60 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Insert Passport Photo', font: 'Garamond', size: 16, color: 'BBBBBB', italics: true })], spacing: { before: 0, after: 0 } }),
            ]
          })]
        })],
      });
    }

    // One signatory sub-column (Director or Secretary)
    function signatoryCell(sigTitle) {
      return new TableCell({
        borders: { top: noB, bottom: noB, left: noB, right: noB },
        width: { size: sigW, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 80, right: 80 },
        children: [
          photoBox(),
          new Paragraph({ children: [], spacing: { before: 0, after: 120 } }),
          new Paragraph({ children: [antiqua('Name\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(200) }),
          new Paragraph({ children: [antiqua('ID/Passport Number\u2026\u2026\u2026')], spacing: spacingB(80) }),
          new Paragraph({ children: [antiqua('PIN\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(80) }),
          new Paragraph({ children: [antiqua('Signature\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(240) }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua(sigTitle)], spacing: spacingB(80) }),
        ]
      });
    }

    // Inner nested table: Director | Secretary side by side (no visible borders)
    const signatoryTable = new Table({
      width: { size: leftW - 240, type: WidthType.DXA },
      columnWidths: [sigW, sigW],
      borders: { top: noB, bottom: noB, left: noB, right: noB, insideH: noB, insideV: noB },
      rows: [new TableRow({ cantSplit: true, children: [signatoryCell('Director'), signatoryCell(opts.execution ? 'Director/Secretary' : 'Secretary')] })]
    });

    if (!isFirst) blockItems.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));
    blockItems.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [leftW, rightW],
      borders: { top: vb, bottom: vb, left: vb, right: vb, insideH: vb, insideV: vb },
      rows: [

        // Rows 1 to 3 are the common seal and the director's certificate. A form that
        // routes the company straight to its attorneys prints neither. They are kept
        // regardless when there is no attorney paragraph, so a block is never empty.
        ...((wantSeal(over) || !party.attorneys) ? [

        // Row 1: Left = header + signatory table | Right = seal column (empty, column IS the box)
        new TableRow({ cantSplit: true, height: { value: 5000, rule: 'atLeast' }, children: [
          new TableCell({
            borders: vBorders, width: { size: leftW, type: WidthType.DXA },
            margins: padded, verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                children: [
                  antiqua(`Sealed with the Common Seal of the ${roleLabel} `),
                  antiqua(companyName, { bold: true }),
                ],
                spacing: spacingB(80)
              }),
              signatoryTable,
            ]
          }),
          new TableCell({
            borders: vBorders, width: { size: rightW, type: WidthType.DXA },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            verticalAlign: VerticalAlign.BOTTOM,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '\u00A0', font: 'Garamond', size: 18, color: 'BBBBBB', italics: true })], spacing: { before: 0, after: 0 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Company Seal', font: 'Garamond', size: 16, color: 'CCCCCC', italics: true })], spacing: { before: 0, after: 0 } }),
            ]
          }),
        ]}),

        // Rows 2 and 3: the section 45 certificate, unless the form has none
        ...(deedVerification ? [
        new TableRow({ cantSplit: true, children: [new TableCell({
          columnSpan: 2, borders: vBorders, margins: padded,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua(headingOf(role, over, CERT_HEADING))], spacing: spacingB(80) })]
        })]}),
        new TableRow({ cantSplit: true, children: [new TableCell({
          columnSpan: 2, borders: vBorders, margins: padded,
          children: [
            new Paragraph({
              children: [
                antiqua('I CERTIFY that the above-named Director of the '),
                antiqua(`${roleLabel} `, { bold: true }),
                antiqua(companyName, { bold: true }),
                antiqua(' appeared before me on the \u2026\u2026\u2026\u2026\u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 20\u2026\u2026\u2026\u2026 and being known to me/being identified by \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 acknowledged the above signatures or marks to be theirs and that they had freely and voluntarily executed this instrument and understood its contents.'),
              ],
              spacing: spacingB(200)
            }),
            new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
            new Paragraph({ children: [antiqua('Name and signature of person certifying')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
          ]
        })]}),
        ] : []),

        ] : []),

        // Row 4 & 5: Attorney execution — conditional, only when attorney data provided
        ...(party.attorneys ? (() => {
          const attyNames = party.attorneys.map(a => a.name || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026').join(' and ');
          const poaNos    = (party.poa_nos || ['\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026', '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026']);
          const rdnNos    = (party.rdn_nos || ['\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026', '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026']);
          return [
            // Attorney signing text
            new TableRow({ cantSplit: true, children: [new TableCell({
              columnSpan: 2, borders: vBorders, margins: padded,
              children: [
                new Paragraph({
                  children: [
                    antiqua('SIGNED', { bold: true }),
                    antiqua(` by the duly authorized attorneys of the ${roleLabel} under and by virtue of Powers of Attorney registered at the District Lands Registry as number ${poaNos[0]} and ${poaNos[1]} and at the Registry of Documents at Nairobi as Number ${rdnNos[0]} and ${rdnNos[1]} respectively in the presence of`),
                  ],
                  spacing: spacingB(200)
                }),
                new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Signature of bank official as witness', { italics: true })], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
              ]
            })]}),
            // Attorney certificate title
            new TableRow({ cantSplit: true, children: [new TableCell({
              columnSpan: 2, borders: vBorders, margins: padded,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua(headingOf(role, over, CERT_HEADING))], spacing: spacingB(80) })]
            })]}),
            // Attorney I CERTIFY
            new TableRow({ cantSplit: true, children: [new TableCell({
              columnSpan: 2, borders: vBorders, margins: padded,
              children: [
                new Paragraph({
                  children: [
                    antiqua('I CERTIFY that '),
                    antiqua(attyNames, { bold: true }),
                    antiqua(` being the duly constituted attorney(s) of the ${roleLabel} appeared before me on \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 and being known to me/being identified by \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 acknowledged the above signature or mark to be his/hers/theirs and that he/she/they had freely and voluntarily executed this instrument and understood its contents.`),
                  ],
                  spacing: spacingB(200)
                }),
                new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Name and signature of person certifying')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
              ]
            })]}),
          ];
        })() : []),

      ]
    }));

    blockItems.push(spacer());
    return blockItems;
  }

  // ── Execution + Verification — one connected table per party ─────────────────
  function executionBlock(party, role, isFirst = false, over = {}) {
    // Route to company block if party has a company name
    if (party.company_name || party.is_company) {
      return companyExecutionBlock(party, role, isFirst, over);
    }
    const blockItems = [];
    const roleLabel = over.signerLabel !== undefined ? over.signerLabel : (role === 'transferor'
      ? (opts.roleLabels?.transferor || 'Transferor(s)')
      : (opts.roleLabels?.transferee || 'Transferee(s)'));
    // an extra block says for itself whether it carries a certificate
    const wantCert = over.verification !== undefined ? over.verification : deedVerification;
    const vb = { style: BorderStyle.SINGLE, size: 4, color: BLACK, space: 0 };
    const vBorders = { top: vb, bottom: vb, left: vb, right: vb };
    const photoB = { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 0 };
    const padded = { top: 120, bottom: 120, left: 120, right: 120 };

    const leftW  = Math.round(TW * 0.45);
    const rightW = TW - leftW;

    // Photo box nested table
    const photoBox = new Table({
      width: { size: 2200, type: WidthType.DXA },
      columnWidths: [2200],
      borders: { top: photoB, bottom: photoB, left: photoB, right: photoB, insideH: noBorder, insideV: noBorder },
      rows: [new TableRow({ cantSplit: true, children: [
        new TableCell({
          borders: { top: photoB, bottom: photoB, left: photoB, right: photoB },
          width: { size: 2200, type: WidthType.DXA },
          margins: { top: 160, bottom: 160, left: 80, right: 80 },
          children: [
            new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
            new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Insert Passport Photo', font: 'Garamond', size: 18, color: 'BBBBBB', italics: true })],
              spacing: { before: 0, after: 160 }
            }),
            new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
            new Paragraph({ children: [], spacing: { before: 0, after: 160 } }),
          ]
        })
      ]})]
    });

    // All blocks except the first get their own page (first flows with "EXECUTION:")
    if (!isFirst) blockItems.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

    // One combined table: Row 1 = execution | Row 2 = cert title | Row 3 = cert text + signature
    blockItems.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [leftW, rightW],
      borders: { top: vb, bottom: vb, left: vb, right: vb, insideH: vb, insideV: vb },
      rows: [

        // ── Row 1: Execution ──────────────────────────────────────────────────
        new TableRow({ cantSplit: true,
          children: [
            new TableCell({
              borders: vBorders, width: { size: leftW, type: WidthType.DXA },
              margins: padded, verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({ children: [antiqua(`${signedLabelOf(role, over, 'SIGNED as a deed by the')} ${roleLabel}`)], spacing: spacingB(80) }),
                ...(recitalOf(role, over) ? [new Paragraph({ children: [antiqua(recitalOf(role, over))], spacing: spacingB(80) })] : []),
                new Paragraph({ children: [antiqua('in the presence of:-')], spacing: spacingB(700) }),
                new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Name and signature of person certifying')], spacing: spacingB(80) }),
              ]
            }),
            new TableCell({
              borders: vBorders, width: { size: rightW, type: WidthType.DXA },
              margins: padded, verticalAlign: VerticalAlign.TOP,
              children: cellStyleOf(over) === 'attorney' ? [
                ...(wantPhoto(over) ? [photoBox, new Paragraph({ children: [], spacing: { before: 0, after: 120 } })] : []),
                new Paragraph({ children: [antiqua('Name' + '\u2026'.repeat(18))], spacing: spacingB(240) }),
                new Paragraph({ children: [antiqua('Signature of Attorney(s)' + '\u2026'.repeat(12))], spacing: spacingB(80) }),
              ] : [
                ...(wantPhoto(over) ? [photoBox, new Paragraph({ children: [], spacing: { before: 0, after: 120 } })] : []),
                new Paragraph({ children: [antiqua(party.name || '', { bold: true })], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua(`ID/ Passport Number: ${party.id_no || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'}`, { bold: true })], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua(`PIN No: ${party.pin || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'}`)], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Signature/Thumb Print\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(80) }),
              ]
            }),
          ]
        }),

        // ── Rows 2 and 3: the section 45 certificate, unless the form has none ──
        ...(wantCert ? [
        new TableRow({ cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              borders: vBorders,
              margins: padded,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [antiqua(headingOf(role, over, CERT_HEADING))],
                  spacing: spacingB(80)
                })
              ]
            })
          ]
        }),
        new TableRow({ cantSplit: true,
          children: [
            new TableCell({
              columnSpan: 2,
              borders: vBorders,
              margins: padded,
              children: [
                new Paragraph({
                  children: variantOf(over) === 'attorney' ? [
                    antiqua('I CERTIFY that \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 and \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 being the duly constituted attorney(s) of the '),
                    antiqua(`${roleLabel} `, { bold: true }),
                    antiqua(party.company_name || party.name || '', { bold: true }),
                    antiqua(' appeared before me on the \u2026\u2026\u2026\u2026\u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 20\u2026\u2026\u2026\u2026 and being known to me/being identified by \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 acknowledged the above signature or mark to be his/hers/theirs and that he/she/they had freely and voluntarily executed this instrument and understood its contents.'),
                  ] : [
                    antiqua('I CERTIFY that the above-named '),
                    antiqua(`${roleLabel} `, { bold: true }),
                    antiqua(party.company_name || party.name || '', { bold: true }),
                    antiqua(' appeared before me on the \u2026\u2026\u2026\u2026\u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 20\u2026\u2026\u2026\u2026 and being known to me/being identified by \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 acknowledged the above signatures or marks to be his/her/them and that he/she/they had freely and voluntarily executed this instrument and understood its contents.'),
                  ],
                  spacing: spacingB(200)
                }),
                new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Name and signature of person certifying')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
              ]
            })
          ]
        }),
        ] : []),

      ]
    }));

    blockItems.push(spacer());
    return blockItems;
  }

  // ── Witnessed execution: one attested signature per signing party ──────────
  // The LRA 67 shape: the signing clause on the left, the coloured photograph with
  // the signatory's identifiers on the right, and the verification certificate under
  // both. It shares the deed block's frame but not its deed wording or its seal.
  // over: an extra signatory the two party sides cannot express, carrying its own
  // leading words, its own role label, its own name and its own certificate.
  function witnessedBlock(party, role, isFirst = false, over = {}) {
    const blockItems = [];
    const label = over.signerLabel !== undefined ? over.signerLabel : (execLabel || (role === 'transferor'
      ? (opts.roleLabels?.transferorSingle || opts.roleLabels?.transferor || 'Transferor')
      : (opts.roleLabels?.transfereeSingle || opts.roleLabels?.transferee || 'Transferee')));
    const partyName = over.name !== undefined ? over.name : (party.company_name || party.name || '');
    const wantVerification = over.verification !== undefined
      ? over.verification
      : !!(opts.execution && opts.execution.verification);
    const vb = { style: BorderStyle.SINGLE, size: 4, color: BLACK, space: 0 };
    const vBorders = { top: vb, bottom: vb, left: vb, right: vb };
    const padded = { top: 120, bottom: 120, left: 120, right: 120 };
    const leftW  = Math.round(TW * 0.55);
    const rightW = TW - leftW;
    const dots   = '…'.repeat(8);

    if (!isFirst) blockItems.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

    const rows = [
      new TableRow({ cantSplit: true, children: [
        new TableCell({
          borders: vBorders, width: { size: leftW, type: WidthType.DXA }, margins: padded, verticalAlign: VerticalAlign.TOP,
          children: [
            new Paragraph({ children: [antiqua(`${signedLabelOf(role, over, 'SIGNED by the')} ${label}`)], spacing: spacingB(80) }),
            ...(recitalOf(role, over) ? [new Paragraph({ children: [antiqua(recitalOf(role, over))], spacing: spacingB(80) })] : []),
            new Paragraph({ children: [antiqua('in the presence of:-')], spacing: spacingB(700) }),
            new Paragraph({ children: [antiqua('…'.repeat(16))], spacing: spacingB(80) }),
            new Paragraph({ children: [antiqua('Signature of witness')], spacing: spacingB(80) }),
          ]
        }),
        new TableCell({
          borders: vBorders, width: { size: rightW, type: WidthType.DXA }, margins: padded, verticalAlign: VerticalAlign.TOP,
          children: cellStyleOf(over) === 'attorney' ? [
            ...(wantPhoto(over) ? [photoBoxTable(2200, 'Coloured Photograph'), new Paragraph({ children: [], spacing: { before: 0, after: 120 } })] : []),
            new Paragraph({ children: [antiqua('Name' + dots)], spacing: spacingB(240) }),
            new Paragraph({ children: [antiqua('Signature of Attorney(s)' + dots)], spacing: spacingB(80) }),
          ] : [
            ...(wantPhoto(over) ? [photoBoxTable(2200, 'Coloured Photograph'), new Paragraph({ children: [], spacing: { before: 0, after: 120 } })] : []),
            new Paragraph({ children: [antiqua(partyName, { bold: true })], spacing: spacingB(80) }),
            new Paragraph({ children: [antiqua(`ID/No${party.id_no ? ': ' + party.id_no : dots}`)], spacing: spacingB(80) }),
            new Paragraph({ children: [antiqua(`PIN No${party.pin ? ': ' + party.pin : dots}`)], spacing: spacingB(80) }),
            new Paragraph({ children: [antiqua('Signature' + dots)], spacing: spacingB(80) }),
          ]
        }),
      ]}),
    ];

    if (wantVerification) {
      rows.push(new TableRow({ cantSplit: true, children: [new TableCell({
        columnSpan: 2, borders: vBorders, margins: padded,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua(headingOf(role, over, 'Certificate of Verification'))], spacing: spacingB(80) })]
      })]}));
      rows.push(new TableRow({ cantSplit: true, children: [new TableCell({
        columnSpan: 2, borders: vBorders, margins: padded,
        children: [
          new Paragraph({
            children: [
              ...(variantOf(over) === 'attorney'
                ? [antiqua('I CERTIFY that ……………………… and ……………………… being the duly constituted attorney(s) of the ')]
                : [antiqua('I CERTIFY that the above-named ')]),
              antiqua(partyName, { bold: true }),
              antiqua(' appeared before me on the ……… day of …………………………. 20…… and being known to me/being identified by*……………………………… of ……………………… acknowledge the above signatures or marks to be his/hers and that he/she had freely and voluntarily executed this instrument and understood its contents.'),
            ],
            spacing: spacingB(200)
          }),
          new Paragraph({ children: [antiqua('…'.repeat(30))], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
          new Paragraph({ children: [antiqua('Signature and Designation of Person Certifying**')], alignment: AlignmentType.RIGHT, spacing: spacingB(80) }),
        ]
      })]}));
    }

    blockItems.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [leftW, rightW],
      borders: { top: vb, bottom: vb, left: vb, right: vb, insideH: vb, insideV: vb },
      rows,
    }));
    blockItems.push(spacer());
    return blockItems;
  }

  // ── Jurat: a declaration sworn or declared before a Commissioner for Oaths ──
  function juratBlock(signerName) {
    const blockItems = [];
    const verb = (opts.execution && opts.execution.verb) === 'declared' ? 'DECLARED' : 'SWORN';
    const noB2 = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const leftW = Math.round(TW * 0.62);
    const rightW = TW - leftW;
    const bracket = () => new Paragraph({ children: [antiqua(')')], spacing: spacingB(80) });
    blockItems.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [leftW, rightW],
      borders: { top: noB2, bottom: noB2, left: noB2, right: noB2, insideH: noB2, insideV: noB2 },
      rows: [new TableRow({ children: [
        new TableCell({ borders: { top: noB2, bottom: noB2, left: noB2, right: noB2 }, width: { size: leftW, type: WidthType.DXA }, children: [
          new Paragraph({ children: [antiqua(`${verb} at ${d.sworn_at || '…'.repeat(12)}`)], spacing: spacingB(80) }),
          new Paragraph({ children: [antiqua('by the said '), antiqua(signerName || '', { bold: true })], spacing: spacingB(80) }),
          new Paragraph({ children: [antiqua('this ………… day of …………………… 20……')], spacing: spacingB(80) }),
        ]}),
        new TableCell({ borders: { top: noB2, bottom: noB2, left: noB2, right: noB2 }, width: { size: rightW, type: WidthType.DXA }, children: [
          bracket(), bracket(), bracket(),
          new Paragraph({ children: [antiqua('…'.repeat(12))], spacing: spacingB(80) }),
        ]}),
      ]})],
    }));
    blockItems.push(spacer());
    blockItems.push(lp('BEFORE ME:'));
    blockItems.push(spacer());
    blockItems.push(lp('…'.repeat(30)));
    blockItems.push(lp((opts.execution && opts.execution.jurat_signatory) || 'COMMISSIONER FOR OATHS'));
    blockItems.push(spacer());
    return blockItems;
  }

  // The section 45 certificate on its own, for a form that carries no photograph or
  // identifier cell and only a signature rule under it (LRA 34).
  function plainVerification(signerName) {
    return [
      spacer(),
      lpc([antiqua(headingOf('transferor', null, CERT_HEADING))]),
      spacer(),
      new Paragraph({
        children: [
          antiqua('I CERTIFY that the above-named '),
          antiqua(signerName || '', { bold: true }),
          antiqua(' appeared before me on the \u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026. 20\u2026\u2026 and being known to me/being identified by*\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 acknowledge the above signatures or marks to be his/hers and that he/she had freely and voluntarily executed this instrument and understood its contents.'),
        ],
        spacing: spacingB(200),
      }),
      lp('\u2026'.repeat(30)),
      lp('Signature and Designation of Person Certifying**'),
      spacer(),
    ];
  }

  // ── The parties that sign, per the form's execution.signer ───────────────────
  const signingParties = [
    ...((signerSide === 'transferor' || signerSide === 'both') ? transferors.map(t => ({ party: t, role: 'transferor' })) : []),
    ...((signerSide === 'transferee' || signerSide === 'both') ? transferees.map(t => ({ party: t, role: 'transferee' })) : []),
  ];

  if (execMode === 'deed') {
    signingParties.forEach(({ party, role }, idx) => items.push(...executionBlock(party, role, idx === 0)));
  } else if (execMode === 'witnessed') {
    signingParties.forEach(({ party, role }, idx) => items.push(...witnessedBlock(party, role, idx === 0)));
  } else if (execMode === 'declaration') {
    // A jurat names the person who swore it. Where the data file carries a declarant
    // (the form's own field), that is the name; otherwise the signing party's.
    const signer = signingParties[0]?.party || {};
    items.push(...juratBlock(String(d.declarant_name || '').trim() || signer.company_name || signer.name || ''));
  } else if (execMode === 'signature') {
    const label = execLabel || opts.roleLabels?.transferorSingle || opts.roleLabels?.transferor || 'Applicant';
    items.push(lp(`Signature of ${label}: ` + '…'.repeat(25)));
    items.push(lp('Name: ' + '…'.repeat(25)));
    items.push(lp('Date: ' + '…'.repeat(25)));
    items.push(spacer());
    if (opts.execution && opts.execution.verification) {
      const signer = signingParties[0]?.party || {};
      items.push(...plainVerification(signer.company_name || signer.name || ''));
    }
  }

  // ── A signatory the two party sides cannot express (a borrower on a charge) ──
  // Each entry carries its own wording, and chooses the frame the official form uses.
  for (const ex of ((opts.execution && opts.execution.extra_blocks) || [])) {
    const over = {
      signerLabel: fill(ex.signer_label || '', 'execution.extra_blocks signer_label'),
      signed_label: ex.signed_label,
      signing_recital: ex.signing_recital,
      signatory_cell: ex.signatory_cell,
      verification_heading: ex.verification_heading,
      verification_variant: ex.verification_variant,
      photograph: ex.photograph,
      company_seal: ex.company_seal,
      name: ex.name_field ? String(d[ex.name_field] || '') : '',
      verification: ex.verification === true,
    };
    const party = { name: over.name };
    items.push(...(ex.frame === 'deed'
      ? executionBlock(party, 'transferor', false, over)
      : witnessedBlock(party, 'transferor', false, over)));
  }

  // ── Registry seal section (per schema, overridable per form) ─────────────────
  // registryBlock: "default" keeps the judgement below (a sworn declaration and a
  // form nobody signs are not sealed by the registrar, so neither carries the
  // block); "none" drops it whatever the execution mode; an explicit block is
  // supplied by the caller as buildRegistrarSection and printed in its place.
  // Only 24 of the 95 official forms carry a REGISTERED and SEALED block, so a
  // form says for itself which of the three it is.
  const registryBlock = opts.registryBlock || 'default';
  const noRegistrySection = registryBlock === 'none'
    || (registryBlock === 'default' && (execMode === 'declaration' || execMode === 'none'));
  if (noRegistrySection) {
    // the form carries no registrar section
  } else if (opts.buildRegistrarSection) {
    opts.buildRegistrarSection({ lp, spacer }).forEach(p => items.push(p));
  } else {
    items.push(spacer());
    items.push(lp('REGISTERED and SEALED this \u2026\u2026\u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 20\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'));
    items.push(spacer());
    items.push(lp('Seal\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'));
    items.push(spacer());
    items.push(lp('LAND REGISTRAR', { bold: true }));
    items.push(lp('Name:\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'));
    items.push(spacer());
    items.push(lp('Registrar\u2019s Stamp/No:\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'));
    items.push(spacer());
    items.push(lp('Signature: \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'));
  }

  // ── DRAWN BY ─────────────────────────────────────────────────────────────────
  // The presentation clause follows every execution mode except none: a form nobody
  // signs is not presented by the firm either. It is firm level, never an advocate.
  if (execMode !== 'none') {
    items.push(spacer());
    items.push(new Paragraph({ children: [antiqua('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })], spacing: spacingB(80) }));
    items.push(lp(FIRM_NAME_TC + ','));
    items.push(lp(FIRM_LINE2 + ','));
    items.push(lp(FIRM_PO + '.'));
    items.push(lp('Tel. ' + FIRM_TEL));
    items.push(new Paragraph({ children: [antiqua(FIRM_EMAIL, { underline: { type: UnderlineType.SINGLE } })], spacing: spacingB(80) }));
  }

  // ── Foot notes: the Ministry's asterisked notes, where the form prints them at
  // the foot rather than beside the paragraph that carries the asterisk ────────
  if (Array.isArray(opts.footNotes) && opts.footNotes.length) {
    items.push(spacer());
    opts.footNotes.forEach((note, i) => items.push(new Paragraph({
      children: [antiqua(fill(note, 'foot_notes'))],
      spacing: spacingB(80),
      keepLines: true,
      keepNext: i < opts.footNotes.length - 1,
    })));
  }

  // ── Annex: a statutory declaration carried on the back of the form ──────────
  // The form proper ends above; the annexed declaration starts its own page, the way
  // the official form carries it on the reverse.
  for (const a of (opts.annex || [])) {
    if (a.type !== 'statutory_declaration') continue;
    items.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));
    items.push(lpc([antiqua(a.heading || 'STATUTORY DECLARATION', { bold: true })]));
    items.push(spacer());
    const grounds = String(d.declaration_text || '').split('\n').map(t => t.trim()).filter(Boolean);
    if (!grounds.length && !(a.body_lines || []).length && !(a.closing_lines || []).length) {
      refuse(`[${d.doc_type}] the annexed statutory declaration has nothing in it. Pass "declaration_text", ` +
        'one paragraph per line. A declaration with nothing between its opening and its closing is not a document.');
    }
    items.push(lp(fill(a.intro || '', 'annex intro')));
    items.push(spacer());
    // The form's own pre-printed recitals first, then the deponent's numbered grounds
    // from the data file, so an annex can carry both.
    for (const line of (a.body_lines || [])) items.push(lp(fill(line, 'annex body_lines')));
    if ((a.body_lines || []).length) items.push(spacer());
    String(d.declaration_text || '').split('\n').map(s => s.trim()).filter(Boolean)
      .forEach((line, i) => items.push(numbered(i + 1, fill(line, 'declaration_text'))));
    items.push(spacer());
    // Lines the official annex prints after the deponent's grounds, such as the list of
    // documents attached, before its closing sentence.
    for (const line of (a.closing_lines || [])) items.push(lp(fill(line, 'annex closing_lines')));
    if ((a.closing_lines || []).length) items.push(spacer());
    if (a.closing) items.push(lp(fill(a.closing, 'annex closing')));
    items.push(spacer());
    items.push(lp(a.jurat || 'DECLARED before me at'));
    items.push(lp('…'.repeat(30)));
    items.push(lp('on the …………………… day of ………………………… 20…'));
    items.push(spacer());
    // The official annex has two signature runs under the date: the declarant's,
    // then the person before whom it was declared. Both are drawn here, so the
    // declarant is not left signing the advocate's line.
    items.push(lp('…'.repeat(16)));
    items.push(lp(String(d.declarant_name || '').trim() || 'Declarant'));
    items.push(spacer());
    items.push(lp('…'.repeat(30)));
    if (a.jurat_signatory) items.push(lp(a.jurat_signatory));
    items.push(spacer());
  }

  return items;
}

// ─── LRA 33 — Transfer of Interest in Land ───────────────────────────────────
function buildLRA33() {
  requireTransferParties('lra_33');
  return buildTransferForm({
    formNo: 'LRA 33',
    regulation: '(r. 49(1))',
    docTitle: 'TRANSFER OF INTEREST IN LAND',
    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs, transferors, transferees }) {
      return [
        detailRow2('Date of Transfer', ''),
        detailRow2('Transferor(s)', transferorNames, true),
        detailRow2(idLabelRuns(transferorIDs, transferors), transferorIDs),
        detailRow2('Transferee(s)', transfereeNames, true),
        detailRow2(idLabelRuns(transfereeIDs, transferees), transfereeIDs),
        detailRow2('Consideration', `Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/=)`),
        detailRow2('Nature of interest to be transferred', d.nature_of_interest || 'ABSOLUTE', true),
      ];
    },
    buildBody({ lp, spacer, numbered, lettered }) {
      return [
        lp('This TRANSFER OF INTEREST IN LAND witnesses as follows:'),
        spacer(),
        numbered(1, 'The Transferor(s) HEREBY TRANSFER to the Transferee(s) the above-mentioned interest in the above Title.'),
        numbered(2, 'The Transfer is subject to the following:'),
        lettered('a', 'The provision of The Land Registration Act (No. 3 of 2012) and The Land Act (No. 6 of 2012);'),
        lettered('b', 'The interests noted in the Register of the Title.'),
        numbered(3, d.additional_provisions
          ? `The Transfer is also subject to the following additional provisions: ${d.additional_provisions}`
          : 'The Transfer is also subject to the following additional provisions, (if any).'),
        spacer(),
        lp('IN WITNESS the Transferor(s) and the Transferee(s) have signed this Transfer as a deed.'),
      ];
    },
  });
}

// ─── LRA 63 — Transfer of Lease ──────────────────────────────────────────────
function buildLRA63() {
  requireTransferParties('lra_63');
  return buildTransferForm({
    formNo: 'LRA 63',
    regulation: '(r. 76(2)(g), 77(2)(g))',
    docTitle: 'TRANSFER OF LEASE',
    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs, transferors, transferees }) {
      return [
        detailRow2('Date of Transfer', ''),
        detailRow2('Original Term of Lease', d.original_term || ''),
        detailRow2('Unexpired Residue of Term', d.unexpired_term || ''),
        detailRow2('Annual Rent', d.annual_rent || ''),
        detailRow2('Transferor(s)', transferorNames, true),
        detailRow2(idLabelRuns(transferorIDs, transferors), transferorIDs),
        detailRow2('Transferee(s)', transfereeNames, true),
        detailRow2(idLabelRuns(transfereeIDs, transferees), transfereeIDs),
        detailRow2('Consideration', `Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/=)`),
        detailRow2('Nature of Lease to be transferred', d.nature_of_interest || 'LEASEHOLD', true),
      ];
    },
    buildBody({ lp, spacer, numbered, lettered }) {
      return [
        lp('This TRANSFER OF LEASE witnesses as follows:'),
        spacer(),
        numbered(1, 'The Transferor(s) HEREBY TRANSFER to the Transferee(s) all their interest in the above leasehold title.'),
        numbered(2, 'The Transfer is subject to the following:'),
        lettered('a', 'The terms and conditions contained in the lease;'),
        lettered('b', 'The provision of The Land Registration Act (No. 3 of 2012) and The Land Act (No. 6 of 2012);'),
        lettered('c', 'The interests noted in the Register of the Title.'),
        numbered(3, d.additional_provisions
          ? `The Transfer is also subject to the following additional provisions: ${d.additional_provisions}`
          : 'The Transfer is also subject to the following additional provisions, (if any).'),
        spacer(),
        lp('IN WITNESS the Transferor(s) and the Transferee(s) have signed this Transfer as a deed.'),
      ];
    },
  });
}

// ─── LRA 58 — Discharge of Charge ────────────────────────────────────────────
function buildLRA58() {
  const chargees = d.chargees || [{ company_name: d.chargee_name || '', id_no: d.chargee_id || '', reg_no: d.chargee_reg_no || '' }];
  const chargors = d.chargors || [{ name: d.chargor_name || '', id_no: d.chargor_id || '', pin: d.chargor_pin || '' }];
  return buildTransferForm({
    formNo: 'LRA-58',
    regulation: '(r. 74(1))',
    docTitle: 'DISCHARGE OF CHARGE',
    roleLabels: {
      transferor: 'Chargee(s)', transferorSingle: 'Chargee',
      transferee: 'Chargor(s)', transfereeSingle: 'Chargor',
    },
    buildDetailRows({ detailRow2, idLabelRuns }) {
      const chargeeName = chargees.map(c => c.company_name || c.name || '').join(', ');
      const chargeeID   = chargees.map(c => c.id_no || c.reg_no || '').join(', ');
      const chargorName = chargors.map(c => c.name || '').join(', ');
      return [
        detailRow2('Date of Discharge', ''),
        detailRow2('Date of Charge', d.date_of_charge || ''),
        detailRow2('Entry No. in Encumbrances Register', d.charge_entry_no || ''),
        detailRow2('The Chargee', chargeeName, true),
        detailRow2(idLabelRuns(chargeeID, chargees), chargeeID),
        detailRow2('The Chargor', chargorName, true),
        detailRow2('Principal Amount Secured', d.amount_secured || ''),
      ];
    },
    buildBody({ lp, spacer }) {
      return [
        spacer(),
        lp([
          antiqua('The amounts secured under the Charge(s) having been paid or being otherwise satisfied the Chargee '),
          antiqua('HEREBY DISCHARGES', { bold: true }),
          antiqua(` the Charge(s) shown as entry number(s) ${d.charge_entry_no || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'} in the Encumbrances Section of the register of the above-mentioned Title wholly.`),
        ]),
        spacer(),
        lp('IN WITNESS WHEREOF this discharge has been duly executed as a deed the date and year mentioned above.'),
      ];
    },
    buildRegistrarSection({ lp, spacer }) {
      return [
        spacer(),
        lp('REGISTERED this \u2026\u2026\u2026\u2026\u2026 day of \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026 20\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'),
        spacer(),
        lp('ENTRY in Encumbrances Section Number:\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'),
        spacer(),
        lp('LAND REGISTRAR', { bold: true }),
        lp('Name:\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'),
        spacer(),
        lp('Registrar\u2019s Stamp/No:\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'),
        spacer(),
        lp('Signature: \u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'),
      ];
    },
    _partyOverride: { transferors: chargees, transferees: chargors },
  });
}

// ─── LRA 84 — Application for Official Search ────────────────────────────────
function buildLRA84() {
  const items = [];
  const TW = 8600;
  const thin  = { style: BorderStyle.SINGLE, size: 4, color: BLACK, space: 0 };
  const noB   = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF', space: 0 };
  const allB  = { top: thin, bottom: thin, left: thin, right: thin };
  const noAll = { top: noB,  bottom: noB,  left: noB,  right: noB  };

  const cell = (children, opts = {}) => new TableCell({
    borders: allB, verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    ...opts, children
  });
  const lbl = (txt, opts = {}) => new Paragraph({
    children: [new TextRun({ text: txt, font: 'Garamond', size: 20, color: BLACK, ...opts })],
    spacing: { before: 0, after: 40 }
  });
  const val = (txt, opts = {}) => new Paragraph({
    children: [new TextRun({ text: txt || '', font: 'Garamond', size: 22, color: BLACK, ...opts })],
    spacing: { before: 0, after: 40 }
  });
  const dots = '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026';

  // ── Form header — identical pattern to LRA 33/63/58 ──────────────────────────
  function lp84(text, opts2 = {}) {
    return new Paragraph({ children: asRuns(text, (t) => antiqua(t, opts2)), spacing: spacingB(80) });
  }
  function lpc84(text, opts2 = {}) {
    const children = asRuns(text);
    return new Paragraph({ children, alignment: AlignmentType.CENTER, spacing: spacingB(80), ...opts2 });
  }

  items.push(new Paragraph({
    children: [
      antiqua('Form LRA 84'),
      new TextRun({ text: '\t', font: 'Garamond', size: 24 }),
      antiqua('(r. 86(1))'),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TW }],
    spacing: spacingB(80),
  }));
  items.push(lpc84('REPUBLIC OF KENYA'));
  items.push(lpc84('THE LAND REGISTRATION ACT'));
  items.push(lpc84('THE LAND REGISTRATION (GENERAL) REGULATIONS, 2017'));
  items.push(spacer());

  // ── Registry filing box — top/bottom lines only, no verticals ───────────────
  const rCol = Math.floor(TW / 3);
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [rCol, rCol, TW - rCol * 2],
    borders: { top: noB, bottom: noB, left: noB, right: noB, insideH: noB, insideV: noB },
    rows: [
      new TableRow({ children: [
        new TableCell({ borders: { top: thin, bottom: noB, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp84('Date Received')] }),
        new TableCell({ borders: { top: thin, bottom: noB, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp84('Presentation Book')] }),
        new TableCell({ borders: { top: thin, bottom: noB, left: noB, right: noB }, width: { size: TW - rCol * 2, type: WidthType.DXA }, children: [lp84('Official Fees Paid')] }),
      ]}),
      new TableRow({ children: [
        new TableCell({ borders: { top: noB, bottom: thin, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp84('\u2026\u2026\u2026')] }),
        new TableCell({ borders: { top: noB, bottom: thin, left: noB, right: noB }, width: { size: rCol, type: WidthType.DXA }, children: [lp84('No\u2026\u2026\u2026')] }),
        new TableCell({ borders: { top: noB, bottom: thin, left: noB, right: noB }, width: { size: TW - rCol * 2, type: WidthType.DXA }, children: [lp84('Kshs\u2026\u2026\u2026')] }),
      ]}),
    ]
  }));

  items.push(spacer());
  items.push(lpc84('APPLICATION FOR OFFICIAL SEARCH'));
  items.push(lpc84([antiqua(`TITLE NO: ${d.title_number || d.property_lr_no || ''}`, { bold: true })]));
  items.push(spacer());

  // ── Title Number + Date ──
  const halfW = Math.round(TW / 2);
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA }, borders: noAll,
    rows: [new TableRow({ children: [
      cell([lbl('TITLE NUMBER:', { bold: true }), val(d.title_number || d.property_lr_no || '')],
        { width: { size: halfW, type: WidthType.DXA } }),
      cell([lbl('DATE:', { bold: true }), val(d.date || '')],
        { width: { size: TW - halfW, type: WidthType.DXA } }),
    ]})]
  }));
  items.push(spacer());

  // ── Applicant section ──
  const fieldRow = (label, value) => new TableRow({
    children: [
      cell([lbl(label, { bold: true })], { width: { size: Math.round(TW * 0.35), type: WidthType.DXA } }),
      cell([val(value || dots)],          { width: { size: Math.round(TW * 0.65), type: WidthType.DXA } }),
    ]
  });

  items.push(new Paragraph({
    children: [new TextRun({ text: 'Application', font: 'Garamond', size: 22, bold: true, color: BLACK })],
    spacing: spacingB(80)
  }));
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA }, borders: noAll,
    rows: [
      fieldRow('Name:',              FIRM_NAME),
      fieldRow('ID/Passport No.:',   d.applicant_id || ''),
      fieldRow('PIN No.:',           d.applicant_pin || ''),
      fieldRow('Address:',           `${FIRM_LINE2}, ${FIRM_PO}`),
      fieldRow('Telephone No:',      FIRM_TEL),
      fieldRow('Email address:',     FIRM_EMAIL),
    ]
  }));
  items.push(new Paragraph({
    children: [new TextRun({
      text: 'NB: Application for Searches can be made by Interested Parties or their Agents. For purposes of this document, an agent is any person or firm registered by a professional body.',
      font: 'Garamond', size: 18, italics: true, color: BLACK
    })],
    spacing: spacingB(80)
  }));

  // ── Purpose / Scope ──
  const scope = d.search_scope || 'a';
  items.push(new Paragraph({
    children: [new TextRun({ text: 'Purpose of Search', font: 'Garamond', size: 22, bold: true, color: BLACK })],
    spacing: spacingB(80)
  }));
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA }, borders: noAll,
    rows: [new TableRow({ children: [
      cell([
        new Paragraph({ spacing: spacingB(60), children: [
          new TextRun({ text: `${scope === 'a' ? '\u2611' : '\u2610'} (a) `, font: 'Garamond', size: 22, color: BLACK }),
          new TextRun({ text: 'Particulars of the subsisting entries in the register of the above-mentioned title', font: 'Garamond', size: 22, color: BLACK }),
        ]}),
        new Paragraph({ spacing: spacingB(60), children: [
          new TextRun({ text: `${scope === 'b' ? '\u2611' : '\u2610'} (b) `, font: 'Garamond', size: 22, color: BLACK }),
          new TextRun({ text: 'Particulars noted on: the Property Section / the Proprietorship Section / Encumbrances Section of the Register ', font: 'Garamond', size: 22, color: BLACK }),
          new TextRun({ text: '(*delete as appropriate)', font: 'Garamond', size: 20, italics: true, color: BLACK }),
        ]}),
      ], { width: { size: TW, type: WidthType.DXA } }),
    ]})]
  }));
  items.push(spacer());

  // ── Copy Documents Requested ──
  const copyDocs = d.copy_docs || [];
  items.push(new Paragraph({
    children: [new TextRun({ text: 'Copy Documents Requested', font: 'Garamond', size: 22, bold: true, color: BLACK })],
    spacing: spacingB(80)
  }));
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA }, borders: noAll,
    rows: [new TableRow({ children: [
      cell(
        ['(a)', '(b)', '(c)', '(d)'].map((ltr, i) => new Paragraph({
          spacing: spacingB(60),
          children: [new TextRun({ text: `${ltr}  ${copyDocs[i] || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'}`, font: 'Garamond', size: 22, color: BLACK })]
        })),
        { width: { size: TW, type: WidthType.DXA } }
      )
    ]})]
  }));
  items.push(new Paragraph({
    children: [new TextRun({ text: 'NB: There is a fee for each copy', font: 'Garamond', size: 18, italics: true, color: BLACK })],
    spacing: spacingB(80)
  }));

  // ── Signature ──
  items.push(new Paragraph({
    children: [new TextRun({ text: 'Signature of Applicant: ', font: 'Garamond', size: 22, bold: true, color: BLACK }),
               new TextRun({ text: dots, font: 'Garamond', size: 22, color: BLACK })],
    spacing: spacingB(200)
  }));

  // ── Search Collected (registry fills in) ──
  items.push(new Paragraph({
    children: [new TextRun({ text: 'SEARCH COLLECTED', font: 'Garamond', size: 22, bold: true, color: BLACK,
      underline: { type: UnderlineType.SINGLE } })],
    spacing: spacingB(80)
  }));
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA }, borders: noAll,
    rows: [
      fieldRow('Name:',           ''),
      fieldRow('ID/Passport No.:', ''),
      fieldRow('Signature:',      ''),
      fieldRow('Date:',           ''),
    ]
  }));
  items.push(spacer());

  // ── Notes ──
  items.push(new Paragraph({
    children: [new TextRun({ text: 'Notes:', font: 'Garamond', size: 20, bold: true, color: BLACK })],
    spacing: spacingB(60)
  }));
  [
    '1.  Application to be submitted in triplicate.',
    '2.  Applicant to attach copy of original title document, unless exempted by the Registrar.',
    '3.  Duplicate to be stamped and released to the Applicant.',
    '4.  Triplicate to be retained by the Land Registry for its records.',
    '5.  Original to be returned to the Applicant together with the Certificate of Search.',
  ].forEach(note => items.push(new Paragraph({
    children: [new TextRun({ text: note, font: 'Garamond', size: 18, color: BLACK })],
    spacing: spacingB(40)
  })));

  return items;
}

// ─── Route to builder ─────────────────────────────────────────────────────────

// ─── Generic LRA form builder (schema-driven) ────────────────────────────────
function buildGenericLRAForm(schema) {
  // Every fact the form leaves a blank for is declared in the schema. A required one
  // that the data file does not carry stops the run by name: a registry instrument
  // with a blank where a fact belongs is worse than no instrument at all.
  for (const cf of (schema.custom_fields || [])) {
    if (cf.required === false) continue;
    if (String(d[cf.name] ?? '').trim() === '') refuse(`[${schema.form_id}] custom field "${cf.name}" (${cf.label}) is required.`);
  }

  const transferors = d.transferors || [{ name: d.transferor_name || d.vendor_name || '', id_no: d.transferor_id || d.vendor_id || '' }];
  const transferees = d.transferees || [{ name: d.transferee_name || d.purchaser_name || '', id_no: d.transferee_id || d.purchaser_id || '' }];

  return buildTransferForm({
    formNo:     schema.form_number,
    regulation: schema.regulation || '',
    docTitle:   schema.doc_title,
    titleLabel: schema.title_label || 'TITLE NO',
    partyMode:  schema.party_mode || 'two_party',
    execution:  schema.execution,
    annex:      schema.annex,
    // the head, per form: the filing box, the title line, any lines of its own
    actLines:   schema.act_lines,
    filingBox:  schema.filing_box || 'default',
    titleLine:  schema.title_line || 'default',
    headLines:  schema.head_lines,
    preTitleLines: schema.pre_title_lines,
    footNotes:  schema.foot_notes,
    // registry_block: "default", "none", or the form's own block as a list of lines
    registryBlock: Array.isArray(schema.registry_block) ? 'explicit' : (schema.registry_block || 'default'),
    buildRegistrarSection: Array.isArray(schema.registry_block)
      ? ({ lp, spacer }) => [spacer(), ...schema.registry_block.map(line => lp(fill(line, 'registry_block')))]
      : undefined,
    roleLabels: schema.party_roles ? {
      transferor:       schema.party_roles.transferor       || 'Transferor(s)',
      transferorSingle: schema.party_roles.transferor_single || 'Transferor',
      transferee:       schema.party_roles.transferee       || 'Transferee(s)',
      transfereeSingle: schema.party_roles.transferee_single || 'Transferee',
    } : undefined,

    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs, transferors, transferees }) {
      return (schema.detail_rows || []).map(row => {
        let value = '';
        if (row.value_blank)                value = '';
        else if (row.value_field === 'transferorNames') value = transferorNames;
        else if (row.value_field === 'transferorIDs')   value = transferorIDs;
        else if (row.value_field === 'transfereeNames') value = transfereeNames;
        else if (row.value_field === 'transfereeIDs')   value = transfereeIDs;
        else if (row.value_field)           value = d[row.value_field] || '';
        else if (row.value_template)        value = fill(row.value_template, `detail_rows "${row.label || ''}"`);
        const side = row.value_field === 'transfereeIDs' ? transferees : transferors;
        const label = row.use_id_label ? idLabelRuns(value, side) : fill(row.label, 'detail_rows label');
        return detailRow2(label, value, row.bold || false);
      });
    },

    buildBody({ lp, spacer, numbered, lettered, gridTable }) {
      const items = [];
      for (const block of (schema.body_text || [])) {
        if (block.type === 'spacer') { items.push(spacer()); continue; }
        // An operative schedule prints as the grid the Ministry prints, not as prose:
        // the form's own column headings, then one row per line of the named field,
        // its cells split on a pipe.
        if (block.type === 'table') {
          const lines = String(d[block.rows_field] || '').split('\n').map(t => t.trim()).filter(Boolean);
          items.push(gridTable(
            (block.columns || []).map(c => fill(c, 'a table block\'s columns')),
            lines.map(line => line.split('|').map(cell => cell.trim())),
          ));
          continue;
        }
        // A field whose value carries newlines (a list of grounds, a schedule of
        // parcels) becomes one paragraph per line, each of the block's own kind.
        // Numbering carries on through them.
        const lines = fill(block.text, 'body_text').split('\n').map(t => t.trim()).filter((t, i, all) => t !== '' || all.length === 1);
        lines.forEach((line, i) => {
          if (block.type === 'numbered')      items.push(numbered(Number(block.number) + i, line));
          else if (block.type === 'lettered') items.push(i === 0 ? lettered(block.letter, line) : lp(line));
          else items.push(lp(line));
        });
      }
      return items;
    },
  });
}

// ─── Build Engagement Letter ─────────────────────────────────────────────────
function buildEngagementLetter() {
  // The firm's engagement letter (template of 11 Sep 2026) takes matter facts by these names; the older
  // conveyancing fields from /new-conveyance are mapped onto them so nothing that called this breaks.
  if (!d.re_line && d.property_lr_no) d.re_line = `SALE AND PURCHASE OF ALL THAT PROPERTY OF TITLE NO. ${d.property_lr_no}`;
  // The client is the side the firm acts for. The defaults below describe a purchase, so a firm acting
  // for the seller passes its own background and scope: an engagement letter that engages the buyer
  // while the sale agreement names the firm as the Vendor's advocates put the firm on both sides.
  if (actingFor('engagement_letter') === 'vendor') {
    if (!d.client_name && d.vendor_name) d.client_name = d.vendor_name;
    if (!(d.background && d.background.length) || !(d.scope && d.scope.length)) refuse('[engagement_letter] the firm acts for the ' +
      'vendor, and the standard background and scope describe a purchase. Pass "scope" (and "background") written for the ' +
      'sale, as the advocate gives them, one item per entry.');
  }
  if (!d.client_name && d.purchaser_name) d.client_name = d.purchaser_name;
  if (!(d.background && d.background.length) && d.property_lr_no) d.background = [
    `${d.client_name || 'The Client'} has entered into an agreement with ${d.vendor_name || 'the Vendor'} (the Vendor) to purchase all that property of title number ${d.property_lr_no}${d.property_location ? ' situate at ' + d.property_location : ''}${d.purchase_price_figures ? ' at the purchase price of Kenya Shillings ' + d.purchase_price_figures : ''}.`,
  ];
  if (!(d.scope && d.scope.length) && d.property_lr_no) d.scope = [
    'Reviewing the Sale Agreement;', 'Witnessing the Sale Agreement;', 'Following up on the progress and status of the transaction;',
    'Negotiating the terms of the Sale Agreement on your behalf;', 'Advising on the costs related to the transfer;', 'Facilitating the valuation for stamp duty assessment;',
    'Advising on applicable stamp duty (subject to change based on market value);', 'Attending to the payment of stamp duty on the transfer;',
    'Attending to the registration of the transfer and the issuance of the title in your favour; and', 'Generally safeguarding and protecting your legal interests throughout the transaction.',
  ];
  if (!d.fee_text && d.legal_fees) d.fee_text = `Kshs. ${Number(String(d.legal_fees).replace(/[^\d.]/g, '')).toLocaleString('en-KE')}`;
  if (!d.client_pronoun) d.client_pronoun = d.client_gender === 'company' ? 'its' : 'their';
  if (!d.assumptions || !d.assumptions.length) d.assumptions = undefined;
  // Clause 9 names who has conduct and who assists. When the person drafting IS the
  // responsible partner, naming them again as their own assistant reads as a mistake,
  // which is what hasUserAdvocate exists to prevent; it was simply never applied here.
  // The address in that clause must belong to the person the clause names. Clause 9 always
  // names the responsible partner, so the drafting advocate's own address belongs there only
  // when the drafting advocate IS that partner. Getting this backwards printed the partner's
  // name against a fee earner's address, which sends a client who writes to it to the wrong
  // person; when the partner drafted for herself it fell back to the firm's general address
  // although her own was to hand. Where a fee earner drafts, the firm address is correct,
  // because the partner's own is not in the data file.
  if (!d.responsible_email && !hasUserAdvocate()) d.responsible_email = advocateEmail();
  return FirmLetter.buildEngagementLetter(d, hasUserAdvocate() ? { assistedBy: advocateName() + ', Advocate' } : {});
}

// A fee note's service list is the firm's own description of what it did. These neutral defaults
// stand in until the drafting command passes d.services for the matter in hand.
// The default depends on the side the firm acts for: a seller-side fee note must not bill the seller
// for the purchaser's work (stamp duty, registration and a title "in your favour"). Found 28 Sep.
const DEFAULT_FEE_NOTE_SERVICES = {
  purchaser: [
    'Taking instructions and advising on the transaction;',
    'Perusing and settling the sale agreement;',
    'Following up the progress of the transaction with the other side;',
    'Advising on the costs of the transfer, including stamp duty;',
    'Attending to stamp duty assessment and payment;',
    'Attending to registration of the transfer and issue of the title in your favour; and',
    'Protecting your interests throughout the transaction.',
  ],
  vendor: [
    'Taking instructions and advising on the sale;',
    'Preparing and settling the sale agreement;',
    'Following up the progress of the transaction with the other side;',
    'Obtaining the consents and clearances required for the transfer;',
    'Preparing the transfer and completion documents and attending to their execution; and',
    'Protecting your interests throughout the transaction.',
  ],
  neutral: [
    'Taking instructions and advising on the transaction;',
    'Attending to the sale agreement;',
    'Following up the progress of the transaction with the other side;',
    'Attending to the documents required for completion and registration; and',
    'Protecting your interests throughout the transaction.',
  ],
};

// ─── Build Fee Note ───────────────────────────────────────────────────────────
function buildFeeNote() {
  requireFields(['property_lr_no', 'legal_fees', 'legal_fees_vat', 'fee_note_total'], 'fee_note');
  assertVat(d.legal_fees, d.legal_fees_vat, 'fee_note');
  // The total is what the client pays, so it must be the sum of the lines above it.
  const lineKeys = ['legal_fees', 'legal_fees_vat', 'disbursements_office', 'disbursements_statutory'];
  const bad = lineKeys.filter(k => d[k] != null && String(d[k]).trim() !== '' && numOf(d[k]) == null);
  if (bad.length || numOf(d.fee_note_total) == null) refuse(`[fee_note] ${bad.concat(numOf(d.fee_note_total) == null ? ['fee_note_total'] : []).join(', ')} ` +
    'must be a number of shillings. A fee note is a demand for money and every figure on it must be one.');
  const lineSum = lineKeys.reduce((a, k) => a + (numOf(d[k]) || 0), 0);
  if (Math.abs(lineSum - numOf(d.fee_note_total)) > 1) refuse(`[fee_note] fee_note_total (${d.fee_note_total}) is not the sum of ` +
    `legal fees, VAT and disbursements (${lineSum.toLocaleString('en-KE')}). Fix the figures before generating: the client would be billed a total the lines do not support.`);
  const money = (v) => (v == null || String(v).trim() === '') ? '' : (numOf(v) == null ? String(v)
    : numOf(v).toLocaleString('en-KE', { minimumFractionDigits: Number.isInteger(numOf(v)) ? 0 : 2, maximumFractionDigits: 2 }));
  const items = [];
  const tw = (text, opts = {}) => new TextRun({ text: String(text || ''), font: FONT_BODY, size: 22, color: BLACK, ...opts });
  const para = (children, opts = {}) => new Paragraph({ children: asRuns(children, tw), spacing: { before: 60, after: 60 }, alignment: AlignmentType.JUSTIFIED, ...opts });
  const bp = (text, opts = {}) => para([tw(text)], opts);
  const bpB = (text) => para([tw(text, { bold: true })]);
  const gap = () => new Paragraph({ children: [], spacing: { before: 0, after: 120 } });
  const bullet = (text) => new Paragraph({ children: [tw(text)], bullet: { level: 0 }, spacing: { before: 40, after: 40 }, alignment: AlignmentType.JUSTIFIED });

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorders = { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } };
  const feeCell = (text, isHeader = false, align = AlignmentType.LEFT) => new TableCell({
    children: [new Paragraph({ children: [tw(text, { bold: isHeader })], spacing: { before: 60, after: 60 }, indent: { left: 80 }, alignment: align })],
    shading: isHeader ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
    borders: cellBorders,
  });
  const feeRow = (label, value) => new TableRow({ children: [feeCell(label), feeCell(value, false, AlignmentType.RIGHT)] });

  // ── Letterhead header ───────────────────────────────────────────────────────
  items.push(...buildLetterhead());
  items.push(gap());

  // ── Ref / date line ─────────────────────────────────────────────────────────
  items.push(FirmLetter.refLine(d.ref, d.your_ref, d.date, 24));

  // ── Addressee ──────────────────────────────────────────────────────────────
  // The client billed, from the Parties table: name, then the postal address lines.
  const clientName = known(d.client_name);
  if (clientName) {
    items.push(para([tw(clientName.toUpperCase(), { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
    (Array.isArray(d.client_address_lines) ? d.client_address_lines : []).map(known).filter(Boolean)
      .forEach(line => items.push(para([tw(line)], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } })));
    items.push(gap());
  }

  // ── Salutation ─────────────────────────────────────────────────────────────
  items.push(bp(known(d.salutation) || 'Dear Sir/Madam,', { alignment: AlignmentType.LEFT }));
  items.push(gap());

  // ── Subject ────────────────────────────────────────────────────────────────
  items.push(para([tw(`RE: FEE NOTE FOR SALE AND PURCHASE OF ${d.property_lr_no || ''}`, { bold: true })]));
  items.push(gap());

  // ── Body ───────────────────────────────────────────────────────────────────
  items.push(bp('Our fees for professional services as per the Advocates’ Remuneration Order Schedule 1 Part 1, rendered for:'));
  items.push(gap());
  const services = Array.isArray(d.services) && d.services.length ? d.services
    : DEFAULT_FEE_NOTE_SERVICES[actingFor('fee_note') || 'neutral'];
  services.forEach(s => items.push(bullet(s)));
  items.push(gap());

  // ── Fee table ──────────────────────────────────────────────────────────────
  const legalFees = money(d.legal_fees);
  const vatAmt = money(d.legal_fees_vat);
  const disbOffice = money(d.disbursements_office);
  const disbStatutory = money(d.disbursements_statutory);
  const total = money(d.fee_note_total);

  items.push(new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [feeCell('ITEM', true), feeCell('COST (Kshs)', true, AlignmentType.RIGHT)] }),
      feeRow('Legal fees', legalFees),
      feeRow('VAT 16%', vatAmt),
      feeRow('Disbursements (Office)', disbOffice),
      feeRow('Disbursements (Statutory)', disbStatutory),
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [tw('TOTAL', { bold: true })], spacing: { before: 60, after: 60 }, indent: { left: 80 } })],
            shading: { type: ShadingType.CLEAR, fill: 'E8E8E8' },
            borders: cellBorders,
          }),
          new TableCell({
            children: [new Paragraph({ children: [tw(total, { bold: true })], spacing: { before: 60, after: 60 }, indent: { left: 80 }, alignment: AlignmentType.RIGHT })],
            shading: { type: ShadingType.CLEAR, fill: 'E8E8E8' },
            borders: cellBorders,
          }),
        ]
      }),
    ]
  }));
  items.push(gap());

  // ── Account details ─────────────────────────────────────────────────────────
  // The firm's account can come from the data file as a "firm_bank" block, which the drafting
  // command reads from the Firm Settings table, or from firm-config.json. The directory is the
  // route that works at a client: the plugin directory is read only inside the sandbox and keeps
  // no files between tasks, so a firm that did not hand over its account details before the build
  // could never add them afterwards. Whichever route supplies them, they are still refused when
  // absent: a fee note is how a client learns where to send money.
  const bank = (d.firm_bank && typeof d.firm_bank === 'object') ? d.firm_bank : {};
  const bankField = (k) => String(bank[k] ?? firmConfig[k] ?? '').trim();
  if (!bankField('bank_account_no')) refuse('[fee_note] the firm has no bank account on file, so there is nowhere ' +
    'for the client to send the money. The drafting command reads the Firm Settings table of the conveyancing base and ' +
    'passes it as a "firm_bank" block (bank_account_name, bank_name, bank_account_no, bank_branch). If Firm Settings has ' +
    'no bank_account_no, run /setup-conveyancing and answer step 4g, which records it once for the whole firm.');
  items.push(bpB('ACCOUNT DETAILS:'));
  items.push(bp(`Account Name: ${bankField('bank_account_name') || FIRM_NAME}`));
  items.push(bp(`Account No: ${bankField('bank_account_no')}`));
  items.push(bp(`Bank: ${bankField('bank_name')}`));
  if (bankField('bank_branch')) items.push(bp(`Branch: ${bankField('bank_branch')}`));
  items.push(gap());

  // ── Closing ────────────────────────────────────────────────────────────────
  items.push(...FirmLetter.signOff({
    signatoryName: advocateNameCaps(),
    signatoryRole: 'Advocate (' + advocateP105('fee_note') + ')',
  }, 24));

  return items;
}

const LETTERHEAD_DOCS = ['conveyance_letter', 'engagement_letter', 'fee_note', 'undertaking_letter', 'undertaking_request'];
if (LH_MODE === 'image' && LETTERHEAD_DOCS.includes(d.doc_type) && !FirmLetter.HEADER_IMG) {
  console.error('\nREFUSED: letterhead_mode is "image" but scripts/assets/letterhead-header.png (or .jpg) is missing. Add the artwork or set letterhead_mode to "generated". No document was written.\n');
  process.exit(1);
}
function buildDocumentChildren() {
  const kids = buildDocumentChildrenInner();
  // A firm that puts a cover sheet on its registry instruments supplies it as a firm extension.
  if ((LRA_TYPES.includes(d.doc_type) || d._isGenericLraForm) && d.cover_page !== false) {
    const cover = loadFirmExtension('registry-cover');
    const sheet = cover ? cover(extensionContext()) : null;
    if (sheet != null && !Array.isArray(sheet)) refuse('firm extension registry-cover.js returned something other than a list of paragraphs.');
    if (Array.isArray(sheet) && sheet.length) {
      kids.unshift(...sheet, new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));
      REGISTRY_COVER = true;
    }
  }
  // Only the builders that draw no letterhead of their own need the first-page spacer added here.
  if (['undertaking_letter', 'undertaking_request'].includes(d.doc_type) && LH_MODE === 'image') kids.unshift(FirmLetter.firstPageSpacer());
  return kids;
}
function buildDocumentChildrenInner() {
  switch (d.doc_type) {
    case 'sale_agreement':
      return buildSaleAgreement();
    case 'conveyance_letter':
      return buildConveyanceLetter();
    case 'lra_33':
      return buildLRA33();
    case 'lra_63':
      return buildLRA63();
    case 'lra_58':
      return buildLRA58();
    case 'undertaking_request':
      return buildUndertakingRequest();
    case 'undertaking_letter':
      return buildUndertakingLetter();
    case 'lra_84':
      return buildLRA84();
    case 'engagement_letter':
      return buildEngagementLetter();
    case 'fee_note':
      return buildFeeNote();
    default: {
      // Library form served from scripts/form-schemas/<doc_type>.json
      const schema = loadFormSchema(d.doc_type);
      if (!schema) {
        // Not a built-in and not a registry form: the firm's own precedent, if its build has one.
        const ext = loadFirmExtension(d.doc_type);
        if (ext) {
          const r = ext(extensionContext());
          if (!r || !Array.isArray(r.children) || r.children.length === 0) refuse(`firm extension ${d.doc_type}.js returned no document body.`);
          const own = new Set(FirmLetter.numberingConfig.map(n => n.reference));
          for (const n of (r.numbering || [])) if (own.has(n.reference)) refuse(`firm extension ${d.doc_type}.js redefines the numbering "${n.reference}" the generator already uses.`);
          EXT_RESULT = r;
          d._isFirmExtension = true; // the firm's own instrument: plain page numbers, not the letterhead
          return r.children;
        }
      }
      if (!schema) refuse(`unknown doc_type "${d.doc_type}". Run node scripts/form-schemas/build-index.js and check _index.json for the forms this plugin drafts.`);
      d._isGenericLraForm = true; // registry form: use the clean page-number footer, not the firm letterhead
      return buildGenericLRAForm(schema);
    }
  }
}

// ─── Assemble and write document ──────────────────────────────────────────────
const rawChildren = buildDocumentChildren();

// Flatten — buildExecutionBlock returns arrays of items
const flatChildren = rawChildren.flat(Infinity);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Book Antiqua', size: 24, color: BLACK },
        paragraph: { spacing: { after: 0, line: 240 } }
      }
    }
  },
  numbering: { config: FirmLetter.numberingConfig.concat((EXT_RESULT && EXT_RESULT.numbering) || []) },
  sections: [
    (LETTERHEAD_DOCS.includes(d.doc_type) && LH_MODE === 'image')
      ? Object.assign(FirmLetter.sectionProps(), { children: flatChildren })   // header on page one, footer on every page, margins clear of both
      : {
      properties: {
        ...(REGISTRY_COVER ? { titlePage: true } : {}),
        page: {
          size: { width: A4_W, height: A4_H },
          margin: {
            top: MARGIN_TOP,
            right: MARGIN_SIDE,
            bottom: MARGIN_BOTTOM,
            left: MARGIN_SIDE
          },
          ...(EXT_RESULT && EXT_RESULT.pageBorders ? { borders: EXT_RESULT.pageBorders } : {}),
        }
      },
      // A nine-page agreement signed page by page needs its pages numbered; the sale
      // agreement used to carry no footer at all. It takes the plain page number, not
      // the letterhead footer, because it is not printed on the firm's letterhead.
      footers: {
        default: (LRA_TYPES.includes(d.doc_type) || d._isGenericLraForm || d.doc_type === 'sale_agreement' || d._isFirmExtension)
          ? buildPageNumberFooter()
          : buildLetterheadFooter(),
        // A cover sheet carries no page number.
        ...(REGISTRY_COVER ? { first: new Footer({ children: [new Paragraph({ children: [] })] }) } : {}),
      },
      children: flatChildren
    }
  ]
});

Packer.toBuffer(doc)
  .then(async buffer => {
    // Output safety scan: refuse to emit a client document that still contains an
    // un-substituted placeholder (the cover {*}, a stray XXX / XXXXX, an unfilled
    // {{ token). Best-effort: a scanner failure must never block a clean document.
    try {
      const JSZip = require('jszip');
      const zip = await JSZip.loadAsync(buffer);
      const xml = await zip.file('word/document.xml').async('string');
      const bad = xml.match(/\{\*\}|\{\{|XXXXX|\bXXX\b/);
      if (bad) {
        console.error(`\n[output scan] document contains an unresolved placeholder ${JSON.stringify(bad[0])}. Refusing to emit; fix the data or template and re-run.\n`);
        process.exit(1);
      }
    } catch (e) { /* scanner unavailable — proceed */ }
    fs.writeFileSync(outputPath, buffer);
    console.log(`Document written to: ${outputPath}`);
  })
  .catch(err => {
    console.error('Error generating document:', err.message);
    process.exit(1);
  });
