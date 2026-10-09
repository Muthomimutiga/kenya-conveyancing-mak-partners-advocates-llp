// MAK & Partners Advocates LLP: cover sheet for registry instruments, a firm extension.
//
// The shared generator calls this before an LRA 33, 63, 58 or 84 and places what it returns on
// a page of its own, with no page number (see the template README, "Firm extensions").
// "cover_page": false in the data file skips it.
//
// Ported from the MAK build (commit 04d3fba, 7 Sep 2026, buildLraCoverPage), whose layout was
// taken from the TSAVO RISING TRANSFER FORM TEMPLATE MAK supplied: a plain, centred title sheet
// in Maiandra GD 12pt, transferor AND transferee, a rule, the instrument and the property, a
// second rule, then DRAWN BY: with the MAK logo and the firm's address block.
//
// Two changes from the MAK build, both corrections:
//   - an LRA 58 names the chargee and the chargor in the cover's party slots, and now labels them
//     "(as Chargee)" and "(as Chargor)" instead of "(as Transferor)" and "(as Transferee)";
//   - "(Sectional Title)" under TRANSFER is still the default, because MAK's precedents are
//     sectional, but a matter that is not can pass "cover_subtitle" (or false to omit it).
'use strict';
const fs = require('fs');
const path = require('path');

const FONT = 'Maiandra GD';
const BLACK = '1A1A1A';

// The firm's address block exactly as it sits under the logo on MAK's own cover sheet.
const DRAWN_BY_LINES = [
  '4th Floor, Victoria at Two Rivers,',
  'Two Rivers Development, Limuru Road,',
  'P.O Box 10644 - 00100, Nairobi, Kenya',
];

module.exports = function registryCover(ctx) {
  const { d, docType, firmConfig, assetsDir } = ctx;
  const { Paragraph, TextRun, ImageRun, AlignmentType, BorderStyle, UnderlineType, LineRuleType } = ctx.docx;

  const names = (list) => (Array.isArray(list) ? list : []).map(p => (p && (p.company_name || p.name)) || '').filter(Boolean).join(', ');
  let opts;
  switch (docType) {
    case 'lra_33':
    case 'lra_63':
      opts = {
        transferor: d.vendor_name || names(d.transferors),
        transferee: d.purchaser_name || names(d.transferees),
        title: 'TRANSFER',
        subtitle: d.cover_subtitle === undefined ? '(Sectional Title)' : d.cover_subtitle,
      };
      break;
    case 'lra_58': {
      const chargees = d.chargees || [{ company_name: d.chargee_name || '' }];
      const chargors = d.chargors || [{ name: d.chargor_name || '' }];
      opts = {
        transferor: names(chargees), transferorRole: '(as Chargee)',
        transferee: names(chargors), transfereeRole: '(as Chargor)',
        title: 'DISCHARGE OF CHARGE', subtitle: d.cover_subtitle || false,
      };
      break;
    }
    case 'lra_84':
      opts = { transferor: '', title: 'APPLICATION FOR OFFICIAL SEARCH', subtitle: false };
      break;
    default:
      return null; // library forms carry no cover; MAK's build put one on these four only
  }

  const titleNo = d.title_no || d.title_number || d.property_lr_no || '';
  const text = (value, extra = {}) => new TextRun({ text: String(value == null ? '' : value), font: FONT, size: 24, color: BLACK, ...extra });
  const para = (runs, extra = {}) => new Paragraph({
    children: Array.isArray(runs) ? runs : [text(runs)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO },
    ...extra,
  });
  const gap = (after) => new Paragraph({ children: [], spacing: { before: 0, after } });
  const rule = () => new Paragraph({ children: [], spacing: { before: 80, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLACK, space: 1 } } });

  const propertyDescription = d.cover_property_description || [
    `All that Property known as ${d.apartment_number ? `Apartment Number ${d.apartment_number} ` : ''}Title Number ${titleNo}`,
    d.property_location ? `situated at ${d.property_location}` : '',
  ].filter(Boolean).join(', ');
  const lines = Array.isArray(d.cover_property_description_lines) && d.cover_property_description_lines.length
    ? d.cover_property_description_lines : [propertyDescription];
  const logoPath = path.join(assetsDir, 'sale-agreement-logo.png');
  const logo = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

  const items = [gap(80)];
  if (opts.transferor) {
    items.push(para([text(opts.transferor, { bold: true })]));
    items.push(gap(520));
    items.push(para([text(opts.transferorRole || '(as Transferor)', { bold: true })]));
    items.push(gap(520));
    items.push(para([text('AND', { bold: true })]));
    items.push(gap(520));
    items.push(para([text(opts.transferee, { bold: true })]));
    items.push(gap(520));
    items.push(para([text(opts.transfereeRole || '(as Transferee)', { bold: true })]));
    items.push(gap(260));
  }
  items.push(rule());
  items.push(gap(80));
  items.push(para([text(d.cover_title || opts.title, { bold: true })]));
  if (opts.subtitle) items.push(para([text(opts.subtitle, { bold: true })]));
  items.push(para([text('in respect of', { bold: true })]));
  items.push(gap(80));
  lines.forEach(line => items.push(para([text(line, { bold: true })])));
  items.push(gap(80));
  items.push(rule());
  items.push(gap(180));
  items.push(para([text('DRAWN BY:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  items.push(gap(80));
  if (logo) items.push(new Paragraph({
    children: [new ImageRun({ data: logo, transformation: { width: 166, height: 69 }, type: 'png' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
  }));
  [...DRAWN_BY_LINES, `E: ${firmConfig.firm_email}`, firmConfig.firm_website || '']
    .filter(Boolean)
    .forEach(line => items.push(para([text(line, { bold: true })])));
  return items;
};
