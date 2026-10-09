// firm-letter.js: the firm letter page, shared by every Category A document.
// Nothing here is drawn from one firm's stationery. The header is anchored edge to edge at the top
// of page one, behind the text; the footer is anchored edge to edge at the bottom of every page;
// both boxes are computed from the installed artwork's own pixel size, so a letterhead is never
// stretched. Body text is kept clear of both by the margins, so no renderer can overlap them.
// Identity, fonts and any bespoke artwork placement come from firm-config.json.
const { loadFirmConfig, loadImage } = require('./config');
const {
  Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, UnderlineType, LineRuleType,
  LevelFormat, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType, TabStopType,
} = require('docx');

const cfg = loadFirmConfig();

// Geometry. EMU = 914400 per inch; twips = 1440 per inch; 635 EMU per twip.
const A4_W = 11906, A4_H = 16838;                    // twips
const PAGE_W_EMU = A4_W * 635, PAGE_H_EMU = A4_H * 635;
const HEADER_IMG = loadImage('letterhead-header');
const FOOTER_IMG = loadImage('letterhead-footer');

// A box is {cx, cy, x, y} in EMU, positioned from the page's top-left corner. Default: the image
// spans the page width at its own aspect ratio, the header flush to the top, the footer flush to the
// bottom. A firm whose own Word template places them differently supplies letterhead_geometry.
function box(img, override, role) {
  if (override && override.cx && override.cy) return { cx: override.cx, cy: override.cy, x: override.x || 0, y: override.y || 0 };
  const cx = PAGE_W_EMU;
  const cy = Math.round(cx * img.height / img.width);
  return role === 'header' ? { cx, cy, x: 0, y: 0 } : { cx, cy, x: 0, y: PAGE_H_EMU - cy };
}
const GEO = cfg.letterhead_geometry || {};
const HEADER = HEADER_IMG ? box(HEADER_IMG, GEO.header, 'header') : null;
const FOOTER = FOOTER_IMG ? box(FOOTER_IMG, GEO.footer, 'footer') : null;
const px = (emu) => Math.round(emu / 9525);
const MARGIN_SIDE = 1440;
const MARGIN_TOP = 1440;
// Body text stays clear of the footer image (its height in twips plus 0.2 in of air) and, on page
// one, below the header image (its bottom edge in twips, minus the margin, plus air).
const MARGIN_BOTTOM = FOOTER ? Math.ceil(((PAGE_H_EMU - FOOTER.y) / 635) + 300) : 1440;
const FIRST_PAGE_CLEARANCE = HEADER ? Math.max(0, Math.ceil(((HEADER.y + HEADER.cy) / 635) - MARGIN_TOP + 220)) : 0;

function floating(img, box, x, y) {
  return new ImageRun({
    data: img.data, type: img.type,
    transformation: { width: px(box.cx), height: px(box.cy) },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: x },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: y },
      behindDocument: true, allowOverlap: true, lockAnchor: true, layoutInCell: false,
      wrap: { type: TextWrappingType.NONE }, zIndex: 0,
    },
  });
}

// Section properties for any document that goes out on the letterhead.
function sectionProps() {
  const props = {
    properties: {
      page: { size: { width: A4_W, height: A4_H }, margin: { top: MARGIN_TOP, right: MARGIN_SIDE, bottom: MARGIN_BOTTOM, left: MARGIN_SIDE } },
      titlePage: true,
    },
    headers: { default: new Header({ children: [] }) },
  };
  if (HEADER_IMG) props.headers.first = new Header({ children: [new Paragraph({ children: [floating(HEADER_IMG, HEADER, HEADER.x, HEADER.y)], spacing: { before: 0, after: 0 } })] });
  else props.headers.first = new Header({ children: [] });
  // A title page takes its own footer, so the footer image is declared for the first page and for every page after it.
  const footer = () => new Footer({ children: [new Paragraph({ children: [floating(FOOTER_IMG, FOOTER, FOOTER.x, FOOTER.y)], spacing: { before: 0, after: 0 } })] });
  if (FOOTER_IMG) props.footers = { first: footer(), default: footer() };
  return props;
}

// First paragraph of a letterhead document: pushes the text below the header on page one.
function firstPageSpacer() {
  return new Paragraph({ children: [new TextRun({ text: '', size: 2 })], spacing: { before: FIRST_PAGE_CLEARANCE, after: 0, line: 20, lineRule: LineRuleType.EXACT } });
}

const FONT = cfg.font_correspondence || 'Garamond';
const BLACK = '000000';
const tw = (text, size, opts = {}) => new TextRun({ text: String(text == null ? '' : text), font: FONT, size, color: BLACK, ...opts });
const P = (children, opts = {}) => new Paragraph({ spacing: { before: 0, after: 120, line: 240, lineRule: LineRuleType.AUTO }, alignment: AlignmentType.JUSTIFIED, ...opts, children });
const gap = (after = 120) => new Paragraph({ children: [], spacing: { before: 0, after } });

// The other half of the generator's silent-drop class, which the sweep there did not reach.
// A member of a rich-paragraph array may be a plain string as easily as a { text, bold }
// object, and reading .text off a string yields undefined, which tw() turns into an empty
// run: the words vanish and the document still renders. Anything already built as a docx
// run is passed through untouched so formatting is not disturbed.
const asRun = (r, size) => {
  if (r instanceof TextRun) return r;
  if (r && typeof r === 'object') return tw(r.text, size, r.bold ? { bold: true } : {});
  return tw(r, size);
};
const asRuns = (v, size) => (Array.isArray(v) ? v : [v]).map((r) => asRun(r, size));

// Ordinal suffix as superscript: "10th September 2026"
function dateRuns(dateStr, size) {
  return String(dateStr || '').split(/(\d+(?:st|nd|rd|th))/i).flatMap((part) => {
    const m = part.match(/^(\d+)(st|nd|rd|th)$/i);
    if (m) return [tw(m[1], size, { bold: true }), tw(m[2], size, { bold: true, superScript: true })];
    return part ? [tw(part, size, { bold: true })] : [];
  });
}

// Our Ref | Your Ref | Date on one line, as on the template: left, centre and right tab stops.
function refLine(ref, yourRef, date, size) {
  const TEXT_W = A4_W - 2 * MARGIN_SIDE;
  return new Paragraph({
    children: [
      tw('Our Ref: ', size, { bold: true }), tw(ref || 'TBA', size, { bold: true }),
      new TextRun({ text: '\t', font: FONT, size }), tw('Your Ref: ', size, { bold: true }), tw(yourRef || 'TBA', size, { bold: true }),
      new TextRun({ text: '\t', font: FONT, size }), tw('Date: ', size, { bold: true }), ...dateRuns(date || '', size),
    ],
    tabStops: [{ type: TabStopType.CENTER, position: Math.round(TEXT_W / 2) }, { type: TabStopType.RIGHT, position: TEXT_W }],
    spacing: { before: 0, after: 200 },
  });
}

// The firm's sign-off, as on the engagement letter template.
function signOff(ctx, size) {
  // keepNext holds the block together: a signature never lands on a page by itself.
  const K = { keepNext: true, keepLines: true };
  return [
    P([tw('Yours faithfully,', size)], { alignment: AlignmentType.LEFT, ...K }),
    new Paragraph({ children: [], spacing: { before: 0, after: 360 }, ...K }),
    P([tw('For and on behalf of', size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 }, ...K }),
    P([tw((cfg.firm_signoff_name || cfg.firm_name || '').toUpperCase(), size, { bold: true })], { alignment: AlignmentType.LEFT, ...K }),
    new Paragraph({ children: [], spacing: { before: 0, after: 480 }, ...K }),
    P([tw(ctx.signatoryName || '', size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 }, ...K }),
    P([tw(ctx.signatoryRole || '', size)], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 }, ...(ctx.signatoryLine2 ? K : {}) }),
    ...(ctx.signatoryLine2 ? [P([tw(ctx.signatoryLine2, size)], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } })] : []),
  ];
}

// ── Correspondence on the letterhead: demand letters, client letters, application letters, cover letters.
// d: { date, ref, their_ref|your_ref, recipient_lines[], attn?, salutation, subject, paragraphs[], closing?, notice_note? }
// ctx: { size (half-points), signatoryName, signatoryRole, signatoryLine2?, paraRuns?(text)->TextRun[] }
function buildLetter(d, ctx) {
  const size = ctx.size || 24;
  const items = [firstPageSpacer()];
  items.push(refLine(d.ref, d.their_ref || d.your_ref, d.date, size));
  (d.recipient_lines || []).forEach((line, i, arr) => items.push(P([tw(line, size, { bold: true, underline: i === arr.length - 1 && /^[A-Z .]+$/.test(line) ? { type: UnderlineType.SINGLE } : undefined })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } })));
  if (d.attn) items.push(P([tw('Attn: ' + d.attn, size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
  items.push(gap(200));
  items.push(P([tw(d.salutation || 'Dear Sir/Madam,', size)], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 200 } }));
  if (d.subject) items.push(P([tw(d.subject, size, { bold: true, underline: { type: UnderlineType.SINGLE } })], { spacing: { before: 0, after: 200 } }));
  (d.paragraphs || []).forEach((para) => {
    if (Array.isArray(para)) items.push(P(asRuns(para, size), { spacing: { before: 0, after: 200 } }));
    else if (ctx.paraRuns) items.push(P(ctx.paraRuns(para), { spacing: { before: 0, after: 200 } }));
    else items.push(P([tw(para, size)], { spacing: { before: 0, after: 200 } }));
  });
  items.push(...signOff(Object.assign({}, ctx), size));
  if (d.notice_note) { items.push(gap(200)); items.push(P([tw(d.notice_note, size - 4, { italics: true })])); }
  if (d.cc && d.cc.length) { items.push(gap(200)); items.push(P([tw('cc: ' + d.cc.join('; '), size - 2)], { alignment: AlignmentType.LEFT })); }
  return items;
}

// ── The engagement letter. Neutral default clauses: a firm that has its own precedent supplies the
// wording through the data file; nothing below is any one firm's house text.
// d: { date, ref, client_name, client_address_lines[], client_email, client_pronoun ('her'|'his'|'its'|'their'),
//      re_line, background[] (paragraphs), scope[] (items), fee_text (e.g. "Kshs. 150,000"),
//      fee_covers[] (items), deposit_text (e.g. "KES 75,000"), assumptions[] (items; defaults used when absent),
//      responsible_name?, responsible_title?, responsible_email?, assisted_by?, signatory_name?, signatory_title? }
// ctx: { size?, assistedBy? }
const DEFAULT_ASSUMPTIONS = [
  'the Client will give complete and accurate instructions and documents promptly;',
  'we are not required to verify the accuracy of documents supplied by the Client or by third parties;',
  'we advise only on the laws of Kenya;',
  'timelines depend on third parties, including Government registries, county offices and the other side\'s advocates, whose response times we do not control;',
  'no unforeseen dispute or protracted negotiation arises.',
];
const NUM = { clauses: 'firm-loe-clauses', letters: 'firm-loe-letters', roman: 'firm-loe-roman' };

// "KEN MWANGI-OTIENO" -> "Ken Mwangi-Otieno". Capitalises after a start, space, hyphen, apostrophe or full stop.
function titleCase(s) {
  return String(s || '').toLowerCase().replace(/(^|[\s'\-.])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

function buildEngagementLetter(d, ctx = {}) {
  const size = ctx.size || 22; // 11pt
  const items = [firstPageSpacer()];
  const clause = (title) => new Paragraph({ children: [tw(title, size, { bold: true })], numbering: { reference: NUM.clauses, level: 0 }, spacing: { before: 200, after: 120 } });
  const body = (runs, opts = {}) => P(asRuns(runs, size), { indent: { left: 360 }, spacing: { before: 0, after: 160 }, ...opts });
  let letterInstance = 0, romanInstance = 0;
  const letterList = (arr) => { letterInstance++; return arr.map((t) => new Paragraph({ children: [tw(t, size)], numbering: { reference: NUM.letters, level: 0, instance: letterInstance }, alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 100 } })); };
  const romanList = (arr) => { romanInstance++; return arr.map((t) => new Paragraph({ children: [tw(t, size)], numbering: { reference: NUM.roman, level: 0, instance: romanInstance }, alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 100 } })); };
  const pron = d.client_pronoun || 'their';
  const client = d.client_name || '';
  const firmTc = cfg.firm_name_tc || cfg.firm_name || '';

  items.push(refLine(d.ref, d.your_ref, d.date, size));
  items.push(P([tw(client, size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
  (d.client_address_lines || []).forEach((line) => items.push(P([tw(line, size, { bold: true, underline: /^[A-Z .]+$/.test(line) ? { type: UnderlineType.SINGLE } : undefined })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } })));
  if (d.client_email) items.push(P([tw('Email: ' + d.client_email, size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
  items.push(gap(200));
  items.push(P([tw(d.salutation || 'Dear Madam/Sir,', size, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 200 } }));
  items.push(P([tw('RE: LETTER OF ENGAGEMENT: ' + String(d.re_line || '').toUpperCase(), size, { bold: true })], { spacing: { before: 0, after: 200 } }));
  items.push(P([tw('The above matter refers. Please read through this letter carefully and then sign and return the enclosed copy of this letter to us.', size)]));
  items.push(P([tw('The terms of this engagement shall be as provided below:', size)]));

  items.push(clause('Terms of Engagement'));
  items.push(body([
    tw(client, size, { bold: true }), tw(' (the Client) appoints ', size), tw(firmTc, size, { bold: true }),
    tw(` (the Firm) to act on ${pron} behalf in the matters set out in the Scope of Work below and in matters incidental to them.`, size),
  ]));

  items.push(clause('Commencement'));
  items.push(body('This engagement commences when the Client signs and returns this letter and continues until the Scope of Work is complete and all fees and disbursements have been paid, unless it ends earlier under Clause 7.'));

  items.push(clause('Background'));
  (d.background || []).forEach((t) => items.push(body(t)));

  items.push(clause('Scope of Work'));
  items.push(body('Based on the background above, our Scope of Work is:', { indent: { left: 0 } }));
  items.push(...letterList(d.scope || []));

  items.push(clause('Professional Fees and Disbursements'));
  items.push(body(`Our professional fee for the Scope of Work is ${d.fee_text || 'Kshs. ____'}, exclusive of VAT and disbursements.` + ((d.fee_covers || []).length ? ' This fee will cover the following:' : '')));
  if ((d.fee_covers || []).length) items.push(...romanList(d.fee_covers));
  items.push(body('Disbursements (official fees, stamp duty, registration fees, searches, courier charges and similar outlays) are charged at cost and are payable before we incur them where a third party requires payment in advance.'));
  items.push(body('Work outside the Scope of Work will be agreed with the Client and charged separately before it is undertaken.'));
  items.push(body('We will issue fee notes as the matter progresses and may ask for payment on account.' + (d.deposit_text ? ` We request a deposit of ${d.deposit_text} before we commence.` : '')));

  items.push(clause('Assumptions'));
  items.push(body('The fee above assumes that:', { indent: { left: 0 } }));
  items.push(...letterList((d.assumptions && d.assumptions.length) ? d.assumptions : DEFAULT_ASSUMPTIONS));

  items.push(clause('Termination'));
  items.push(body('Either party may end this engagement by seven days\' written notice. Termination does not affect fees and disbursements accrued to the date of termination, nor any undertaking already given by the Firm.'));

  items.push(clause('Confidentiality'));
  items.push(body('The Firm holds the Client\'s information in confidence and discloses it only as the Client authorises or as the law requires. Communications between the Firm and the Client for the purpose of legal advice are privileged.'));

  items.push(clause('Communication'));
  const rn = d.responsible_name || titleCase(cfg.firm_partner);
  const rt = d.responsible_title || cfg.firm_partner_title || 'Partner';
  const re = d.responsible_email || cfg.firm_email || '';
  const assisted = d.assisted_by || ctx.assistedBy;
  items.push(body(`${rn}, ${rt} (${re}) has day-to-day conduct of this matter and will be assisted by ${assisted ? assisted + ' and ' : ''}other members of the Firm. We will keep the Client informed of material developments.`));

  items.push(clause('Governing Law and Dispute Resolution'));
  items.push(body('This engagement is governed by the laws of Kenya. A dispute that the parties cannot settle by discussion within fourteen days will be referred to a single arbitrator agreed between them or, failing agreement, appointed by the Chairperson for the time being of the Chartered Institute of Arbitrators, Kenya Branch, under the Arbitration Act, 1995.'));

  items.push(clause('Acceptance of Terms'));
  items.push(body('Please confirm your acceptance by signing both copies of this letter and returning one to us.'));
  items.push(gap(240));
  // No "Yours faithfully" on an engagement letter: the block starts at "For and on behalf of".
  items.push(...signOff({
    signatoryName: String(d.signatory_name || cfg.firm_partner || '').toUpperCase(),
    signatoryRole: d.signatory_title || cfg.firm_partner_title || 'Partner',
  }, size).slice(2));
  items.push(gap(360));
  items.push(P([tw('ACCEPTANCE', size, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 200 } }));
  items.push(body(`I, ${client.toUpperCase()}, of ID No. ................, confirm that I have read and understood this letter of engagement and accept its terms.`));
  items.push(gap(240));
  items.push(body('Signature ........................'));
  items.push(body('Date ........................'));
  return items;
}

const numberingConfig = [
  { reference: NUM.clauses, levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START, style: { run: { font: FONT, bold: true, color: BLACK }, paragraph: { indent: { left: 360, hanging: 360 } } } },
    { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2.', alignment: AlignmentType.START, style: { run: { font: FONT, color: BLACK }, paragraph: { indent: { left: 1080, hanging: 360 } } } },
    { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.', alignment: AlignmentType.START, style: { run: { font: FONT, color: BLACK }, paragraph: { indent: { left: 1800, hanging: 360 } } } },
  ] },
  { reference: NUM.letters, levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: '%1.', alignment: AlignmentType.START, style: { run: { font: FONT, color: BLACK }, paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
  { reference: NUM.roman, levels: [{ level: 0, format: LevelFormat.LOWER_ROMAN, text: '%1.', alignment: AlignmentType.START, style: { run: { font: FONT, color: BLACK }, paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
];

module.exports = { sectionProps, firstPageSpacer, buildLetter, buildEngagementLetter, signOff, refLine, numberingConfig, NUM, tw, P, gap, asRuns, FONT, MARGIN_BOTTOM, FIRST_PAGE_CLEARANCE, HEADER_IMG, FOOTER_IMG };
