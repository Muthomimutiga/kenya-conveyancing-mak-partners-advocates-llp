#!/usr/bin/env node
// Conveyancing Document Generator — MAK & Partners Advocates LLP
// Usage: node generate-conveyancing-document.js <data.json> <output.docx>
//
// Handles:
//   sale_agreement — Agreement for Sale

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, BorderStyle, WidthType, VerticalAlign,
  UnderlineType, LineRuleType, ShadingType, PageNumber, TabStopType, PageBreak,
  ImageRun, LevelFormat,
} = require('docx');
const fs   = require('fs');
const path = require('path');

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
const firmConfig   = JSON.parse(fs.readFileSync(path.join(__dirname, 'firm-config.json'), 'utf8'));

// ─── Developer projects registry (per-project sale agreement variants) ───────
// See scripts/developer-projects.json — lookup by d.project_slug.
// See scripts/drafting-rules/developer_sale_agreement*.md — drafting rules.
const developerProjectsPath = path.join(__dirname, 'developer-projects.json');
const developerProjects = fs.existsSync(developerProjectsPath)
  ? JSON.parse(fs.readFileSync(developerProjectsPath, 'utf8'))
  : null;

function loadDeveloperProject(slug) {
  if (!developerProjects || !slug) return null;
  return developerProjects.projects?.[slug] || null;
}

// ─── Page geometry (A4) ───────────────────────────────────────────────────────
const A4_W = 11906;
const A4_H = 16838;
const LRA_TYPES     = ['lra_33', 'lra_63', 'lra_58', 'lra_84'];
const MARGIN_TOP    = 1440;
const MARGIN_BOTTOM = 1440;
const MARGIN_SIDE   = 1440;
const FIRM_NAME    = firmConfig.firm_name;
const FIRM_NAME_TC = firmConfig.firm_name_tc;
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

const LH_HEADER_IMG = (() => {
  if (LH_MODE === 'image') {
    for (const [ext, type] of [['jpeg','jpg'],['jpg','jpg'],['png','png']]) {
      const p = path.join(__dirname, 'assets', `letterhead-header.${ext}`);
      if (fs.existsSync(p)) return { data: fs.readFileSync(p), type };
    }
    return null;
  }
  if (LH_MODE === 'logo') { const p = path.join(__dirname, 'assets', 'firm-logo.png'); return fs.existsSync(p) ? { data: fs.readFileSync(p), type: 'png' } : null; }
  return null;
})();
const LH_FOOTER_IMG = (() => {
  if (LH_MODE === 'image') {
    for (const [ext, type] of [['jpeg','jpg'],['jpg','jpg'],['png','png']]) {
      const p = path.join(__dirname, 'assets', `letterhead-footer.${ext}`);
      if (fs.existsSync(p)) return { data: fs.readFileSync(p), type };
    }
    return null;
  }
  return null;
})();

// ─── Colours ─────────────────────────────────────────────────────────────────
const BLACK  = '1A1A1A';
const NAVY   = '0D2458';
const NAVY_T = '1B3A7A';
const GOLD   = 'C9A12C';
const GOLD2  = 'C9A12C';
const IVORY  = 'FFFFFF';

// ─── Font helpers ─────────────────────────────────────────────────────────────
function antiqua(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Tw Cen MT', size: 24, color: BLACK, ...opts });
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
  const c = Array.isArray(children) ? children : [antiqua(children)];
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

  if (LH_MODE === 'image' && LH_HEADER_IMG) {
    return [new Paragraph({
      children: [new ImageRun({ data: LH_HEADER_IMG.data, transformation: { width: 624, height: 123 }, type: LH_HEADER_IMG.type })],
      spacing: { before: 0, after: 120 }
    })];
  }

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
        new Paragraph({ children: [new ImageRun({ data: LH_FOOTER_IMG.data, transformation: { width: 624, height: 134 }, type: LH_FOOTER_IMG.type })], spacing: { before: 0, after: 0 } })
      ]
    });
  }
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 8, space: 0, color: '000000' } },
        spacing: { before: 100 },
        children: [new TextRun({ text: FIRM_NAME_TC, font: 'Tw Cen MT', bold: true, size: 15, color: '000000' })]
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
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    children: [antiqua(`${number}\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 720 },
  });
}

// Sub-clause paragraph with number and text as separate runs, hanging indent 720
function subClauseRuns(number, runs) {
  return new Paragraph({
    children: [antiqua(`${number}\u00a0\u00a0 `), ...runs],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 720 },
  });
}

// (a)(b)(c) sub-sub-clause — indent 1440
function subSubClause(label, children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    children: [antiqua(`${label}\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 1440, hanging: 720 },
  });
}

// (i)(ii)(iii) list — indent 2160
function romanItem(label, children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    children: [antiqua(`${label}\u00a0\u00a0\u00a0\u00a0 `), ...c],
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 2160, hanging: 720 },
  });
}

// Definition paragraph inside 1.1 block — indent 1440
function definitionPara(children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
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
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    children: c,
    bullet: { level: 0 },
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720 },
  });
}

// ─── MAK developer-sale-agreement numbering helpers ──────────────────────────
// Use these in buildProjectAwareDeveloperSaleAgreement so Word generates the
// numbers (1, 1.1, 1.1.1, (A), (1)) automatically and restart logic works.
// Never use them in other doc-types (numbering definitions are only relevant
// when the developer_sale_agreement path is active).

// Top-level clause heading: renders "1." + title, bold + underlined
function makClauseH(title) {
  return new Paragraph({
    numbering: { reference: 'mak-main-clauses', level: 0 },
    children: [antiqua(title, { bold: true, underline: { type: UnderlineType.SINGLE } })],
    spacing: spacingB(80),
    alignment: AlignmentType.LEFT,
  });
}

// Sub-clause at level 1 (renders "1.1") or level 2 (renders "1.1.1")
function makSubC(children, level = 1) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    numbering: { reference: 'mak-main-clauses', level },
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
  });
}

// Recital with uppercase letter in parens: (A) (B) (C) ...
function makRecital(children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    numbering: { reference: 'mak-recitals', level: 0 },
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
  });
}

// Party in BETWEEN block: (1) (2) ...
function makParty(children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    numbering: { reference: 'mak-parties', level: 0 },
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
  });
}

// Plain body paragraph (no indent, justified)
function bodyPara(children) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
  return new Paragraph({
    children: c,
    spacing: spacingB(80),
    alignment: AlignmentType.JUSTIFIED,
  });
}

// Centered paragraph
function centeredPara(children, extraOpts = {}) {
  const c = Array.isArray(children) ? children : [antiqua(children)];
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

// ─── Build Agreement for Sale ──────────────────────────────────────────────────
function buildSaleAgreement() {
  requireFields(['vendor_name', 'purchaser_name', 'property_lr_no', 'purchase_price_words', 'purchase_price_figures', 'completion_date'], 'sale_agreement');
  assertMoneyConsistent();
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
  const vendorGender = d.vendor_is_company ? 'its' : 'his/her';
  let vendorCapacityText = '';
  if (d.vendor_capacity) {
    vendorCapacityText = ` (acting in his/her capacity as ${d.vendor_capacity})`;
  }
  children.push(bodyPara([
    antiqua(`${d.vendor_name || ''} of Post Office Box Number ${d.vendor_po_box || ''}, ${d.vendor_town || ''} and I.D. No. ${d.vendor_id || ''}${vendorCapacityText} (hereinafter called \u201cthe Vendor\u201d which expression shall where the context so admits include ${vendorGender} personal representatives and assigns) of the one part; and`)
  ]));
  children.push(spacer());

  // Purchaser party block
  const purchaserGender = d.purchaser_is_company ? 'its' : 'his/her';
  children.push(bodyPara([
    antiqua(`${d.purchaser_name || ''} of Post Office Box Number ${d.purchaser_po_box || ''}, ${d.purchaser_town || ''} and I.D. No. ${d.purchaser_id || ''} (hereinafter called \u201cthe Purchaser\u201d which expression shall where the context so admits include ${purchaserGender} heirs, personal representatives and assigns) of the other part.`)
  ]));
  children.push(spacer());

  // WHEREAS
  children.push(bodyPara([antiqua('WHEREAS:', { bold: true })]));
  children.push(spacer());

  // Recital 1
  const tenurePhrase = d.is_leasehold
    ? `the leasehold interest for a term of ${d.lease_term_years || '___'} years from ${d.lease_start_date || '___'} in`
    : 'the freehold interest in';
  children.push(bodyPara([
    antiqua(`${d.vendor_name || ''} is registered as the proprietor of ${tenurePhrase} all that parcel of land known as ${d.property_lr_no || ''} situate at ${d.property_location || ''} and measuring approximately ${d.property_area_words || ''} (${d.property_area_figures || ''}) hectares or thereabouts (hereinafter referred to as \u201cthe Property\u201d).`)
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
  children.push(definitionPara([
    antiqua('\u201cDeposit\u201d', { bold: true }),
    antiqua(` means the sum of Kenya Shillings ${d.deposit_words || ''} (Kshs. ${d.deposit_figures || ''}/-);`)
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
    antiqua(` means Messrs. ${d.vendor_advocate_firm || ''} of ${d.vendor_advocate_address || ''};`)
  ]));
  children.push(definitionPara([
    antiqua('\u201cThe Purchaser\u2019s Advocates\u201d', { bold: true }),
    antiqua(` means Messrs. ${d.purchaser_advocate_firm || ''} of ${d.purchaser_advocate_address || ''}.`)
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
    antiqua(`The Property is all that piece and parcel of land known as ${d.property_lr_no || ''}, containing by measurement ${d.property_area_words || ''} (${d.property_area_figures || ''}) hectares or thereabouts.`)
  ]));

  children.push(subClause('3.2', [
    antiqua('The Vendor hereby agrees to sell and the Purchaser hereby agrees to purchase the Property together with all improvements thereon at the Purchase Price and upon the terms and conditions set out in this Agreement.')
  ]));

  const interestSold = d.is_leasehold
    ? `the leasehold interest for the unexpired residue of the term of ${d.lease_term_years || '___'} years from ${d.lease_start_date || '___'}`
    : 'the freehold interest';
  children.push(subClause('3.3', [
    antiqua(`The interest sold is ${interestSold}, free from all encumbrances.`)
  ]));
  children.push(spacer());

  // ── CLAUSE 4: PURCHASE PRICE AND DEPOSIT ─────────────────────────────────
  children.push(clauseHeading('4', 'PURCHASE PRICE AND DEPOSIT'));
  children.push(spacer());

  children.push(subClause('4.1', [
    antiqua(`The Purchaser shall upon execution of this Agreement pay the Deposit of Kenya Shillings ${d.deposit_words || ''} (Kshs. ${d.deposit_figures || ''}/-) being ten percentum (10%) of the Purchase Price to the Vendor\u2019s Advocates to hold as stakeholders in their client account pending Completion.`)
  ]));

  children.push(subClause('4.2', [
    antiqua(`The Balance of the Purchase Price, being Kenya Shillings ${d.balance_words || ''} (Kshs. ${d.balance_figures || ''}/-), shall be paid to the Vendor\u2019s Advocates on or before the Completion Date in exchange for which the Vendor\u2019s Advocates shall release the Completion Documents to the Purchaser\u2019s Advocates.`)
  ]));
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

  children.push(romanItem('(i)', 'Duly executed Instrument of Transfer in triplicate in favour of the Purchaser and/or their nominee;'));
  children.push(romanItem('(ii)', 'Original title document in respect of the Property;'));
  children.push(romanItem('(iii)', 'Valid Rates Clearance Certificate for the Property (valid for at least twenty-one (21) days from the Completion Date) together with receipts evidencing payment of land rates for the last three (3) years;'));

  if (d.is_leasehold) {
    children.push(romanItem('(iv)', 'Original valid Land Rent Clearance Certificate issued by the National Land Commission, together with receipts evidencing payment of land rent for the last three (3) years;'));
    children.push(romanItem('(v)', 'Valid consent of the National Land Commission to the transfer;'));
  }

  if (d.is_agricultural) {
    children.push(romanItem(d.is_leasehold ? '(vi)' : '(iv)', 'Valid consent of the Land Control Board to the transfer;'));
  }

  // Continuing items — determine next roman numeral offset
  let romanOffset = 4;
  if (d.is_leasehold) romanOffset += 2;
  if (d.is_agricultural) romanOffset += 1;

  const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii'];

  const utilityIdx = romanOffset - 1;
  children.push(romanItem(`(${romanNumerals[utilityIdx]})`, 'Copies of the latest utility bills for the Property paid up to the Completion Date;'));
  children.push(romanItem(`(${romanNumerals[utilityIdx + 1]})`, 'Copy of the Vendor\u2019s National Identity Card or Passport;'));
  children.push(romanItem(`(${romanNumerals[utilityIdx + 2]})`, 'Copy of the Vendor\u2019s KRA PIN Certificate;'));
  children.push(romanItem(`(${romanNumerals[utilityIdx + 3]})`, 'Three (3) coloured passport-size photographs of the Vendor;'));
  children.push(romanItem(`(${romanNumerals[utilityIdx + 4]})`, 'Spousal consent from the Vendor\u2019s spouse consenting to the sale of the Property;'));

  let nextIdx = utilityIdx + 5;

  if (d.vendor_is_company) {
    children.push(romanItem(`(${romanNumerals[nextIdx]})`, 'Certified copy of the Certificate of Incorporation; Copies of National Identity Cards and KRA PIN certificates of each Director; Three (3) passport-size photographs of each Director; Board Resolution authorising the sale;'));
    nextIdx++;
  }

  if (d.is_charged) {
    children.push(romanItem(`(${romanNumerals[nextIdx]})`, 'Duly executed Discharge of Charge in favour of the Purchaser, signed by the Chargee;'));
    nextIdx++;
  }

  children.push(romanItem(`(${romanNumerals[nextIdx]})`, 'Every other document necessary to enable the Purchaser to become the registered proprietor of the Property free of any encumbrance.'));
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
  children.push(buildExecutionBlock(d.vendor_name, 'Vendor'));
  children.push(spacer());

  // ── PURCHASER EXECUTION BLOCK ─────────────────────────────────────────────
  children.push(buildExecutionBlock(d.purchaser_name, 'Purchaser'));
  children.push(spacer());

  // ── SPOUSAL CONSENT ───────────────────────────────────────────────────────
  if (d.include_spousal_consent) {
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
function buildExecutionBlock(partyName, partyRole) {
  const items = [];
  const roleUpper = partyRole.toUpperCase();

  // Using a table for the execution block: name on left, signature space on right
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

  items.push(new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [6200, 2826],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: 6200, type: WidthType.DXA },
            children: [
              new Paragraph({
                children: [antiqua(`SIGNED by the ${partyRole} the said`)],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua(partyName || '', { bold: true })],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua(')')],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua('in the presence of:')],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua(')')],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua('Advocate')],
                spacing: spacingB(80),
              }),
              new Paragraph({
                children: [antiqua(')')],
                spacing: spacingB(80),
              }),
            ]
          }),
          new TableCell({
            borders: noBorders,
            width: { size: 2826, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [antiqua('___________________________')],
                alignment: AlignmentType.CENTER,
                spacing: spacingB(80),
              })
            ]
          })
        ]
      })
    ]
  }));

  items.push(spacer());
  items.push(bodyPara([
    antiqua(`I CERTIFY THAT I was present and saw ${partyName || ''} the ${partyRole} executing this Agreement for Sale.`)
  ]));
  items.push(spacer());
  items.push(bodyPara([antiqua('Signature of Witness: .............................................')]));
  items.push(bodyPara([antiqua('Name: .................................................................')]));
  items.push(bodyPara([antiqua('Address: ..............................................................')]));
  items.push(bodyPara([antiqua('Occupation: ...........................................................')]));

  return items;
}

// ─── Conveyance Letter builder ────────────────────────────────────────────────
function buildConveyanceLetter() {
  const items = [];

  // Letterhead
  items.push(...buildLetterhead());
  items.push(spacer());

  // Date left-aligned
  const TEXT_WIDTH = A4_W - (2 * MARGIN_SIDE); // 9026 DXA
  items.push(new Paragraph({
    children: [antiqua(d.date || '')],
    spacing: spacingB(80)
  }));
  items.push(spacer());

  // Our Ref (left) — Your Ref (right) on same line
  items.push(new Paragraph({
    children: [
      antiqua(`Our Ref: ${d.ref || 'TBD'}`),
      new TextRun({ text: '\t', font: 'Garamond', size: 24 }),
      antiqua(`Your Ref: ${d.your_ref || 'TBD'}`)
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
    spacing: spacingB(80)
  }));

  // Recipient block
  if (d.recipient_lines && d.recipient_lines.length) {
    d.recipient_lines.forEach(line => {
      items.push(new Paragraph({
        children: [antiqua(line)],
        spacing: spacingB(80)
      }));
    });
    // Attention line
    if (d.attn) {
      items.push(new Paragraph({
        children: [antiqua(`Attn: ${d.attn}`)],
        spacing: spacingB(80)
      }));
    }
    items.push(spacer());
  }

  // Salutation
  items.push(new Paragraph({
    children: [antiqua(d.salutation || 'Dear Sir/Madam,')],
    spacing: spacingB(80)
  }));

  // Subject line — bold, underlined, justified
  if (d.subject) {
    items.push(new Paragraph({
      children: [antiqua(d.subject, { bold: true, underline: { type: UnderlineType.SINGLE } })],
      spacing: spacingB(200),
      alignment: AlignmentType.JUSTIFIED
    }));
  }

  // Body paragraphs
  // - string → plain justified paragraph (all-caps short strings render as bold section headers)
  // - array of {text, bold?} → mixed-run justified paragraph
  if (d.paragraphs && d.paragraphs.length) {
    d.paragraphs.forEach(para => {
      if (Array.isArray(para)) {
        items.push(new Paragraph({
          children: para.map(r => antiqua(r.text, r.bold ? { bold: true } : {})),
          spacing: spacingB(80),
          alignment: AlignmentType.JUSTIFIED
        }));
      } else {
        const isSectionHeader = /^[A-Z][A-Z\s'&\/\(\)-]{0,60}$/.test(para.trim());
        if (isSectionHeader) {
          items.push(new Paragraph({
            children: [antiqua(para, { bold: true })],
            spacing: spacingB(120),
            alignment: AlignmentType.LEFT
          }));
        } else {
          items.push(paraB(para));
        }
      }
    });
  }

  items.push(spacer());

  // Closing
  items.push(paraB(d.closing || 'Yours faithfully,'));
  items.push(spacer());
  items.push(spacer());
  items.push(spacer());

  // Signature block
  items.push(new Paragraph({
    children: [antiqua('_________________________________')],
    spacing: spacingB(80)
  }));
  items.push(new Paragraph({
    children: [antiqua(FIRM_NAME_TC, { bold: true })],
    spacing: spacingB(80)
  }));
  items.push(new Paragraph({
    children: [antiqua('Advocates for the ' + (d.signing_for || 'Vendor'))],
    spacing: spacingB(80)
  }));

  return items;
}

// ─── Undertaking Request builder ──────────────────────────────────────────────
// Firm writes to other side asking them to give a Professional Undertaking
function buildUndertakingRequest() {
  const paras = [];

  paras.push([
    { text: 'We refer to the above subject matter in which we act for ' },
    { text: d.purchaser_name || '…', bold: true },
    { text: ' ("the Purchaser") while you act for ' },
    { text: d.vendor_name || '…', bold: true },
    { text: ' ("the Vendor") herein.' },
  ]);
  paras.push([
    { text: 'To enable our client release the balance of the Purchase Price being Kenya Shillings ' },
    { text: `${d.balance_words || '…'} (Kshs. ${d.balance_figures || '…'}/=)`, bold: true },
    { text: ' to you, kindly give us your unequivocal and irrevocable Professional Undertaking in the following terms:' },
  ]);

  (d.that_clauses || []).forEach(clause => paras.push(clause));

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
  d.signing_for = d.signing_for || 'Purchaser';
  return buildConveyanceLetter();
}

// ─── Undertaking Letter builder ────────────────────────────────────────────────
// Firm gives its own irrevocable undertaking to the other side
function buildUndertakingLetter() {
  const paras = [];

  paras.push([
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

  (d.clauses || []).forEach((clause, i) => paras.push(`${i + 1}.   ${clause}`));

  paras.push([
    { text: 'This undertaking shall be effective from the date hereof until ' },
    { text: d.long_stop_date || '…', bold: true },
    { text: '.' },
  ]);

  d.paragraphs = paras;
  d.signing_for = d.signing_for || 'Purchaser';
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
    return new Paragraph({ children: Array.isArray(text) ? text : [antiqua(text, opts2)], spacing: spacingB(80) });
  }
  function lpc(runs, opts2 = {}) {
    const children = Array.isArray(runs) ? runs : [antiqua(runs)];
    return new Paragraph({ children, alignment: AlignmentType.CENTER, spacing: spacingB(80), ...opts2 });
  }
  function numbered(n, text) {
    return new Paragraph({ children: [antiqua(`${n}.\t${text}`)], spacing: spacingB(80), indent: { left: 360, hanging: 360 } });
  }
  function lettered(l, text) {
    return new Paragraph({ children: [antiqua(`${l}.\t${text}`)], spacing: spacingB(80), indent: { left: 720, hanging: 360 } });
  }

  // ── Form header ──────────────────────────────────────────────────────────────
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
  items.push(lpc('THE LAND REGISTRATION ACT'));
  items.push(lpc('THE LAND REGISTRATION (GENERAL) REGULATIONS, 2017'));
  items.push(spacer());

  // ── Registry filing box — top/bottom lines, no verticals ────────────────────
  const rCol = Math.floor(TW / 3);
  items.push(new Table({
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
  items.push(lpc(opts.docTitle));
  items.push(lpc([antiqua(`TITLE NO: ${d.title_no || d.property_lr_no || ''}`, { bold: true })]));
  items.push(spacer());

  // ── Parties (allow override for forms like LRA 58 that use different party types) ─
  const transferors = (opts._partyOverride?.transferors) || d.transferors || [{ name: d.vendor_name || '', id_no: d.vendor_id || '', pin: '' }];
  const transferees = (opts._partyOverride?.transferees) ?? d.transferees ?? [{ name: d.purchaser_name || '', id_no: d.purchaser_id || '', pin: '' }];

  const transferorNames = transferors.map(t => t.company_name || t.name || '').join(', ');
  const transferorIDs   = transferors.map(t => t.id_no || t.reg_no || '').join(', ');
  const transfereeNames = transferees.map(t => t.company_name || t.name || '').join(', ');
  const transfereeIDs   = transferees.map(t => t.id_no || t.reg_no || '').join(', ');

  const dLabelW = 2600;
  const dValueW = TW - dLabelW;

  function idLabelRuns(idValue) {
    const v = (idValue || '').trim();
    const strike = { strikethrough: true };
    if (!v) return [antiqua('ID/ Passport/Company Registration No.')];
    if (/^\d+$/.test(v)) return [antiqua('ID/ '), antiqua('Passport/', strike), antiqua('Company Registration No.')];
    if (/^[A-Za-z]/.test(v)) return [antiqua('ID/ ', strike), antiqua('Passport/'), antiqua('Company Registration No.', strike)];
    return [antiqua('ID/ ', strike), antiqua('Passport/', strike), antiqua('Company Registration No.')];
  }

  function detailRow2(label, value, valueBold = false) {
    const labelChildren = Array.isArray(label) ? label : [antiqua(label)];
    return new TableRow({ children: [
      new TableCell({ borders: cellBorders, width: { size: dLabelW, type: WidthType.DXA },
        children: [new Paragraph({ children: labelChildren, spacing: spacingB(80) })] }),
      new TableCell({ borders: cellBorders, width: { size: dValueW, type: WidthType.DXA },
        children: [new Paragraph({ children: [antiqua(value || '', { bold: valueBold })], spacing: spacingB(80) })] }),
    ]});
  }

  // ── Details table (form-specific rows injected via opts) ─────────────────────
  items.push(new Table({
    width: { size: TW, type: WidthType.DXA },
    columnWidths: [dLabelW, dValueW],
    borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideH: thinBorder, insideV: thinBorder },
    rows: opts.buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs }),
  }));

  // ── Body (form-specific, injected via opts) ──────────────────────────────────
  items.push(spacer());
  opts.buildBody({ lp, lpc, spacer, numbered, lettered }).forEach(p => items.push(p));
  items.push(spacer());
  items.push(lp('EXECUTION:'));
  items.push(spacer());

  // ── Company execution block ───────────────────────────────────────────────────
  function companyExecutionBlock(party, role, isFirst = false) {
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
        rows: [new TableRow({
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
      rows: [new TableRow({ children: [signatoryCell('Director'), signatoryCell('Secretary')] })]
    });

    if (!isFirst) blockItems.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));
    blockItems.push(new Table({
      width: { size: TW, type: WidthType.DXA },
      columnWidths: [leftW, rightW],
      borders: { top: vb, bottom: vb, left: vb, right: vb, insideH: vb, insideV: vb },
      rows: [

        // Row 1: Left = header + signatory table | Right = seal column (empty, column IS the box)
        new TableRow({ height: { value: 5000, rule: 'atLeast' }, children: [
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

        // Row 2: Certificate title (full width)
        new TableRow({ children: [new TableCell({
          columnSpan: 2, borders: vBorders, margins: padded,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua('Certificate of Verification under Section 45 of the Land Registration Act')], spacing: spacingB(80) })]
        })]}),

        // Row 3: I CERTIFY text + signature (full width)
        new TableRow({ children: [new TableCell({
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

        // Row 4 & 5: Attorney execution — conditional, only when attorney data provided
        ...(party.attorneys ? (() => {
          const attyNames = party.attorneys.map(a => a.name || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026').join(' and ');
          const poaNos    = (party.poa_nos || ['\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026', '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026']);
          const rdnNos    = (party.rdn_nos || ['\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026', '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026']);
          return [
            // Attorney signing text
            new TableRow({ children: [new TableCell({
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
            new TableRow({ children: [new TableCell({
              columnSpan: 2, borders: vBorders, margins: padded,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [antiqua('Certificate of Verification under Section 45 of the Land Registration Act')], spacing: spacingB(80) })]
            })]}),
            // Attorney I CERTIFY
            new TableRow({ children: [new TableCell({
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
  function executionBlock(party, role, isFirst = false) {
    // Route to company block if party has a company name
    if (party.company_name || party.is_company) {
      return companyExecutionBlock(party, role, isFirst);
    }
    const blockItems = [];
    const roleLabel = role === 'transferor'
      ? (opts.roleLabels?.transferor || 'Transferor(s)')
      : (opts.roleLabels?.transferee || 'Transferee(s)');
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
      rows: [new TableRow({ children: [
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
        new TableRow({
          children: [
            new TableCell({
              borders: vBorders, width: { size: leftW, type: WidthType.DXA },
              margins: padded, verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({ children: [antiqua(`SIGNED as a deed by the ${roleLabel}`)], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('in the presence of:-')], spacing: spacingB(700) }),
                new Paragraph({ children: [antiqua('\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Name and signature of person certifying')], spacing: spacingB(80) }),
              ]
            }),
            new TableCell({
              borders: vBorders, width: { size: rightW, type: WidthType.DXA },
              margins: padded, verticalAlign: VerticalAlign.TOP,
              children: [
                photoBox,
                new Paragraph({ children: [], spacing: { before: 0, after: 120 } }),
                new Paragraph({ children: [antiqua(party.name || '', { bold: true })], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua(`ID/ Passport Number: ${party.id_no || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'}`, { bold: true })], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua(`PIN No: ${party.pin || '\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026'}`)], spacing: spacingB(80) }),
                new Paragraph({ children: [antiqua('Signature/Thumb Print\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026\u2026')], spacing: spacingB(80) }),
              ]
            }),
          ]
        }),

        // ── Row 2: Certificate title (full width) ─────────────────────────────
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              borders: vBorders,
              margins: padded,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [antiqua('Certificate of Verification under Section 45 of the Land Registration Act')],
                  spacing: spacingB(80)
                })
              ]
            })
          ]
        }),

        // ── Row 3: Cert text left, signature right (full width cell, right-aligned sig) ──
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 2,
              borders: vBorders,
              margins: padded,
              children: [
                new Paragraph({
                  children: [
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

      ]
    }));

    blockItems.push(spacer());
    return blockItems;
  }

  const allParties = [
    ...transferors.map(t => ({ party: t, role: 'transferor' })),
    ...transferees.map(t => ({ party: t, role: 'transferee' })),
  ];
  allParties.forEach(({ party, role }, idx) => items.push(...executionBlock(party, role, idx === 0)));

  // ── Registry seal section (overridable per form) ──────────────────────────────
  if (opts.buildRegistrarSection) {
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
  items.push(spacer());
  items.push(new Paragraph({ children: [antiqua('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })], spacing: spacingB(80) }));
  items.push(lp(FIRM_NAME_TC + ','));
  items.push(lp(FIRM_LINE2 + ','));
  items.push(lp(FIRM_PO + '.'));
  items.push(lp('Tel. ' + FIRM_TEL));
  items.push(new Paragraph({ children: [antiqua(FIRM_EMAIL, { underline: { type: UnderlineType.SINGLE } })], spacing: spacingB(80) }));

  return items;
}

// ─── LRA 33 — Transfer of Interest in Land ───────────────────────────────────
function buildLRA33() {
  requireTransferParties('lra_33');
  return buildTransferForm({
    formNo: 'LRA 33',
    regulation: '(r. 49(1))',
    docTitle: 'TRANSFER OF INTEREST IN LAND',
    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs }) {
      return [
        detailRow2('Date of Transfer', ''),
        detailRow2('Transferor(s)', transferorNames, true),
        detailRow2(idLabelRuns(transferorIDs), transferorIDs),
        detailRow2('Transferee(s)', transfereeNames, true),
        detailRow2(idLabelRuns(transfereeIDs), transfereeIDs),
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
    regulation: '(r. 63(1))',
    docTitle: 'TRANSFER OF LEASE',
    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs }) {
      return [
        detailRow2('Date of Transfer', ''),
        detailRow2('Original Term of Lease', d.original_term || ''),
        detailRow2('Unexpired Residue of Term', d.unexpired_term || ''),
        detailRow2('Annual Rent', d.annual_rent || ''),
        detailRow2('Transferor(s)', transferorNames, true),
        detailRow2(idLabelRuns(transferorIDs), transferorIDs),
        detailRow2('Transferee(s)', transfereeNames, true),
        detailRow2(idLabelRuns(transfereeIDs), transfereeIDs),
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
    formNo: 'LRA 58',
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
        detailRow2(idLabelRuns(chargeeID), chargeeID),
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
    return new Paragraph({ children: Array.isArray(text) ? text : [antiqua(text, opts2)], spacing: spacingB(80) });
  }
  function lpc84(text, opts2 = {}) {
    const children = Array.isArray(text) ? text : [antiqua(text)];
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
  if (!schema || !schema.form_number || String(schema.form_number).trim() === '' || !schema.doc_title || String(schema.doc_title).trim() === '') {
    console.error(`\n[trained form] schema is missing form_number or doc_title (form_number=${JSON.stringify(schema && schema.form_number)}, doc_title=${JSON.stringify(schema && schema.doc_title)}). A registry instrument must not be generated mislabelled ("Form undefined" / blank title). Fix the schema and re-run /train-form.\n`);
    process.exit(1);
  }
  const transferors = d.transferors || [{ name: d.transferor_name || d.vendor_name || '', id_no: d.transferor_id || d.vendor_id || '' }];
  const transferees = d.transferees || [{ name: d.transferee_name || d.purchaser_name || '', id_no: d.transferee_id || d.purchaser_id || '' }];

  return buildTransferForm({
    formNo:     schema.form_number,
    regulation: schema.regulation || '',
    docTitle:   schema.doc_title,
    roleLabels: schema.party_roles ? {
      transferor:       schema.party_roles.transferor       || 'Transferor(s)',
      transferorSingle: schema.party_roles.transferor_single || 'Transferor',
      transferee:       schema.party_roles.transferee       || 'Transferee(s)',
      transfereeSingle: schema.party_roles.transferee_single || 'Transferee',
    } : undefined,

    buildDetailRows({ detailRow2, idLabelRuns, transferorNames, transferorIDs, transfereeNames, transfereeIDs }) {
      return (schema.detail_rows || []).map(row => {
        let value = '';
        if (row.value_blank)                value = '';
        else if (row.value_field === 'transferorNames') value = transferorNames;
        else if (row.value_field === 'transferorIDs')   value = transferorIDs;
        else if (row.value_field === 'transfereeNames') value = transfereeNames;
        else if (row.value_field === 'transfereeIDs')   value = transfereeIDs;
        else if (row.value_field)           value = d[row.value_field] || '';
        else if (row.value_template)        value = row.value_template.replace(/\{\{(\w+)\}\}/g, (_, k) => d[k] || '');
        const label = row.use_id_label ? idLabelRuns(value) : row.label;
        return detailRow2(label, value, row.bold || false);
      });
    },

    buildBody({ lp, spacer, numbered, lettered }) {
      const items = [];
      for (const block of (schema.body_text || [])) {
        if (block.type === 'intro')    items.push(lp(block.text));
        else if (block.type === 'spacer')   items.push(spacer());
        else if (block.type === 'numbered') items.push(numbered(block.number, block.text.replace(/\{\{(\w+)\}\}/g, (_, k) => d[k] || '')));
        else if (block.type === 'lettered') items.push(lettered(block.letter, block.text));
        else if (block.type === 'witness')  items.push(lp(block.text));
        else items.push(lp(block.text || ''));
      }
      return items;
    },
  });
}

// ─── Build Engagement Letter ─────────────────────────────────────────────────
function buildEngagementLetter() {
  requireFields(['client_name', 'property_lr_no', 'purchase_price_figures', 'legal_fees', 'legal_fees_vat', 'engagement_total'], 'engagement_letter');
  assertVat(d.legal_fees, d.legal_fees_vat, 'engagement_letter');
  const items = [];
  const tw = (text, opts = {}) => new TextRun({ text: String(text || ''), font: FONT_BODY, size: 22, color: BLACK, ...opts });
  const para = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [tw(children)], spacing: { before: 60, after: 60 }, alignment: AlignmentType.JUSTIFIED, ...opts });
  const boldHead = (text) => para([tw(text, { bold: true, size: 22, underline: { type: UnderlineType.SINGLE } })], { spacing: { before: 200, after: 80 } });
  const bp = (text, opts = {}) => para([tw(text)], opts);
  const bpB = (text) => para([tw(text, { bold: true })]);
  const gap = () => new Paragraph({ children: [], spacing: { before: 0, after: 120 } });
  const bullet = (text) => new Paragraph({ children: [tw(text)], bullet: { level: 0 }, spacing: { before: 40, after: 40 }, alignment: AlignmentType.JUSTIFIED });

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
  const feeCell = (text, isHeader = false) => new TableCell({
    children: [new Paragraph({ children: [tw(text, { bold: isHeader })], spacing: { before: 60, after: 60 }, indent: { left: 80 } })],
    shading: isHeader ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
  });
  const feeRow = (label, value) => new TableRow({ children: [feeCell(label), feeCell(value)] });
  const feeTable = (rows) => new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows });

  // ── Letterhead header ───────────────────────────────────────────────────────
  items.push(...buildLetterhead());
  items.push(gap());

  // ── Ref / date line ─────────────────────────────────────────────────────────
  items.push(para([
    tw('Our Ref: ', { bold: true }), tw(d.ref || 'TBA'),
    tw('          Your Ref: TBA          Date: ', { bold: true }), tw(d.date || ''),
  ], { alignment: AlignmentType.LEFT }));
  items.push(gap());

  // ── Salutation ─────────────────────────────────────────────────────────────
  items.push(bp(`Dear ${d.salutation || 'Sir/Madam'},`, { alignment: AlignmentType.LEFT }));
  items.push(gap());

  // ── Subject ────────────────────────────────────────────────────────────────
  items.push(bpB(`RE: ENGAGEMENT LETTER FOR SALE AND PURCHASE OF LAND COMPRISED IN TITLE NO. ${d.property_lr_no || ''}`));
  items.push(gap());

  // ── Opening ────────────────────────────────────────────────────────────────
  items.push(bp('We refer to the above matter.'));
  items.push(gap());
  items.push(para([
    tw(d.purchaser_name || d.client_name || ''), tw(' ('), tw('"the Client"', { bold: true }), tw(') hereby appoints '), tw('MAK & Partners Advocates LLP', { bold: true }),
    tw(' ('), tw('"the Law Firm"', { bold: true }), tw(') to act on '),
    tw(d.client_gender === 'company' ? 'its' : 'his/her'),
    tw(' behalf in matters relating to the purchase of the above Property. Please read through this letter carefully and then sign and return the enclosed copy to us.'),
  ]));
  items.push(gap());
  items.push(bp('The terms of this engagement shall be as provided below:'));
  items.push(gap());

  // ── 1. Commencement ────────────────────────────────────────────────────────
  items.push(boldHead('1.  COMMENCEMENT'));
  items.push(bp('This Engagement Letter shall commence upon execution by the Client and shall terminate on completion of the purchase of the Property.'));
  items.push(bp('Either party may terminate this Engagement Letter through issuance of a seven (7) day written notice to the other party.'));
  items.push(gap());

  // ── 2. Background ──────────────────────────────────────────────────────────
  items.push(boldHead('2.  BACKGROUND'));
  items.push(para([
    tw(d.purchaser_name || d.client_name || ''), tw(' has entered into an agreement with '), tw(d.vendor_name || ''),
    tw(' (The Vendor) to purchase all that property of title number '), tw(d.property_lr_no || '', { bold: true }),
    tw(' situate at '), tw(d.property_location || ''), tw('.'),
  ]));
  items.push(para([
    tw('The Vendor is the registered proprietor of all that parcel of land known as '), tw(d.property_lr_no || '', { bold: true }),
    tw(` (the "Property") at the purchase price of Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/-).`),
  ]));
  items.push(gap());

  // ── 3. Scope of Work ───────────────────────────────────────────────────────
  items.push(boldHead('3.  SCOPE OF WORK'));
  items.push(para([
    tw('Specifically, our Scope of Work will entail, but is not limited to, the following. The Law Firm will act on behalf of '),
    tw(d.purchaser_name || d.client_name || ''),
    tw(' regarding the Purchase of the Property and ensuring that the process is conducted properly:'),
  ]));
  [
    'Reviewing and witnessing the Sale Agreement;',
    'Following up on the progress and status of the transaction;',
    'Negotiating the terms of the Sale Agreement on your behalf;',
    'Advising on the costs related to the transfer;',
    'Facilitating the valuation for stamp duty assessment;',
    'Advising on applicable stamp duty (subject to change based on market value);',
    'Attending to the payment of stamp duty on the transfer;',
    'Attending to the registration of the transfer and the issuance of the title in your favour; and',
    'Generally safeguarding and protecting your legal interests throughout the transaction.',
  ].forEach(s => items.push(bullet(s)));
  items.push(gap());

  // ── 4. Assumptions ─────────────────────────────────────────────────────────
  items.push(boldHead('4.  ASSUMPTIONS'));
  items.push(bp('Our scope of work is limited to the matters set out in paragraph 3 above. Any work undertaken outside the agreed scope will be subject to a separate fee agreement.'));
  items.push(bp('We will not be required to respond to questions or clarifications outside the agreed scope of work.'));
  items.push(gap());

  // ── 5. Professional Fees and Disbursements ─────────────────────────────────
  items.push(boldHead('5.  PROFESSIONAL FEES AND DISBURSEMENTS'));
  items.push(bp('Based on our understanding of the above scope, our fees shall be as set out below.'));
  items.push(gap());
  items.push(bpB('LEGAL FEES FOR THE TRANSACTION'));
  items.push(gap());
  items.push(feeTable([
    new TableRow({ children: [feeCell('ITEM', true), feeCell('COST (Kshs)', true)] }),
    feeRow('Legal fees', d.legal_fees || ''),
    feeRow('VAT 16%', d.legal_fees_vat || ''),
    feeRow('Disbursements', d.disbursements || ''),
    feeRow('TOTAL', d.engagement_total || ''),
  ]));
  items.push(gap());
  items.push(bpB('COSTS TO CATER FOR THE REGISTRATION MODALITIES'));
  items.push(gap());
  items.push(feeTable([
    new TableRow({ children: [feeCell('ITEM', true), feeCell('COST (Kshs)', true)] }),
    feeRow('Disbursements', ''),
    feeRow('Valuation and Assessment of stamp duty', ''),
    feeRow('Stamp Duty', 'Subject to advisement by the Valuer'),
    feeRow('Attending to the Registration Formalities', ''),
    feeRow('Ensuring the Procuring and Processing of the Title in your favour', ''),
  ]));
  items.push(gap());
  items.push(bp('A deposit of 50% of the legal fees shall be payable upon commencement of our services, specifically at the stage of reviewing and witnessing the Sale Agreement. The balance shall be payable prior to completion.'));
  items.push(gap());

  // ── 6. Confidentiality ─────────────────────────────────────────────────────
  items.push(boldHead('6.  CONFIDENTIALITY'));
  items.push(bp('The Law Firm and its personnel shall not at any time during or after the termination of this engagement use or disclose any confidential information relating to the Client except as required for the performance of this engagement or as required by law.'));
  items.push(gap());

  // ── 7. Communication ───────────────────────────────────────────────────────
  items.push(boldHead('7.  COMMUNICATION'));
  items.push(bp('There shall be free flow of communication between the parties and the Law Firm shall keep the Client informed of all pertinent developments relating to the transaction.'));
  items.push(para([
    tw('Our Managing Partner, '), tw('Kennedy Ashimosi', { bold: true }),
    tw(', shall oversee this matter and will be assisted by '), tw('Ann Wayodi', { bold: true }),
    tw(', an Associate Advocate.'),
  ]));
  items.push(para([
    tw('Any correspondence to the Law Firm shall be copied to '), tw('admin@makadvocates.com', { bold: true }),
    tw(' and '), tw('annwayodi@makadvocates.com', { bold: true }), tw('.'),
  ]));
  items.push(gap());
  items.push(bpB('Response Times'));
  items.push(bp('The Law Firm shall acknowledge all communications within twenty-four (24) hours by email and respond substantively within forty-eight (48) hours by phone or email.'));
  items.push(gap());

  // ── 8. Governing Law ───────────────────────────────────────────────────────
  items.push(boldHead('8.  GOVERNING LAW AND DISPUTE RESOLUTION'));
  items.push(bp('This letter of Engagement shall be governed by Kenyan law. Any disputes shall be resolved through good faith negotiations. If the parties fail to reach an amicable settlement within thirty (30) days, the matter shall be referred to a single arbitrator under the Arbitration Act.'));
  items.push(gap());

  // ── 9. Acceptance ──────────────────────────────────────────────────────────
  items.push(boldHead('9.  ACCEPTANCE'));
  items.push(bp('Kindly confirm your acceptance of this letter of Engagement by signing duplicate copies of this letter and returning one signed copy to us. We look forward to hearing from you.'));
  items.push(gap());
  items.push(bp('Yours faithfully,'));
  items.push(gap());
  items.push(new Paragraph({ children: [], spacing: { before: 400, after: 0 } }));
  items.push(bp('For MAK & PARTNERS ADVOCATES LLP', { alignment: AlignmentType.LEFT }));
  items.push(gap());
  items.push(bp('_______________________'));
  items.push(bp('ASSOCIATE'));
  items.push(gap());
  items.push(gap());

  // ── Acceptance block ───────────────────────────────────────────────────────
  items.push(bpB('ACCEPTANCE'));
  items.push(gap());
  items.push(bp('I/We, the undersigned, hereby accept the above terms of engagement:'));
  items.push(gap());
  items.push(bp(`Name: ${d.purchaser_name || d.client_name || '___________________________'}`));
  items.push(bp('Signature: ___________________________'));
  items.push(bp('Date: ___________________________'));

  return items;
}

// ─── Build Fee Note ───────────────────────────────────────────────────────────
function buildFeeNote() {
  requireFields(['property_lr_no', 'legal_fees', 'legal_fees_vat', 'fee_note_total'], 'fee_note');
  assertVat(d.legal_fees, d.legal_fees_vat, 'fee_note');
  const items = [];
  const tw = (text, opts = {}) => new TextRun({ text: String(text || ''), font: FONT_BODY, size: 22, color: BLACK, ...opts });
  const para = (children, opts = {}) => new Paragraph({ children: Array.isArray(children) ? children : [tw(children)], spacing: { before: 60, after: 60 }, alignment: AlignmentType.JUSTIFIED, ...opts });
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
  items.push(para([
    tw('Our Ref: ', { bold: true }), tw(d.ref || 'TBA'),
    tw('          Your Ref: TBA          Date: ', { bold: true }), tw(d.date || ''),
  ], { alignment: AlignmentType.LEFT }));
  items.push(gap());

  // ── Salutation ─────────────────────────────────────────────────────────────
  items.push(bp('Dear Sir/Madam,', { alignment: AlignmentType.LEFT }));
  items.push(gap());

  // ── Subject ────────────────────────────────────────────────────────────────
  items.push(para([tw(`RE: FEE NOTE FOR SALE AND PURCHASE OF ${d.property_lr_no || ''}`, { bold: true })]));
  items.push(gap());

  // ── Body ───────────────────────────────────────────────────────────────────
  items.push(bp('Our fees for professional services as per the Advocates’ Remuneration Order Schedule 1 Part 1, rendered for:'));
  items.push(gap());
  [
    'Due Diligence',
    'Perusal of the Draft Sale Agreement.',
    'Advising the client on the transaction.',
    'Following up on the progress and status of the transaction;',
    'Negotiating the terms of the Sale Agreement on your behalf;',
    'Advising on the costs related to the transfer;',
    'Facilitating the valuation for stamp duty assessment;',
    'Advising on applicable stamp duty (subject to change based on market value);',
    'Attending to the payment of stamp duty on the transfer;',
    'Attending to the registration of the transfer and the issuance of the title in your favour; and',
    'Safeguarding and protecting your legal interests throughout the transaction.',
  ].forEach(s => items.push(bullet(s)));
  items.push(gap());

  // ── Fee table ──────────────────────────────────────────────────────────────
  const legalFees = d.legal_fees || '';
  const vatAmt = d.legal_fees_vat || (legalFees ? '' : '');
  const disbOffice = d.disbursements_office || '';
  const disbStatutory = d.disbursements_statutory || '';
  const total = d.fee_note_total || d.engagement_total || '';

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
  items.push(bpB('ACCOUNT DETAILS:'));
  items.push(bp('Account Name: MAK & PARTNERS ADVOCATES LLP'));
  items.push(bp('Account No: 1010760016'));
  items.push(bp('Bank: VICTORIA COMMERCIAL BANK'));
  items.push(gap());

  // ── Closing ────────────────────────────────────────────────────────────────
  items.push(bp('Yours faithfully,', { alignment: AlignmentType.LEFT }));
  items.push(gap());
  items.push(new Paragraph({ children: [], spacing: { before: 400, after: 0 } }));
  items.push(bp('For MAK & Partners Advocates', { alignment: AlignmentType.LEFT }));

  return items;
}

// ─── Build Developer Sale Agreement (dispatcher) ─────────────────────────────
// If d.project_slug is supplied AND matches an entry in developer-projects.json,
// route to the project-aware builder. Otherwise fall back to the legacy builder
// for backward compatibility with existing data files.
function buildDeveloperSaleAgreement() {
  const slug = d.project_slug;
  if (!slug) return buildLegacyDeveloperSaleAgreement();
  const project = loadDeveloperProject(slug);
  if (!project) {
    throw new Error(`Unknown developer project slug: "${slug}". Add an entry to scripts/developer-projects.json under projects.${slug}.`);
  }
  return buildProjectAwareDeveloperSaleAgreement(project);
}

// ─── Project-aware Developer Sale Agreement builder ──────────────────────────
// Reads the project registry + per-project drafting rules and emits a faithful
// MAK-style developer sale agreement. Handles conditional clauses (LSK 2015,
// COVID AV, arbitration vs NCIA, Common Seal vs PoA, electricity line item,
// resale admin fee, signing-anchored completion, bi-annual service charge,
// tenant handover protocol).
function buildProjectAwareDeveloperSaleAgreement(project) {
  const children = [];
  const vendor       = project.vendor;
  const land         = project.land;
  const development  = project.development;
  const completion   = project.completion;
  const payments     = project.payments;
  const dispute      = project.dispute_resolution;
  const tsavo        = developerProjects.tsavo_group_constants || {};
  const vAdv         = developerProjects.vendor_advocates || {};

  // Conditional flags driving rendering
  const isPoA           = project.vendor_execution_mode === 'power_of_attorney';
  const incorpLSK       = project.incorporates_lsk_conditions_2015 === true;
  const incCovid        = project.covid_audio_visual_verification_clause === true;
  const includesElec    = payments?.stage_2?.electricity_meter_kes != null;
  const hasDLP          = completion?.defects_liability_period_months != null;
  const hasResaleFee    = project.resale_admin_fee_percent != null;
  const isSigningAnchor = completion?.anchor === 'agreement_signing_date';
  const isBiAnnualSC    = completion?.service_charge_frequency === 'bi_annually';
  const hasTenantHand   = project.tenant_handover_notice_days != null;
  const graceUnit       = payments?.late_payment_grace_unit === 'business_days' ? 'Business Days' : 'days';
  const graceDays       = payments?.late_payment_grace_days ?? 30;
  const lagDays         = completion?.lag_business_days ?? 90;
  const lagLabel        = completion?.lag_label || 'Sale Completion Date';
  const dlpMonths       = completion?.defects_liability_period_months ?? 6;
  const inspectDays     = completion?.post_handover_inspection_window_days ?? 30;

  // ── REQUIRED-FIELDS VALIDATION ────────────────────────────────────────────
  // The Schedule of Particulars (Sections I-V) is where matter-specific data
  // lands. Missing fields used to silently render as "[*]", producing a
  // half-blank contract that looked superficially complete. Per the no
  // paraphrased fallbacks rule, fail loudly so the caller knows to collect
  // the data before generating.
  const REQUIRED = [
    'purchaser_name', 'purchaser_id', 'purchaser_email', 'purchaser_phone',
    'apartment_number', 'apartment_floor',
    'purchase_price_words', 'purchase_price_figures',
    'deposit_words', 'deposit_figures',
    'balance_words', 'balance_figures',
    'balance_installments_count', 'balance_monthly_amount', 'balance_start_month',
  ];
  const missing = REQUIRED.filter(k => d[k] == null || d[k] === '');
  if (missing.length) {
    throw new Error(
      `developer_sale_agreement is missing required fields for project "${project.short_label || project.display_name}":\n` +
      missing.map(k => `  - ${k}`).join('\n') + '\n\n' +
      'These populate Sections I-V of the Schedule of Particulars (purchaser, apartment, price, deposit, balance instalments).\n' +
      'Collect them from the Purchaser (or the Conveyance Airtable record) before re-running the generator.\n' +
      'See commands/draft-conveyance-doc.md → developer_sale_agreement required fields checklist.'
    );
  }

  const purchaserName   = d.purchaser_name;
  const purchaserId     = d.purchaser_id;
  const purchaserEmail  = d.purchaser_email;
  const purchaserPhone  = d.purchaser_phone;
  const aptNumber       = d.apartment_number;
  const aptFloor        = d.apartment_floor;
  const priceFigures    = d.purchase_price_figures;
  const priceWords      = d.purchase_price_words;
  const depositFigures  = d.deposit_figures;
  const depositWords    = d.deposit_words;
  const balanceFigures  = d.balance_figures;
  const balanceWords    = d.balance_words;
  const installments    = d.balance_installments_count;
  const monthlyAmount   = d.balance_monthly_amount;
  const startMonth      = d.balance_start_month;
  const date            = d.date || '';

  // Cover page helpers
  const cvT = (text, opts = {}) => new TextRun({ text: String(text || ''), font: 'Tw Cen MT', size: 22, color: BLACK, ...opts });
  const cvP = (runs, align = AlignmentType.CENTER, sp = {}) => new Paragraph({ children: runs, alignment: align, spacing: { before: 0, after: 0, ...sp } });
  const cvGap = (twips) => new Paragraph({ children: [], spacing: { before: twips, after: 0 } });
  // Horizontal rule — bottom border on an empty paragraph spans full content width
  const hRule = () => new Paragraph({
    children: [],
    spacing: { before: 40, after: 40 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
  });

  // Load MAK logo (designed PNG asset) — falls back to text if missing.
  const makLogoPath = path.join(__dirname, 'assets', 'sale-agreement-logo.png');
  const makLogo = fs.existsSync(makLogoPath) ? fs.readFileSync(makLogoPath) : null;

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  // Older MAK templates (Royal Suburb 1, Royal Suburb 2) open with the "Dated"
  // line at the very top of the cover. Newer templates skip it.
  if (project.cover_page_dated_top_line === true) {
    children.push(cvGap(200));
    children.push(cvP([
      cvT('Dated', { bold: true }),
      cvT('________________ '),
      cvT('this day', { bold: true }),
      cvT(' _________________________ '),
      cvT('of', { bold: true }),
      cvT('   '),
      cvT(String(new Date().getFullYear()) + '.', { bold: true }),
    ], AlignmentType.CENTER, { line: 300, lineRule: 'auto' }));
    children.push(cvGap(280));
  } else {
    children.push(cvGap(400));
  }

  // Vendor block
  children.push(cvP([cvT(vendor.company_name, { bold: true, size: 24 })]));
  children.push(cvGap(40));
  children.push(cvP([cvT('(as “Vendor”)')]));
  children.push(cvGap(180));

  // MAK signature "- a n d -" style with letter spacing
  children.push(cvP([cvT('- a n d –', { bold: false })]));
  children.push(cvGap(180));

  // Purchaser block
  children.push(cvP([cvT(purchaserName, { bold: true, size: 24 })]));
  children.push(cvGap(40));
  children.push(cvP([cvT('(as “Purchaser”)')]));
  children.push(cvGap(160));

  // Top horizontal rule
  children.push(hRule());
  children.push(cvGap(80));

  // AGREEMENT FOR SALE title block
  children.push(cvP([cvT('AGREEMENT FOR SALE', { bold: true, size: 24 })]));
  children.push(cvGap(80));
  // Per-project relation phrase and apartment line — both pulled verbatim
  // from Ann's source covers. Fallbacks preserve prior behavior.
  const coverRelation = project.cover_relation_phrase
    || (isSigningAnchor ? 'relating to' : 'in respect of');
  const coverApartmentLine = (project.cover_apartment_line
    || `Apartment${project.cover_page_dated_top_line ? '(s)' : ''} Number${project.cover_page_dated_top_line ? '(s)' : ''} {*}, ${vendor.company_name}`)
    .replace(/\{\*\}/g, aptNumber);
  children.push(cvP([cvT(coverRelation)]));
  children.push(cvGap(80));
  // Apartment + Project line
  children.push(cvP([cvT(coverApartmentLine, { bold: true })]));
  children.push(cvGap(80));

  // Bottom horizontal rule
  children.push(hRule());

  // Spacer down to the DRAWN BY block
  children.push(cvGap(400));

  // DRAWN BY label
  children.push(cvP([cvT('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(cvGap(40));

  // MAK logo if available, otherwise firm name in text
  if (makLogo) {
    children.push(new Paragraph({
      children: [new ImageRun({ data: makLogo, transformation: { width: 166, height: 69 }, type: 'png' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
    }));
  } else {
    children.push(cvP([cvT(vAdv.firm_name, { bold: true })]));
  }

  // Firm address block (centered, under the logo) — bold per Robin's
  // formatting pass across all 6 templates.
  children.push(cvP([cvT(vAdv.address_line_1 || '', { bold: true })]));
  children.push(cvP([cvT(vAdv.address_line_2 || '', { bold: true })]));
  children.push(cvP([cvT(vAdv.po_box || '', { bold: true })]));
  children.push(cvP([cvT(`E: ${vAdv.email || ''}`, { bold: true })]));
  children.push(cvP([cvT(vAdv.website || '', { bold: true })]));
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── DISPATCH: per-project verbatim body (REQUIRED — no fallback) ──────────
  // Generator HARD-FAILS if scripts/clause-bodies/<project_slug>.js is absent.
  // This is by design: paraphrased fallbacks for firm work product are not
  // permitted (see memory/feedback_no_paraphrased_fallbacks.md).
  const perProjectBodyPath = path.join(__dirname, 'clause-bodies', d.project_slug + '.js');
  if (!fs.existsSync(perProjectBodyPath)) {
    throw new Error(
      `Verbatim clause-bodies file is missing for project "${d.project_slug}". ` +
      `Expected at: ${perProjectBodyPath}\n` +
      `\n` +
      `Generators for MAK firm work product must use verbatim source text only. ` +
      `Paraphrased / synthesised fallbacks are not permitted.\n` +
      `\n` +
      `To add this project: extract the verbatim clauses from the MAK source DOCX ` +
      `into scripts/clause-bodies/${d.project_slug}.js (see royal_suburb_1.js as the canonical example).`
    );
  }
  delete require.cache[require.resolve(perProjectBodyPath)]; // hot-reload during dev
  const buildBody = require(perProjectBodyPath);
  const perProjectBody = buildBody({
    project, d,
    helpers: {
      antiqua, bodyPara, centeredPara, spacer, definitionPara, bulletPara,
      makClauseH, makSubC, makRecital, makParty,
      AlignmentType, UnderlineType, BorderStyle, WidthType,
      Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, PageBreak,
      numberInWords, formatKes,
    },
  });
  if (!Array.isArray(perProjectBody) || perProjectBody.length === 0) {
    throw new Error(`clause-bodies/${d.project_slug}.js returned an empty or invalid body. Expected an array of Paragraph elements.`);
  }
  children.push(...perProjectBody);

  // ── (Legacy paraphrased body has been disabled — kept inline below in dead ─
  //     code only as a transcription scaffold while verbatim bodies are being ─
  //     populated. The if(false) gate guarantees it is never reached at runtime.)
  if (false) {
  // ── PREAMBLE ───────────────────────────────────────────────────────────────
  // MAK style: "THIS AGREEMENT is made…" is CENTRED.
  children.push(centeredPara([
    antiqua(`THIS AGREEMENT is made as of the ${date || '___ day of ___'}, 20___`),
  ]));
  children.push(spacer());
  children.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  children.push(spacer());
  children.push(makParty([
    antiqua(`${vendor.company_name} (Company Registration Number ${vendor.company_registration_number}), of ${vendor.po_box} (the `),
    antiqua('"Vendor"', { bold: true }),
    antiqua(' which shall, where context allows, include the Vendor’s successors in title and assigns); and'),
  ]));
  children.push(makParty([
    antiqua('The Purchaser, being the person(s), whose particulars are set out in Section I of the Schedule of Particulars (which shall, where context allows, include the Purchaser’s successors in title, personal representatives, heirs and permitted assigns (as may be applicable) and where the Purchaser is more than one person, the Purchaser’s obligation shall be joint and several).'),
  ]));
  children.push(spacer());

  // ── RECITALS ──────────────────────────────────────────────────────────────
  children.push(bodyPara([antiqua('WHEREAS:', { bold: true })]));
  children.push(spacer());

  // Recital A — Vendor's title (tenure varies by project)
  let titleRecital;
  if (land.tenure === 'leasehold_government_of_kenya') {
    titleRecital = `The Vendor is registered as proprietor as lessee from the Government of Kenya of ALL THAT property known as Title Number ${land.title_number} (subject to the conditions contained in the Certificate of Lease) (hereinafter referred to as "the Land").`;
  } else {
    titleRecital = `The Vendor is the registered legal and beneficial owner of ALL THAT parcel of land known as ${land.title_number} (hereinafter referred to as "the Land").`;
  }
  children.push(makRecital([antiqua(titleRecital)]));

  // Recital B — Development construction status
  const constructionPhrase = {
    constructed:                'has constructed',
    erected_and_completed:      'has erected and completed',
    in_process_of_erection:     'is in the process of erecting and completing',
    under_construction:         'has commenced and shall undertake the construction of',
  }[development.construction_status] || 'shall undertake the construction of';
  children.push(makRecital([
    antiqua(`The Vendor ${constructionPhrase} a development project on the Land known as "${development.name}" (hereinafter referred to as "the Development")${development.floors ? ` which comprises ${development.floors} floors consisting of ${development.unit_breakdown}` : `${development.unit_breakdown ? ` comprised of ${development.unit_breakdown}` : ''}`}, together with usual social amenities, in accordance with the Building Plans available for inspection at the Vendor’s offices.`),
  ]));

  // Recital C — Change of User status (where relevant)
  const couStatus = land.change_of_user_status;
  if (couStatus === 'applied_surrender_pending') {
    children.push(makRecital([
      antiqua('The Vendor has applied for Change of User (as hereinafter defined) of the Land from single dwelling unit to multi dwelling units, which process will require surrender of the existing Title Deed to enable issuance of a new title for the Land on or before the Practical Completion Date.'),
    ]));
  } else if (couStatus === 'completed_new_title_issued') {
    children.push(makRecital([
      antiqua('The Vendor has completed the Change of User Process of the Land from single dwelling unit to multi-dwelling units and has acquired a new title with the new user endorsed.'),
    ]));
  } else if (couStatus === 'in_progress_subdivision_pending') {
    children.push(makRecital([
      antiqua('Pending the process of subdivision and transfer of a portion of the Land as contemplated above, the Vendor has commenced and shall undertake the construction of the Development and the Change of User on the Land.'),
    ]));
  } else if (couStatus === 'commenced_in_progress') {
    children.push(makRecital([
      antiqua('The Vendor has commenced and shall undertake the Change of User of the Land. Subject to completion of the Change of User, the Vendor shall geo-reference the Development and prepare and register the Sectional Plan after the Anticipated Practical Completion Date in accordance with this Agreement.'),
    ]));
  }

  // Recital D — Agreement to sell
  children.push(makRecital([
    antiqua('Subject to this Agreement, the Vendor has agreed to sell, and the Purchaser has agreed to purchase the Apartment whose particulars are set out in Section II of the Schedule of Particulars (which is part of the Development) in consideration of the Purchase Price whose particulars are set out in Section III of the Schedule of Particulars, upon the terms and conditions set out below.'),
  ]));
  children.push(spacer());
  children.push(bodyPara([antiqua('NOW IT IS HEREBY AGREED as follows:', { bold: true })]));
  children.push(spacer());

  // ── 1. DEFINITIONS AND INTERPRETATION ─────────────────────────────────────
  // From here on, every makClauseH is auto-numbered 1, 2, 3 ... and each
  // makSubC continues 1.1, 1.2 (restarting under each new clause).
  // Each definition is a level-2 sub-clause (1.1.1, 1.1.2, ...).
  children.push(makClauseH('DEFINITIONS AND INTERPRETATION'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('In this Agreement (including the recitals hereto) except where the context otherwise requires the following words and expressions shall have the following meanings:'),
  ]));
  children.push(spacer());

  const def = (term, body) => {
    children.push(makSubC([
      antiqua(`"${term}"`, { bold: true }),
      antiqua(' means '),
      antiqua(body),
    ], 2));
  };

  const _apcd = d.apcd_override || completion.anticipated_practical_completion_date;
  if (!isSigningAnchor && _apcd) {
    def('Anticipated Practical Completion Date', `${_apcd}, being the anticipated date of issue by the Architect of a certificate of practical completion confirming completion of all works in respect to the Development, and "Practical Completion Certificate" shall be construed accordingly.`);
  } else if (!isSigningAnchor) {
    def('Anticipated Practical Completion Date', 'the anticipated date of issue by the Architect of a certificate of practical completion of the Development, and "Practical Completion Certificate" shall be construed accordingly.');
  }
  def('Architect', `${tsavo.architect?.name || 'TSAVO Architects Limited'}, of ${tsavo.architect?.po_box || 'Post Office Box Number 15854-00509, Nairobi'}.`);
  def('Architect’s Office', tsavo.architect?.office || 'Coral Bells Apartments, Thindigua, Kiambu Road, Nairobi.');
  def('Architectural Drawings', 'the Architect’s drawings for the Apartment(s) (including any revision of the drawings).');
  def('Ardhisasa', 'the National Land Information System, being an online Government platform operated by the Ministry of Lands and Physical Planning and responsible for management of online land transactions.');
  def('Building Plans', 'the registered building plan(s) for the Development approved by the relevant authorities which may be amended with approval from the relevant authorities from time to time.');
  def('Business Day', 'any day (other than Saturday, Sunday, national day or gazetted public holiday) on which banking institutions in Kenya are generally open for the conduct of banking business.');
  def('By-Laws', 'the by-laws specified under the Second Schedule of the Sectional Properties Regulations, 2021 subject to any amendments effected to the said By-Laws by the Vendor with respect to the Development.');
  def('Common Property', 'all parts, halls, staircases and other access ways and areas on the Land and on the Development, including the common parking areas, gardens and other amenities provided for the common use of the Purchaser and other authorized occupiers residing at the Development.');
  def('Corporation', 'the body corporate to be incorporated under the Sectional Properties Act to manage the Development; Corporation shall be construed to include the members of the Corporation.');
  def('Data Protection Laws', 'the Data Protection Act No. 24 of 2019 together with the Data Protection (General) Regulations 2021, the Data Protection (Complaints Handling Procedure and Enforcement) Regulations 2021 and the Data Protection (Registration of Data Controllers and Processors) Regulations 2021.');
  if (hasDLP) {
    def('Defects Liability Period', `the period of ${dlpMonths} (${dlpMonths === 6 ? 'six' : String(dlpMonths)}) months from and including the Anticipated Practical Completion Date in which the Vendor is required to repair material defects that appear in the Apartment(s).`);
  }
  def('Development', `the Vendor’s development known as "${development.name}"${development.floors ? ` which shall comprise ${development.floors} floors consisting of ${development.unit_breakdown}` : (development.unit_breakdown ? ` comprised of ${development.unit_breakdown}` : '')}, together with social amenities, parking, gardens and other usual amenities in accordance with the Building Plans and Architectural Drawings.`);
  def('Land Act', 'the Land Act (Act No. 6 of 2012).');
  def('Land Laws', 'together the Land Registration Act, the Land Act, the Sectional Properties Laws, any subsidiary legislation, rules and regulations promulgated thereunder, and any practice directions issued pursuant to the Land Act and the Land Registration Act.');
  def('Land Registration Act', 'the Land Registration Act (Act No. 3 of 2012).');
  def('Registrar', 'the relevant Land Registrar at the Lands Office, Nairobi.');

  // Sale Completion Date — varies by anchor
  if (isSigningAnchor) {
    def(lagLabel, `the date falling at least ${lagDays} (${numberInWords(lagDays)}) Business Days following the signing of this Agreement subject to: (i) all payment obligations of the Purchaser under this Agreement being satisfied in full; (ii) the Sectional Plan being duly registered at the Land Registry; (iii) the Sectional Title being issued in favour of the Vendor by the Land Registry with the Unit Factor endorsed thereon; and (iv) the provisions of the clause on Changes in Law or Circumstances.`);
  } else {
    const couCondition = ['applied_surrender_pending', 'commenced_in_progress', 'in_progress_subdivision_pending'].includes(couStatus)
      ? ' (iv) the Change of User being completed by the Vendor; and (v)'
      : ' (iv)';
    def(lagLabel, `the date falling at least ${lagDays} (${numberInWords(lagDays)}) Business Days following the Anticipated Practical Completion Date subject to: (i) all payment obligations of the Purchaser under this Agreement being satisfied in full; (ii) the Sectional Plan being duly registered at the Land Registry; (iii) the Sectional Title being issued in favour of the Vendor by the Land Registry with the Unit Factor endorsed thereon;${couCondition} the provisions of the clause on Changes in Law or Circumstances.`);
  }
  def('Sectional Plan', 'a geo-referenced plan of the Apartment prepared by a duly licensed surveyor, approved by the relevant County Government and registered with the relevant Land Registry.');
  def('Sectional Properties Act', 'the Sectional Properties Act (No. 21 of 2020), Laws of Kenya.');
  def('Sectional Properties Regulations', 'the Sectional Properties Regulations, 2021 promulgated under the Sectional Properties Act.');
  def('Sectional Properties Laws', 'together the Sectional Properties Act and the Sectional Properties Regulations as amended from time to time.');
  def('Sectional Title', 'a certificate of lease/title in respect to the Apartment registered under the Sectional Properties Laws.');
  if (isBiAnnualSC) {
    def('Service Charge', 'a bi-annually sum that shall be payable after the Anticipated Practical Completion Date by the Purchaser to the Corporation, which Service Charge shall be utilised for the management of the Development.');
  } else if (isSigningAnchor) {
    def('Service Charge', 'a monthly sum that shall be payable after possession by the Purchaser to the Corporation, which Service Charge shall be utilised for the management of the Development.');
  } else {
    def('Service Charge', 'a monthly sum that shall be payable after the Anticipated Practical Completion Date by the Purchaser to the Corporation, which Service Charge shall be utilised for the management of the Development.');
  }
  def('Unit Factor', 'a proportionate factor of ownership in the Corporation, determined in accordance with the Sectional Properties Laws.');
  def('Vendor’s Advocates', `the law firm of ${vAdv.firm_name}, ${vAdv.address_line_1}, ${vAdv.address_line_2}, ${vAdv.po_box}.`);
  def('Vendor’s Office', tsavo.vendor_office_address || 'Coral Bells, Thindigua, Kiambu Road, Nairobi.');
  children.push(spacer());

  children.push(makSubC([
    antiqua('In this Agreement, words importing the singular include the plural and vice versa; words of the neuter gender include the feminine and masculine; references to a statute include any statutory modification or re-enactment; and the recitals form an integral part of this Agreement.'),
  ]));
  children.push(spacer());

  // ── 2. VENDOR'S WORKS AND PRACTICAL COMPLETION ─────────────────────────────
  if (!isSigningAnchor) {
    children.push(makClauseH('THE VENDOR’S WORKS AND PRACTICAL COMPLETION'));
    children.push(spacer());
    children.push(makSubC([
      antiqua(`The Vendor shall undertake the construction of the Development substantially in accordance with the approved Building Plans and the Architectural Drawings.`),
    ]));
    children.push(makSubC([
      antiqua('The Vendor shall have the right (in its reasonable discretion) to make such revisions, variations or modifications to the Building Plans and the Architectural Drawings as the Vendor may require, provided that the changes (a) do not materially affect the external facade of the Development or the Apartment; (b) are required for obtaining any necessary licenses, permissions or compliance with the requirements of any local or other authority; or (c) which the Vendor believes will improve the quality of accommodation or general appearance of the Development.'),
    ]));
    children.push(makSubC([
      antiqua('The Purchaser shall not have the right to make variations to the design, layout or position of the Apartment, nor to issue instructions to the Vendor’s Architect.'),
    ]));
    children.push(makSubC([
      antiqua('Subject to the provisions of this Agreement, the Vendor shall use all reasonable endeavours to meet the Anticipated Practical Completion Date and shall notify the Purchaser of any delays at least three (3) months prior to the Anticipated Practical Completion Date.'),
    ]));
    if (hasDLP) {
      children.push(makSubC([
        antiqua(`The Vendor shall ensure that any material defects in the Apartment which appear within the Defects Liability Period shall be repaired at the Vendor’s cost, provided that (a) the Purchaser has completed payment of the Purchase Price before or within the Defects Liability Period and has taken possession of the Apartment; (b) the Purchaser notifies the Vendor of the material defects within the Defects Liability Period; and (c) the Vendor shall only be bound to remedy those material defects notified in writing by the Purchaser within the Defects Liability Period. The Vendor is not liable for defects relating to works undertaken by the Purchaser in fitting out the Apartment, nor for ordinary wear and tear.`),
      ]));
    }
    children.push(spacer());
  } else {
    // Skywalk path — construction complete
    children.push(makClauseH('THE VENDOR’S WORKS'));
    children.push(spacer());
    children.push(makSubC([
      antiqua('The Development has been constructed substantially in accordance with the approved Building Plans and the Architectural Drawings.'),
    ]));
    children.push(spacer());
  }

  // ── 3. PURCHASE PRICE AND OTHER PAYMENTS ──────────────────────────────────
  children.push(makClauseH('THE PURCHASE PRICE AND OTHER PAYMENTS'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('The Purchaser shall pay the Purchase Price free of set-off, deduction or counterclaim on the terms set out in Section V of the Schedule of Particulars.'),
  ]));
  children.push(makSubC([
    antiqua('The Purchaser shall pay legal fees and costs (as set out in the Schedule to this Agreement) in three (3) stages: Stage 1 costs payable on execution; Stage 2 costs payable within thirty (30) days of completion of payment of the Purchase Price; Stage 3 costs payable on the Sale Completion Date. Stage 2 costs are estimates which the Vendor reserves the right to adjust at the time scheduled for payment.'),
  ]));
  children.push(makSubC([
    antiqua('In addition to the obligations above, the Purchaser shall pay to the Vendor the utility and georeferencing costs (the "Utility and Georeferencing Costs") on the terms set out in Section VI of the Schedule of Particulars.'),
  ]));
  // Vendor bank block
  children.push(makSubC([
    antiqua('All payments to the Vendor in respect of the Purchase Price shall be paid to the following account:'),
  ]));
  const vb = payments.vendor_bank;
  const vbLines = [
    `Account Name: ${vb.account_name}`,
    `Bank: ${vb.bank_name}`,
    vb.branch ? `Branch: ${vb.branch}` : null,
    `Account Number: ${vb.account_number}`,
    vb.bank_code ? `Bank Code: ${vb.bank_code}` : null,
    vb.branch_code ? `Branch Code: ${vb.branch_code}` : null,
    `SWIFT Code: ${vb.swift_code}`,
    vb.paybill_number ? `M-PESA Paybill: ${vb.paybill_number}` : null,
  ].filter(Boolean);
  vbLines.forEach(line => children.push(definitionPara([antiqua(line)])));
  children.push(spacer());

  // ── 4. OVERDUE PAYMENTS ────────────────────────────────────────────────────
  children.push(makClauseH('OVERDUE PAYMENTS'));
  children.push(spacer());
  children.push(makSubC([
    antiqua(`If the Purchaser fails to honour the Purchaser’s payment obligations to the Vendor, and payment is not effected within ${graceDays} (${numberInWords(graceDays)}) ${graceUnit} of the due date, then the Vendor may, in its sole discretion (but without prejudice to any other right or remedy), elect to treat non-payment as a fundamental breach of the Purchaser’s obligations under this Agreement and the provisions of the Termination clause shall apply.`),
  ]));
  children.push(spacer());

  // ── 5. POSSESSION, COMPLETION, REGISTRATION & PROPERTY MANAGEMENT ─────────
  children.push(makClauseH('GRANT OF POSSESSION, SALE COMPLETION, REGISTRATION AND PROPERTY MANAGEMENT'));
  children.push(spacer());
  children.push(makSubC([
    antiqua(`Subject to payment of (i) the Purchase Price in full and (ii) Stage 1 costs and Stage 2 costs in full, the Vendor shall grant possession of the Apartment to the Purchaser upon the issuance of the Practical Completion Certificate. For the avoidance of doubt, if the Purchaser is paying the Balance in instalments extending ${isSigningAnchor ? 'beyond such date' : 'beyond the Anticipated Practical Completion Date'}, the Purchaser shall NOT be entitled to possession of the Apartment or to any rental income from the Apartment until full payment of the Balance is received by the Vendor. Upon handover, the Purchaser shall, with effect from the first calendar month of receiving possession, remit to the Vendor and/or the Corporation the Service Charge as and when due, whether formally demanded or not.`),
  ]));
  if (hasTenantHand) {
    children.push(makSubC([
      antiqua(`Where the Purchaser completes payment of the balance of the Purchase Price and the Apartment is in occupation by a Tenant, the Purchaser shall cause the Vendor to give the tenant at least ${project.tenant_handover_notice_days} (${numberInWords(project.tenant_handover_notice_days)}) days’ notice from the date of receipt of final payment to vacate the Apartment before official handover.`),
    ]));
  }
  if (hasDLP) {
    children.push(makSubC([
      antiqua(`Where the Purchaser is granted possession of the Apartment by the Vendor after the Defects Liability Period, the Purchaser shall be afforded a period of ${inspectDays} (${numberInWords(inspectDays)}) days from the time of handover to carry out an inspection of the Apartment with the Vendor so as to agree on any reasonable repairs required (if any) as a result of occupation by any tenant, save for ordinary wear and tear.`),
    ]));
  }
  children.push(makSubC([
    antiqua(`The Purchaser shall use the Apartment for the purposes of a private residence and for no other purpose whatsoever, subject to the conditions set in the By-Laws.`),
  ]));
  children.push(makSubC([
    antiqua('The sale of the Apartment shall be completed at the offices of the Vendor’s Advocates on the Sale Completion Date. On the Sale Completion Date, the Vendor shall issue an instrument of transfer (the "Transfer") to the Purchaser in a form drawn by the Vendor’s Advocates, and the Purchaser shall execute the Transfer and return it to the Vendor’s Advocates together with: (a) a copy of the National Identity Card or valid Passport (or Certificate of Incorporation) of the Purchaser; (b) a copy of a current dated CR12 company search of the Purchaser (if applicable); (c) a copy of the tax PIN Certificate of the Purchaser; and (d) three (3) coloured passport photos of the Purchaser or its Directors (as applicable).'),
  ]));
  children.push(makSubC([
    antiqua('The Vendor shall be responsible for the registration of the Sectional Plan and shall (a) procure a duly licensed surveyor to geo-reference and prepare the Sectional Plan; (b) apply for registration of the Sectional Plan; and (c) apply for registration of the Corporation, in accordance with the Sectional Properties Laws.'),
  ]));
  children.push(makSubC([
    antiqua(`Upon registration, the Vendor’s Advocates shall release to the Purchaser the original Sectional Title, the stamped and registered Transfer, the KRA payment e-slip in respect of stamp duty, a certified copy of the Valuation for Stamp Duty Form, the Practical Completion Certificate, the certificate of registration of the Corporation, the registered By-Laws, the NCA license, the Occupational Certificate, the duly registered Sectional Plan, and the license from the National Environmental Management Authority for the Development.`),
  ]));
  children.push(makSubC([
    antiqua(`Upon grant of possession, the Purchaser shall have the option of engaging ${tsavo.property_manager?.name || 'TSAVO LIFESTYLE LIMITED'} (the "Property Manager") for the purposes of managing the Apartment on the Purchaser’s behalf, subject to the Purchaser and the Property Manager entering into a property management agreement.`),
  ]));
  children.push(spacer());

  // ── 6. TERMINATION ────────────────────────────────────────────────────────
  children.push(makClauseH('TERMINATION OF AGREEMENT'));
  children.push(spacer());
  const negPeriodApplies = !(project.short_label === 'Tsavo Rising');
  if (negPeriodApplies) {
    children.push(makSubC([
      antiqua('Upon the occurrence of a breach of this Agreement, an injured party shall, prior to exercising their rights against a defaulting party, first attempt to address and resolve the breach with the defaulting party through good-faith negotiations for a period of thirty (30) days (the "Negotiation Period"). If the breach is unable to be resolved within the Negotiation Period, the injured party shall, upon expiry of the Negotiation Period, be entitled to exercise their rights under this section.'),
    ]));
  } else {
    children.push(makSubC([
      antiqua('Upon the occurrence of a breach of this Agreement (which is not a breach of a payment obligation in respect of the Purchase Price by the Purchaser), an injured party shall, prior to exercising their rights against a defaulting party, first attempt to address and resolve the breach through good-faith negotiations for a period of thirty (30) days (the "Negotiation Period"). For the avoidance of doubt, the Negotiation Period does not apply to a Purchaser default in payment of the Purchase Price.'),
    ]));
  }
  children.push(makSubC([
    antiqua('If the Purchaser fails to comply with its obligations, the Vendor may give the Purchaser written notice to comply (the "Vendor’s Default Notice") requiring the Purchaser to make good the default within thirty (30) days, time being of the essence. On failure to comply with the Vendor’s Default Notice, the Vendor may, without prejudice to its other rights or remedies, terminate this Agreement by thirty (30) days’ written notice to the Purchaser (the "Vendor’s Termination Notice"). Upon expiry of the Vendor’s Termination Notice the Vendor shall, within ninety (90) days of expiry, refund the amount paid on account of the Purchase Price subject to deduction of all pending legal costs, and thereafter this Agreement shall stand terminated.'),
  ]));
  children.push(makSubC([
    antiqua('Prior to termination of this Agreement, the Purchaser may identify other persons to purchase the Apartment on terms and conditions similar to this Agreement. If such new purchaser enters into an agreement with the Vendor for the purchase of the Apartment at a price higher than the Purchase Price, the profit earned on the sale shall be paid to the Purchaser within thirty (30) days of completion of the sale to the new purchaser.'),
  ]));
  children.push(spacer());

  // ── 7. FORCE MAJEURE ──────────────────────────────────────────────────────
  children.push(makClauseH('FORCE MAJEURE'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('Neither party will be liable for any delay or failure in performance in consequence of any act, cause or event which was not within its control, was not caused or precipitated by its negligence, and could not have been prevented by reasonable diligence, including without limitation: any Act of God, war or hostilities, sabotage, riots, civil disobedience, rebellion, judicial actions, strikes, government actions or inactions, acts of terror, changes in law affecting property construction and developments, storms, floods, earthquakes, subsidence, epidemics, pandemics, or other natural disasters, fire, accident, explosion or shortage of labour, or any event analogous to the foregoing (a "Force Majeure Event").'),
  ]));
  children.push(makSubC([
    antiqua('The affected party shall promptly notify the other when such circumstances cause a delay or failure in performance. If circumstances continue for more than six (6) months after notification, either party may terminate this Agreement, but without prejudice to any accrued rights and subject to this Agreement. Payment obligations of the Purchaser cannot be avoided by claiming Force Majeure unless evidence is provided that the Force Majeure Event directly and adversely affects the Purchaser’s ability to pay.'),
  ]));
  children.push(spacer());

  // ── 8. WARRANTIES ─────────────────────────────────────────────────────────
  children.push(makClauseH('WARRANTIES'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('The Vendor warrants to the Purchaser that: (a) the Vendor is the registered legal and beneficial owner of the Land and holds a clear and valid title to the Land; (b) the Vendor has the requisite power and authority to enter into and perform this Agreement; and (c) so far as the Vendor is aware, the Land is not in a buffer zone, road or forest reserve, riparian reserve, community land or public land.'),
  ]));
  children.push(makSubC([
    antiqua('The Vendor shall disclose in writing to the Purchaser any event or circumstance which may arise or become known to it after the date of this Agreement and prior to the Sale Completion Date which is inconsistent with any of the Warranties.'),
  ]));
  children.push(spacer());

  // ── 9. LSK CONDITIONS (conditional) ───────────────────────────────────────
  if (incorpLSK) {
    children.push(makClauseH('THE LAW SOCIETY CONDITIONS FOR SALE (2015)'));
    children.push(spacer());
    children.push(bodyPara([
      antiqua('The Law Society of Kenya Conditions of Sale (2015) will apply to this Agreement and shall be deemed incorporated herein in extensor, save in so far as the LSK Conditions are not inconsistent with the provisions of this Agreement or are varied or excluded by the terms of this Agreement.'),
    ]));
    children.push(spacer());
  }

  // ── 10. NOTICES ───────────────────────────────────────────────────────────
  children.push(makClauseH('NOTICES AND COMMUNICATION'));
  children.push(spacer());
  children.push(makSubC([
    antiqua(`Any notice given under this Agreement shall be in writing by letter or email as follows. In the case of the Vendor: ${vendor.notice_address}, Email: ${vendor.notice_email}. In the case of the Purchaser: to the address whose particulars are set out in Section I of the Schedule of Particulars. The details of the Alternative Contact of the Purchaser are set out in Section VII of the Schedule of Particulars and are solely for communication purposes (no contractual obligation on the Alternative Contact).`),
  ]));
  children.push(makSubC([
    antiqua('Any notice sent by post shall be deemed effective five (5) Business Days after posting upon proof of correct addressing; any notice sent by email shall be deemed effective two (2) Business Days after emailing upon proof of successful delivery.'),
  ]));
  children.push(spacer());

  // ── 11. EXECUTORY AGREEMENT ───────────────────────────────────────────────
  children.push(makClauseH('EXECUTORY AGREEMENT'));
  children.push(spacer());
  children.push(bodyPara([antiqua('This Agreement is an executory agreement only and shall not operate or be deemed to operate as a lease of the Apartment.')]));
  children.push(spacer());

  // ── 12. COVID AV (conditional) ────────────────────────────────────────────
  if (incCovid) {
    children.push(makClauseH('VERIFICATION OF EXECUTION VIA LIVE AUDIO-VISUAL LINK'));
    children.push(spacer());
    children.push(bodyPara([
      antiqua('It is hereby agreed that for such period of time as the prevailing worldwide pandemic known as "Covid-19" or "Coronavirus" shall serve to restrict or limit the physical witnessing and verification of execution of this Agreement before a licensed Advocate, Judge, Magistrate, Commissioner for Oaths, Notary Public, Kenya Consular Officer or other authorized person specified under the Land Registration Act (an "Authorized Person"), the execution of this Agreement by any party may, without prejudice to the performance of the contractual rights and obligations of the parties, be verified by an Authorized Person during a live audio-visual link.'),
    ]));
    children.push(spacer());
  }

  // ── 13. CHANGES IN LAW ────────────────────────────────────────────────────
  children.push(makClauseH('CHANGES IN LAW OR CIRCUMSTANCES'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('The Purchaser acknowledges, confirms and agrees that the sale of the Apartment is subject always to any applicable changes in law or circumstances (including the Sectional Properties Act, if applicable) that may affect the form of title to be issued for the Apartment and/or the provisions, rights and obligations of the respective parties under this Agreement. If required, the Purchaser will execute such additional agreements and/or variations to this Agreement and pay such additional legal fees and/or costs as may be necessary to give effect to such changes.'),
  ]));
  children.push(spacer());

  // ── 14. DISPUTE RESOLUTION (variant) ──────────────────────────────────────
  children.push(makClauseH('DISPUTE RESOLUTION'));
  children.push(spacer());
  if (dispute.type === 'arbitration_ciarb_kenya') {
    children.push(makSubC([
      antiqua('Any dispute, controversy or claim arising out of or relating to this Agreement (including its interpretation, application or termination) shall be resolved by way of consultation held in good faith between the parties. Such consultation shall begin immediately after one party has delivered to the other a written request for such consultation. If within thirty (30) Business Days following the date of such request the dispute cannot be resolved amicably, the dispute shall be referred to arbitration.'),
    ]));
    children.push(makSubC([
      antiqua(`The dispute shall be referred to arbitration by a single arbitrator to be appointed by the parties or, failing agreement within thirty (30) days, by the Chairman for the time being of the Chartered Institute of Arbitrators, Kenya Branch. The arbitration shall take place in Nairobi and the language of arbitration shall be English. The arbitration shall be conducted in accordance with the Arbitration Act, 1995. The decision of the arbitrator shall be final and binding on the parties and may be made an order of a court of competent jurisdiction.`),
    ]));
  } else {
    children.push(makSubC([
      antiqua(`Any dispute, controversy or claim arising out of or relating to this Agreement shall be resolved by way of consultation held in good faith between the parties. Such consultation shall begin immediately after one party has delivered to the other a written request for such consultation. If within thirty (30) Business Days the dispute cannot be resolved amicably, the dispute shall be submitted to a two-tier dispute resolution mechanism: (a) the parties shall first refer the dispute to mediation at the Nairobi Centre for International Arbitration (NCIA) in accordance with the NCIA Mediation Rules; and (b) should mediation fail to resolve the dispute, either party may refer the dispute to a Kenyan court of competent jurisdiction for hearing and determination.`),
    ]));
  }
  children.push(spacer());

  // ── 15. AML ───────────────────────────────────────────────────────────────
  children.push(makClauseH('ANTI-MONEY LAUNDERING'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('The Purchaser confirms that the monies utilised to pay the Purchase Price for the Apartment and any other sums due under this Agreement are not and shall not be from the proceeds of crime. Failure by the Purchaser to adhere to this clause shall be treated as a material breach and, if required by any Competent Authority, shall entitle the Vendor to terminate this Agreement forthwith and confiscate all monies paid by the Purchaser, submitting them to the relevant Competent Authority as required by law.'),
  ]));
  children.push(makSubC([
    antiqua('The Purchaser warrants that all monies paid to the Vendor or the Vendor’s Advocates do not contravene the Proceeds of Crime and Anti-Money Laundering Act, 2009 or the Proceeds of Crime and Anti-Money Laundering (Amendment) Act, 2021 or any other law in Kenya, and indemnifies the Vendor and the Vendor’s Advocates against any claim or action arising out of a breach by the Purchaser of those laws.'),
  ]));
  children.push(spacer());

  // ── 16. DATA PROTECTION ───────────────────────────────────────────────────
  children.push(makClauseH('DATA PROTECTION'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('The Vendor confirms that all personal data given to the Vendor by the Purchaser and the Purchaser’s Alternative Contact under this Agreement shall be used in accordance with the Data Protection Laws.'),
  ]));
  children.push(makSubC([
    antiqua('By signing this Agreement, the Purchaser consents to their personal data being collected and processed for the purposes of execution, performance and completion of this Agreement.'),
  ]));
  children.push(spacer());

  // ── 17. GENERAL PROVISIONS ────────────────────────────────────────────────
  children.push(makClauseH('GENERAL PROVISIONS'));
  children.push(spacer());
  children.push(makSubC([
    antiqua('This Agreement is personal to the Purchaser and the Purchaser shall not be entitled to vary, assign, or novate this Agreement without the written consent of the Vendor.'),
  ]));
  if (hasResaleFee) {
    children.push(makSubC([
      antiqua(`The Purchaser shall pay a fee of ${project.resale_admin_fee_percent}% (${numberInWords(project.resale_admin_fee_percent)} per cent) of the Purchase Price payable by the new Purchaser to the Vendor in respect of any approved resale of the Apartment.`),
    ]));
  }
  children.push(makSubC([
    antiqua('No immaterial error or omission in this Agreement or in any Plan of the Development or in any statement made prior to this Agreement shall affect the obligations of the parties or entitle the Purchaser to damages or compensation.'),
  ]));
  children.push(makSubC([
    antiqua('Time shall be of the essence in this Agreement save as otherwise provided.'),
  ]));
  children.push(makSubC([
    antiqua('This Agreement constitutes the entire agreement between the parties and supersedes any prior agreements, undertakings, representations or warranties relating to the sale and purchase of the Apartment.'),
  ]));
  children.push(makSubC([
    antiqua('If any provision is found invalid, illegal or unenforceable, the validity, legality and enforceability of the remaining provisions shall not be affected.'),
  ]));
  children.push(makSubC([
    antiqua('This Agreement may be executed in several counterparts, each of which will be deemed to be an original, but all of which, taken together, will constitute one and the same Agreement.'),
  ]));
  children.push(makSubC([
    antiqua('This Agreement shall be governed by and construed in accordance with the laws of Kenya.'),
  ]));
  children.push(spacer());

  children.push(bodyPara([
    antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties hereto as of the day and year first before written.', { bold: true }),
  ]));
  children.push(spacer());
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));
  } // end legacy body else-branch

  // ── SCHEDULE OF PARTICULARS ───────────────────────────────────────────────
  children.push(centeredPara([antiqua('SCHEDULE OF PARTICULARS', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(spacer());

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorder = {
    top:    { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    left:   { style: BorderStyle.SINGLE, size: 4, color: '999999' },
    right:  { style: BorderStyle.SINGLE, size: 4, color: '999999' },
  };
  const schedCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({ children: [antiqua(text, { bold })], spacing: { before: 80, after: 80 }, indent: { left: 80 } })],
    borders: cellBorder,
    width: { size: 30, type: WidthType.PERCENTAGE },
  });
  const schedValCell = (lines) => new TableCell({
    children: (Array.isArray(lines) ? lines : [lines]).map(line => new Paragraph({ children: [antiqua(line || '')], spacing: { before: 80, after: 80 }, indent: { left: 80 } })),
    borders: cellBorder,
    width: { size: 70, type: WidthType.PERCENTAGE },
  });
  const schedRow = (label, value) => new TableRow({ children: [schedCell(label, true), schedValCell(value)] });

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      schedRow('I. The Purchaser', [
        `Name: ${purchaserName}`,
        `ID Number: ${purchaserId}`,
        `Email: ${purchaserEmail}`,
        `Mobile Number: ${purchaserPhone}`,
      ]),
      schedRow('II. The Apartment', `All that Apartment Number ${aptNumber} ${isSigningAnchor ? 'situated' : 'to be situated'} on the ${aptFloor} floor of the Development.`),
      schedRow('III. Purchase Price', `Kenya Shillings ${priceWords} (Kshs. ${priceFigures}/=) Only.`),
      schedRow('IV. Development', `The Vendor’s development known as "${development.name}" which consists of residential apartments together with a common entrance, communal areas, common car parking spaces, pathways, driveways, and other amenities, constructed and maintained on the Land and identified in the Building Plans and the Architectural Drawings.`),
      schedRow('V. Payment Plan', [
        `An initial deposit of Kenya Shillings ${depositWords} (Kshs. ${depositFigures}/=) Only (the "Deposit") has been paid by the Purchaser to the Vendor (receipt whereof is confirmed by the Vendor); and`,
        `The balance of the Purchase Price of Kenya Shillings ${balanceWords} (Kshs. ${balanceFigures}/=) Only (the "Balance") shall be paid by the Purchaser to the Vendor in ${installments} monthly instalments of Kenya Shillings ${monthlyAmount}/= Only on or before the ${d.instalment_day || 'fifth (5th)'} day of every calendar month from ${startMonth}.`,
      ]),
      schedRow('VI. Utility and Sectional Plan Costs', [
        `Water meter installation: Kshs. ${formatKes(payments.stage_2.water_meter_kes)}/=`,
        ...(includesElec ? [`Electricity meter installation: Kshs. ${formatKes(payments.stage_2.electricity_meter_kes)}/=`] : []),
        `Service Charge deposit: Kshs. ${formatKes(payments.stage_2.service_charge_deposit_kes || payments.stage_2.service_charge_initial_six_months_kes)}/=`,
        `Sectional Plan / georeferencing costs: Kshs. ${formatKes(payments.stage_2.georeferencing_kes)}/=`,
      ]),
      schedRow('VII. Alternative Contact', [
        `Name: ${d.alt_contact_name || ''}`,
        `Email: ${d.alt_contact_email || ''}`,
        `Mobile Number: ${d.alt_contact_phone || ''}`,
      ]),
    ]
  }));
  children.push(spacer());
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── SCHEDULE OF LEGAL COSTS ───────────────────────────────────────────────
  const costsHeading = (project.short_label === 'Tsavo Skywalk')
    ? 'SCHEDULE OF THE PURCHASER’S ADDITIONAL COSTS'
    : 'SCHEDULE OF LEGAL COSTS';
  children.push(centeredPara([antiqua(costsHeading, { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(spacer());

  // Intro: the three-stage payment overview (Ann's verbatim text from RS3,
  // with Stage 2 meter mention adapted to projects that bundle electricity).
  const hasElectricityMeter = payments.stage_2 && payments.stage_2.electricity_meter_kes != null;
  const stage2Meters = hasElectricityMeter ? 'water and electricity meters' : 'water meters';
  children.push(bodyPara([antiqua('The legal fees and costs shall be payable by the Purchaser in three (3) stages as follows:')]));
  children.push(bodyPara([
    antiqua('Stage 1 costs:', { bold: true }),
    antiqua(' The legal fees, office disbursements and proportionate cost of registering the Sectional Plan and the Corporation payable at the time of execution of this Agreement;'),
  ]));
  children.push(bodyPara([
    antiqua('Stage 2 costs:', { bold: true }),
    antiqua(` The service charge deposit, costs of installation of ${stage2Meters} as well as the Geo Referencing costs are payable within thirty (30) days of completion of payment of the Purchase Price; and`),
  ]));
  children.push(bodyPara([
    antiqua('Stage 3 costs:', { bold: true }),
    antiqua(' The proportionate costs of registering the Sectional Plan, Stamp Duty, office disbursements, valuation and registration costs payable on the Sale Completion Date. '),
    antiqua('NB:', { bold: true }),
    antiqua(' Stamp Duty payable shall be subject to a market valuation of the Apartment by the Government Valuer prior to the transfer of the Sectional Title(s) from the Vendor to the Purchaser.'),
  ]));
  children.push(spacer());

  const costRow = (item, cost) => new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [antiqua(item)], indent: { left: 80 }, spacing: { before: 40, after: 40 } })],
        borders: cellBorder,
        width: { size: 70, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ children: [antiqua(cost)], indent: { left: 80 }, spacing: { before: 40, after: 40 } })],
        borders: cellBorder,
        width: { size: 30, type: WidthType.PERCENTAGE },
      }),
    ],
  });

  const costRows = [];
  costRows.push(costRow('ITEM', 'COST (KES)'));
  const s1 = payments.stage_1 || {};
  if (s1.legal_fees_kes)              costRows.push(costRow('Legal Fees (Stage 1)', formatKes(s1.legal_fees_kes)));
  if (s1.office_disbursements_kes)    costRows.push(costRow('Office Disbursements (Stage 1)', formatKes(s1.office_disbursements_kes)));
  if (s1.vat_kes)                     costRows.push(costRow('VAT 16% on legal fees (subject to change in law) (Stage 1)', formatKes(s1.vat_kes)));
  if (s1.proportionate_management_company_incorporation_kes)
                                       costRows.push(costRow('Proportionate cost of incorporation of the Management Company (Stage 1)', formatKes(s1.proportionate_management_company_incorporation_kes)));
  if (s1.share_acquisition_kes)       costRows.push(costRow('Acquisition of one share in a member of the Management Company (Stage 1)', formatKes(s1.share_acquisition_kes)));
  if (s1.proportionate_land_transfer_kes)
                                       costRows.push(costRow('Proportionate cost of transfer of land from the Vendor to the Management Company (Stage 1)', formatKes(s1.proportionate_land_transfer_kes)));
  if (s1.proportionate_corp_and_sectional_plan_registration_kes)
                                       costRows.push(costRow('Proportionate cost of registering the Corporation and the Sectional Plan (Stage 1)', formatKes(s1.proportionate_corp_and_sectional_plan_registration_kes)));
  const s2 = payments.stage_2 || {};
  if (s2.water_meter_kes != null)     costRows.push(costRow('Cost of installation of water meters (Stage 2)', formatKes(s2.water_meter_kes)));
  if (s2.electricity_meter_kes != null) costRows.push(costRow('Cost of installation of electricity meters (Stage 2)', formatKes(s2.electricity_meter_kes)));
  const scKey = s2.service_charge_deposit_kes != null ? s2.service_charge_deposit_kes : s2.service_charge_initial_six_months_kes;
  if (scKey != null)                  costRows.push(costRow('Service Charge Deposit (Stage 2)', formatKes(scKey)));
  if (s2.georeferencing_kes != null)  costRows.push(costRow('Georeferencing Costs (Stage 2)', formatKes(s2.georeferencing_kes)));
  const s3 = payments.stage_3 || {};
  costRows.push(costRow('Stamp Duty at 4% of the Purchase Price (subject to open market valuation by Government Valuer)', '[*]'));
  if (s3.banking_charges_and_kra_eslip_kes != null) costRows.push(costRow('Banking Charges and KRA e-slip (Stage 3)', formatKes(s3.banking_charges_and_kra_eslip_kes)));
  if (s3.office_disbursements_kes != null)          costRows.push(costRow('Office Disbursements (Stage 3)', formatKes(s3.office_disbursements_kes)));
  if (s3.valuation_for_stamp_kes != null)           costRows.push(costRow('Valuation for Stamp Duty (Stage 3)', formatKes(s3.valuation_for_stamp_kes)));
  if (s3.land_rent_and_rates_clearance_kes != null) costRows.push(costRow('Land Rent & Rates Clearance (Stage 3)', formatKes(s3.land_rent_and_rates_clearance_kes)));
  if (s3.commissioner_of_lands_consent_kes != null) costRows.push(costRow('Commissioner of Lands Consent (Stage 3)', formatKes(s3.commissioner_of_lands_consent_kes)));
  if (s3.registration_fees_kes != null)             costRows.push(costRow('Registration Fees (Stage 3)', formatKes(s3.registration_fees_kes)));
  if (s3.valuation_and_registration_estimate_kes != null) costRows.push(costRow('Estimate of Government valuation and registration costs (Stage 3)', formatKes(s3.valuation_and_registration_estimate_kes)));
  if (s3.registration_and_incidental_fees_kes != null) costRows.push(costRow('Registration and incidental fees (Stage 3)', formatKes(s3.registration_and_incidental_fees_kes)));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: costRows,
  }));
  children.push(spacer());

  // Vendor's Advocates account block
  children.push(bodyPara([antiqua('All payments to the Vendor’s Advocates shall be made by cheque, cash deposit or bank transfer to the following account or M-PESA Paybill:', { bold: true })]));
  children.push(spacer());
  const va = payments.vendor_advocates_bank || {};
  [
    `Account Name: ${va.account_name || ''}`,
    `Bank: ${va.bank_name || ''}`,
    va.branch ? `Branch: ${va.branch}` : null,
    `Account Number: ${va.account_number || va.kes_account_number || ''}`,
    va.swift_code ? `SWIFT Code: ${va.swift_code}` : null,
    va.paybill_number ? `M-PESA Paybill: ${va.paybill_number}` : null,
    va.paybill_account ? `M-PESA Account: ${va.paybill_account}` : null,
  ].filter(Boolean).forEach(line => children.push(definitionPara([antiqua(line)])));
  children.push(spacer());
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── EXECUTION BLOCK ───────────────────────────────────────────────────────
  children.push(centeredPara([antiqua('EXECUTION OF AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(spacer());
  children.push(bodyPara([antiqua('THE VENDOR:', { bold: true })]));
  if (isPoA) {
    children.push(bodyPara([antiqua(`${vendor.company_name}`, { bold: true })]));
    children.push(bodyPara([antiqua('SIGNED by the duly authorized and constituted Attorney of the Vendor under and by virtue of a Power of Attorney registered at the Registry of Documents at Nairobi as Number ______________________ in the presence of:')]));
  } else {
    children.push(bodyPara([antiqua(`SEALED with the Common Seal of ${vendor.company_name}`, { bold: true })]));
    children.push(bodyPara([antiqua('in the presence of:')]));
  }
  children.push(spacer());
  children.push(bodyPara([antiqua('Signature: __________________________')]));
  children.push(bodyPara([antiqua('Date: ______________________________')]));
  children.push(bodyPara([antiqua('Name: ______________________________')]));
  children.push(bodyPara([antiqua('ID No.: _____________________________')]));
  children.push(bodyPara([antiqua('PIN No.: ____________________________')]));
  children.push(spacer());
  children.push(bodyPara([antiqua('I CERTIFY that the Vendor’s authorized representative freely and voluntarily executed this Agreement on the date stated hereabove and understood its contents.')]));
  children.push(spacer());
  children.push(bodyPara([antiqua('_____________________________________________')]));
  children.push(bodyPara([antiqua('Signature and designation of the person certifying')]));
  children.push(spacer());
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  children.push(bodyPara([antiqua('THE PURCHASER:', { bold: true })]));
  children.push(bodyPara([antiqua(`SIGNED by ${purchaserName}`)]));
  children.push(bodyPara([antiqua('in the presence of:')]));
  children.push(spacer());
  children.push(bodyPara([antiqua('Signature: __________________________')]));
  children.push(bodyPara([antiqua('Date: ______________________________')]));
  children.push(bodyPara([antiqua('ID No.: _____________________________')]));
  children.push(bodyPara([antiqua('PIN No.: ____________________________')]));
  children.push(spacer());
  children.push(bodyPara([antiqua(`I CERTIFY that the above-named ${purchaserName} freely and voluntarily executed this Agreement on the date stated hereabove and understood its contents.`)]));
  children.push(spacer());
  children.push(bodyPara([antiqua('_____________________________________________')]));
  children.push(bodyPara([antiqua('Signature and designation of the person certifying')]));
  children.push(spacer());
  children.push(bodyPara([antiqua('**When signing this Agreement your signature(s) must be certified by an Authorized Person.')]));
  children.push(spacer());

  // ── Footer "DRAWN AND FILED BY" block (last page) ─────────────────────────
  // MAK source DOCX puts the firm logo PNG centred under "DRAWN BY:" at the
  // end of the document, mirroring the cover page. Address centred below.
  children.push(centeredPara([antiqua('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  if (makLogo) {
    children.push(new Paragraph({
      children: [new ImageRun({ data: makLogo, transformation: { width: 166, height: 69 }, type: 'png' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
    }));
  } else {
    children.push(centeredPara([antiqua(vAdv.firm_name || '', { bold: true })]));
  }
  children.push(centeredPara([antiqua(vAdv.address_line_1 || '')]));
  children.push(centeredPara([antiqua(vAdv.address_line_2 || '')]));
  children.push(centeredPara([antiqua(vAdv.po_box || '')]));
  children.push(centeredPara([antiqua(`E: ${vAdv.email || ''}`)]));
  children.push(centeredPara([antiqua(vAdv.website || '')]));

  return children;
}

// Number-to-words helper for clauses ("Thirty (30)" etc.). Lightweight; covers 1-200.
function numberInWords(n) {
  if (n == null || isNaN(n)) return '[*]';
  const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n % 10 ? '-' + ones[n%10] : '');
  if (n < 200) return 'One Hundred' + (n > 100 ? ' and ' + numberInWords(n-100) : '');
  return String(n);
}

function formatKes(n) {
  if (n == null) return '[*]';
  return new Intl.NumberFormat('en-KE').format(n);
}

// ─── Legacy Developer Sale Agreement builder (pre-registry, kept for backward compat) ──
function buildLegacyDeveloperSaleAgreement() {
  const children = [];

  const cvT  = (text, opts = {}) => new TextRun({ text, font: FONT_BODY, size: 24, color: BLACK, ...opts });
  const cvP  = (runs, align = AlignmentType.CENTER, sp = {}) =>
    new Paragraph({ children: runs, alignment: align, spacing: { before: 0, after: 0, ...sp } });
  const cvGap  = (twips) => new Paragraph({ children: [], spacing: { before: twips, after: 0 } });

  const vendor = d.vendor_name || d.developer_name || '';
  const vendorReg = d.vendor_reg_no || d.developer_reg_no || '';
  const vendorPO  = d.vendor_po_box || '';

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  children.push(cvGap(400));
  children.push(cvP([cvT(vendor, { bold: true, size: 28 })]));
  children.push(cvGap(80));
  children.push(cvP([cvT('(as the Vendor)')]));
  children.push(cvGap(280));
  children.push(cvP([cvT('AND', { bold: true })]));
  children.push(cvGap(280));
  children.push(cvP([cvT(d.purchaser_name || '', { bold: true, size: 28 })]));
  children.push(cvGap(80));
  children.push(cvP([cvT('(as the Purchaser)')]));
  children.push(cvGap(400));
  children.push(new Paragraph({
    children: [],
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLACK, space: 1 } },
    spacing: { before: 0, after: 0 },
  }));
  children.push(cvGap(280));
  children.push(cvP([cvT('AGREEMENT FOR SALE', { bold: true })]));
  children.push(cvGap(200));
  children.push(cvP([cvT('relating to', { italics: true })]));
  children.push(cvGap(200));
  children.push(cvP([cvT(d.apartment_description || d.property_lr_no || '', { bold: true })]));
  children.push(cvGap(1800));

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
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── SCHEDULE OF PARTICULARS ────────────────────────────────────────────────
  children.push(centeredPara([antiqua('SCHEDULE OF PARTICULARS', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(spacer());

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cellBorder = { top: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, left: { style: BorderStyle.SINGLE, size: 4, color: '999999' }, right: { style: BorderStyle.SINGLE, size: 4, color: '999999' } };
  const schedCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({ children: [antiqua(text, { bold })], spacing: { before: 80, after: 80 }, indent: { left: 80 } })],
    borders: cellBorder,
    width: { size: 35, type: WidthType.PERCENTAGE },
  });
  const schedValCell = (text) => new TableCell({
    children: [new Paragraph({ children: [antiqua(text)], spacing: { before: 80, after: 80 }, indent: { left: 80 } })],
    borders: cellBorder,
    width: { size: 65, type: WidthType.PERCENTAGE },
  });
  const schedRow = (label, value) => new TableRow({ children: [schedCell(label, true), schedValCell(value)] });

  const purchaserId = d.purchaser_id || '';
  const purchaserEmail = d.purchaser_email || '';
  const purchaserPhone = d.purchaser_phone || '';

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      schedRow('I. The Purchaser', `Name: ${d.purchaser_name || ''}\nID Number: ${purchaserId}\nEmail: ${purchaserEmail}\nMobile Number: ${purchaserPhone}`),
      schedRow('II. The Apartment / Property', d.apartment_description || d.property_lr_no || ''),
      schedRow('III. Purchase Price', `Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/-) Only`),
      schedRow('IV. Development', d.development_description || ''),
      schedRow('V. Payment Plan', d.payment_plan || `An initial deposit of Kenya Shillings ${d.deposit_words || ''} (Kshs. ${d.deposit_figures || ''}/-) Only; the balance of Kenya Shillings ${d.balance_words || ''} (Kshs. ${d.balance_figures || ''}/-) Only to be paid in full on or before ${d.completion_date || ''}.`),
    ]
  }));
  children.push(spacer());
  children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  // ── BODY ───────────────────────────────────────────────────────────────────
  children.push(centeredPara([antiqua('AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('THIS AGREEMENT is made as of the '),
    antiqua(d.date || '___', { bold: true }),
  ]));
  children.push(spacer());
  children.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  children.push(spacer());
  children.push(bodyPara([
    antiqua(`${vendor}${vendorReg ? ` (Company Registration Number ${vendorReg})` : ''}, of Post Office Box Number ${vendorPO} (the `),
    antiqua('"Vendor"', { bold: true }),
    antiqua('); and'),
  ]));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('The Purchaser, being the person(s) whose particulars are set out in Section I of the Schedule of Particulars (the '),
    antiqua('"Purchaser"', { bold: true }),
    antiqua(').'),
  ]));
  children.push(spacer());
  children.push(bodyPara([antiqua('WHEREAS:', { bold: true })]));
  children.push(spacer());
  children.push(bodyPara([
    antiqua(`The Vendor is the registered proprietor of all that property known as ${d.property_lr_no || ''} situate at ${d.property_location || ''} (the `),
    antiqua('"Land"', { bold: true }), antiqua(').'),
  ]));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('The Vendor has agreed to sell, and the Purchaser has agreed to purchase, the property described in the Schedule of Particulars at the Purchase Price and upon the terms and conditions hereinafter appearing.'),
  ]));
  children.push(spacer());
  children.push(bodyPara([antiqua('NOW IT IS HEREBY AGREED as follows:', { bold: true })]));
  children.push(spacer());

  // ── Key clauses ────────────────────────────────────────────────────────────
  children.push(clauseHeading('1', 'PURCHASE PRICE AND PAYMENT'));
  children.push(spacer());
  children.push(subClause('1.1', [
    antiqua(`The Purchase Price is Kenya Shillings ${d.purchase_price_words || ''} (Kshs. ${d.purchase_price_figures || ''}/-) Only, payable as set out in Section V of the Schedule of Particulars.`),
  ]));
  children.push(subClause('1.2', [
    antiqua('Time shall be of the essence with regard to the payment of the Purchase Price. Failure to make payment on the due date shall entitle the Vendor to terminate this Agreement and forfeit the deposit paid.'),
  ]));
  children.push(spacer());

  children.push(clauseHeading('2', 'COMPLETION'));
  children.push(spacer());
  children.push(subClause('2.1', [
    antiqua(`The Completion Date shall be ${d.completion_date || '___'}, or such other date as the parties may agree in writing.`),
  ]));
  children.push(subClause('2.2', [
    antiqua('On the Completion Date, upon full payment of the Purchase Price, the Vendor shall execute and deliver to the Purchaser all documents necessary to effect registration of the transfer of the Property in the name of the Purchaser.'),
  ]));
  children.push(spacer());

  children.push(clauseHeading('3', 'STAMP DUTY AND COSTS'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('      Stamp duty, registration costs, and any other government levies payable on the transfer of the Property shall be for the account of the Purchaser. Each party shall bear the fees of its own legal advisers.'),
  ]));
  children.push(spacer());

  children.push(clauseHeading('4', 'GOVERNING LAW'));
  children.push(spacer());
  children.push(bodyPara([
    antiqua('      This Agreement shall be governed by and construed in accordance with the laws of the Republic of Kenya.'),
  ]));
  children.push(spacer());

  // ── IN WITNESS ─────────────────────────────────────────────────────────────
  children.push(bodyPara([antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties as of the day and year first above written.')]));
  children.push(spacer());
  children.push(spacer());

  // Vendor execution (company)
  children.push(bodyPara([antiqua(`SIGNED for and on behalf of ${vendor.toUpperCase()}`, { bold: true })]));
  children.push(spacer());
  children.push(bodyPara([antiqua('Director / Authorized Signatory: ___________________________')]));
  children.push(bodyPara([antiqua('Name: ___________________________')]));
  children.push(bodyPara([antiqua('Date: ___________________________')]));
  children.push(spacer());

  // Purchaser execution (individual)
  children.push(buildExecutionBlock(d.purchaser_name, 'Purchaser'));

  return children;
}

function buildDocumentChildren() {
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
    case 'developer_sale_agreement':
      return buildDeveloperSaleAgreement();
    default: {
      // Try schema-driven generic LRA form
      const schemaPath = path.join(__dirname, 'form-schemas', d.doc_type + '.json');
      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
        d._isGenericLraForm = true; // trained registry form: use the clean page-number footer, not the firm letterhead
        return buildGenericLRAForm(schema);
      }
      console.error(`Unknown doc_type: ${d.doc_type}`);
      process.exit(1);
    }
  }
}

// ─── Assemble and write document ──────────────────────────────────────────────
const rawChildren = buildDocumentChildren();

// Flatten — buildExecutionBlock returns arrays of items
const flatChildren = rawChildren.flat(Infinity);

// MAK cover-page page border (firstPage only, asymmetric thick-thin/thin-thick).
// Applied only when project_slug is present AND the project's cover_page_border flag is true.
// docx-js shape: page.borders contains pageBorders (display/offsetFrom) + per-edge.
let pageBordersConfig = undefined;
if (d.doc_type === 'developer_sale_agreement' && d.project_slug) {
  const projectForBorder = loadDeveloperProject(d.project_slug);
  if (projectForBorder && projectForBorder.cover_page_border === true) {
    pageBordersConfig = {
      pageBorders: { display: 'allPages', offsetFrom: 'page' },
      pageBorderTop:    { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 12, space: 24, color: 'auto' },
      pageBorderLeft:   { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 12, space: 24, color: 'auto' },
      pageBorderBottom: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, space: 24, color: 'auto' },
      pageBorderRight:  { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, space: 24, color: 'auto' },
    };
  }
}

// ─── MAK developer-sale-agreement numbering (Word auto-numbering) ───────────
// Three schemes that coexist in the document:
//   - mak-main-clauses: 1. / 1.1 / 1.1.1 — top-level + 2 sub-levels, restart per parent
//   - mak-recitals:     (A) (B) (C) (D) — single level UPPER_LETTER in parens
//   - mak-parties:      (1) (2)         — single level DECIMAL in parens for BETWEEN block
// Activated only when at least one Paragraph references one. Safe to always include.
const makNumberingConfig = {
  config: [
    {
      reference: 'mak-main-clauses',
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.START,
          style: {
            run: { font: 'Tw Cen MT', size: 24, bold: true, color: BLACK },
            paragraph: { indent: { left: 720, hanging: 720 } },
          },
        },
        {
          level: 1,
          format: LevelFormat.DECIMAL,
          text: '%1.%2',
          alignment: AlignmentType.START,
          isLegalNumberingStyle: true,
          style: {
            run: { font: 'Tw Cen MT', size: 24, color: BLACK },
            paragraph: { indent: { left: 1080, hanging: 720 } },
          },
        },
        {
          level: 2,
          format: LevelFormat.DECIMAL,
          text: '%1.%2.%3',
          alignment: AlignmentType.START,
          isLegalNumberingStyle: true,
          style: {
            run: { font: 'Tw Cen MT', size: 24, color: BLACK },
            paragraph: { indent: { left: 1440, hanging: 720 } },
          },
        },
      ],
    },
    {
      reference: 'mak-recitals',
      levels: [
        {
          level: 0,
          format: LevelFormat.UPPER_LETTER,
          text: '(%1)',
          alignment: AlignmentType.START,
          style: {
            run: { font: 'Tw Cen MT', size: 24, color: BLACK },
            paragraph: { indent: { left: 720, hanging: 720 } },
          },
        },
      ],
    },
    {
      reference: 'mak-parties',
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '(%1)',
          alignment: AlignmentType.START,
          style: {
            run: { font: 'Tw Cen MT', size: 24, color: BLACK },
            paragraph: { indent: { left: 720, hanging: 720 } },
          },
        },
      ],
    },
  ],
};

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Book Antiqua', size: 24, color: BLACK },
        paragraph: { spacing: { after: 0, line: 240 } }
      }
    }
  },
  numbering: makNumberingConfig,
  sections: [
    {
      properties: {
        page: {
          size: { width: A4_W, height: A4_H },
          margin: {
            top: MARGIN_TOP,
            right: MARGIN_SIDE,
            bottom: MARGIN_BOTTOM,
            left: MARGIN_SIDE
          },
          ...(pageBordersConfig ? { borders: pageBordersConfig } : {}),
        }
      },
      ...(!['sale_agreement', 'developer_sale_agreement'].includes(d.doc_type) && {
        footers: { default: (LRA_TYPES.includes(d.doc_type) || d._isGenericLraForm) ? buildPageNumberFooter() : buildLetterheadFooter() },
      }),
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
