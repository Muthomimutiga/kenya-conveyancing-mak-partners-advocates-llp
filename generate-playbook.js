// Playbook generator — MAK & Partners Conveyancing Manager
// Run: node generate-playbook.js <output.docx>

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType,
  convertInchesToTwip, PageBreak, Header, ImageRun, Footer,
} = require('./kenya-conveyancing/scripts/node_modules/docx');
const fs   = require('fs');
const path = require('path');

const OUTPUT = process.argv[2] || path.join(__dirname, 'MAK-Conveyancing-Manager-Playbook.docx');

// ─── firm palette ────────────────────────────────────────────────────────────
const BLACK     = '000000';
const GOLD      = 'FFDE13';
const GOLD_DARK = 'C8A400';
const WHITE     = 'FFFFFF';
const LIGHT     = 'F7F7F7';
const GREY      = '555555';
const RULE      = 'DDDDDD';
const FONT      = 'Calibri';

// ─── assets ──────────────────────────────────────────────────────────────────
const ASSETS = path.join(__dirname, 'kenya-conveyancing/scripts/assets');
const loadImg = (f) => { const p = path.join(ASSETS, f); return fs.existsSync(p) ? fs.readFileSync(p) : null; };

const LH_HEADER = loadImg('letterhead-header.jpeg');
const LH_FOOTER = loadImg('letterhead-footer.jpeg');
const LOGO      = loadImg('sale-agreement-logo.png');

// ─── image dimensions ────────────────────────────────────────────────────────
// content width at 1in margins = 6.5in = 624px
const CONTENT_PX = 624;
const LH_H_W = CONTENT_PX;
const LH_H_H = Math.round(CONTENT_PX * (372 / 1887));   // 123px
const LH_F_W = CONTENT_PX;
const LH_F_H = Math.round(CONTENT_PX * (418 / 1940));   // 134px
const LOGO_W  = 280;
const LOGO_H  = Math.round(LOGO_W * (157 / 380));        // 116px

// ─── helpers ─────────────────────────────────────────────────────────────────

const gap = (n = 1) => Array.from({ length: n }, () => new Paragraph({ text: '' }));

function heading1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: WHITE, font: FONT })],
    shading: { type: ShadingType.SOLID, color: BLACK, fill: BLACK },
    border: { left: { style: BorderStyle.SINGLE, size: 32, color: GOLD } },
    spacing: { before: 360, after: 200 },
    indent: { left: convertInchesToTwip(0.18) },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: BLACK, font: FONT })],
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    spacing: { before: 280, after: 120 },
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: FONT, color: '222222', ...opts })],
    spacing: { before: 60, after: 80 },
  });
}

function bullet(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: FONT, color: '222222' })],
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
  });
}

function numbered(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: FONT, color: '222222' })],
    numbering: { reference: 'steps', level: 0 },
    spacing: { before: 60, after: 60 },
  });
}

function note(text) {
  return new Paragraph({
    children: [
      new TextRun({ text: 'Note: ', bold: true, size: 18, font: FONT, color: GOLD_DARK }),
      new TextRun({ text, size: 18, font: FONT, color: '444444' }),
    ],
    shading: { type: ShadingType.SOLID, color: 'FFFCE6', fill: 'FFFCE6' },
    border: { left: { style: BorderStyle.SINGLE, size: 20, color: GOLD } },
    spacing: { before: 100, after: 100 },
    indent: { left: convertInchesToTwip(0.15), right: convertInchesToTwip(0.15) },
  });
}

function codeBlock(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: 'Courier New', color: '1A1A1A' })],
    shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' },
    border: { left: { style: BorderStyle.SINGLE, size: 16, color: BLACK } },
    spacing: { before: 60, after: 80 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── table builder ────────────────────────────────────────────────────────────

function makeTable(rows, header, colWidths) {
  const widths = colWidths || (header && header.length === 2 ? [35, 65] : rows[0].map(() => Math.floor(100 / rows[0].length)));

  const makeCell = (text, isHeader, w, isAlt) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, bold: isHeader, size: 19, color: isHeader ? WHITE : '1A1A1A', font: FONT })],
      spacing: { before: 80, after: 80 },
      indent: { left: convertInchesToTwip(0.1) },
    })],
    shading: isHeader
      ? { type: ShadingType.SOLID, color: BLACK, fill: BLACK }
      : isAlt
        ? { type: ShadingType.SOLID, color: 'FFFCE6', fill: 'FFFCE6' }
        : undefined,
    width: { size: w, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    },
  });

  const tableRows = [];
  if (header) {
    tableRows.push(new TableRow({
      children: header.map((h, i) => makeCell(h, true, widths[i], false)),
      tableHeader: true,
    }));
  }
  rows.forEach((row, idx) => {
    const isAlt = idx % 2 === 1;
    tableRows.push(new TableRow({
      children: row.map((val, i) => makeCell(val, false, widths[i], isAlt)),
    }));
  });

  return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

// ─── header / footer ─────────────────────────────────────────────────────────

function buildHeader() {
  if (!LH_HEADER) return undefined;
  return new Header({
    children: [new Paragraph({
      children: [new ImageRun({ data: LH_HEADER, type: 'jpg', transformation: { width: LH_H_W, height: LH_H_H } })],
      spacing: { before: 0, after: 0 },
    })],
  });
}

function buildFooter() {
  if (!LH_FOOTER) return undefined;
  return new Footer({
    children: [new Paragraph({
      children: [new ImageRun({ data: LH_FOOTER, type: 'jpg', transformation: { width: LH_F_W, height: LH_F_H } })],
      spacing: { before: 0, after: 0 },
    })],
  });
}

// ─── cover page ───────────────────────────────────────────────────────────────

const cover = [
  new Paragraph({ text: '', spacing: { before: convertInchesToTwip(0.6) } }),

  ...(LOGO ? [
    new Paragraph({
      children: [new ImageRun({ data: LOGO, type: 'png', transformation: { width: LOGO_W, height: LOGO_H } })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 320 },
    }),
  ] : []),

  new Paragraph({
    border: {
      top:    { style: BorderStyle.SINGLE, size: 24, color: GOLD },
      bottom: { style: BorderStyle.SINGLE, size: 6,  color: GOLD },
    },
    spacing: { before: 0, after: 400 },
    text: '',
  }),

  new Paragraph({
    children: [new TextRun({ text: 'MAK & PARTNERS ADVOCATES LLP', bold: true, size: 26, color: GREY, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
  }),

  new Paragraph({
    children: [new TextRun({ text: 'KENYA CONVEYANCING MANAGER', bold: true, size: 48, color: BLACK, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
  }),

  new Paragraph({
    children: [new TextRun({ text: 'Installation & User Playbook', size: 28, color: GREY, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 480 },
  }),

  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: GOLD } },
    spacing: { before: 0, after: 160 },
    text: '',
  }),

  new Paragraph({
    children: [new TextRun({ text: 'Built by Robin Advisory Group  ·  May 2026', size: 18, color: GREY, font: FONT })],
    alignment: AlignmentType.CENTER,
  }),

  pageBreak(),
];

// ─── section 1 — overview ─────────────────────────────────────────────────────

const overview = [
  heading1('1.  WHAT THIS IS'),
  ...gap(),
  body('The Kenya Conveyancing Manager is an AI-powered conveyancing workflow tool built into Claude CoWork. It handles the full property transaction lifecycle — 9 milestones, automatic deadline calendars, document drafting, and client updates — all from a single conversation.'),
  ...gap(),
  body('It connects to your firm\'s Airtable database, Outlook Calendar, and OneDrive / SharePoint. Every matter opened is tracked in Airtable, every milestone triggers an Outlook Calendar reminder, and every document is generated as a ready-to-sign Word file.'),
  ...gap(),
  heading2('Your 7 Commands'),
  ...gap(),
  makeTable([
    ['/setup-conveyancing',  'One-time admin setup. Connects the plugin to your Airtable base. Run once only.'],
    ['/new-conveyance',      'Open a new matter. Intake → 9 milestones in Airtable → Calendar reminders → Sale Agreement, Engagement Letter, and Fee Note generated automatically.'],
    ['/conveyance-status',   'Dashboard of all active matters: overdue milestones, official search countdowns, completions due this month.'],
    ['/draft-conveyance-doc','Draft any document for a matter — LRA forms, transfer documents, letters, undertakings, fee notes, and client updates.'],
    ['/complete-milestone',  'Mark a milestone done. Updates Airtable, advances the matter, offers to draft next-stage documents.'],
    ['/send-client-update',  'Draft and send a plain-English progress update to the client via Outlook.'],
    ['/train-form',          'Teach the system a new LRA statutory form. Auto-downloads the template from the Ministry of Lands website.'],
  ], ['Command', 'What it does']),
  ...gap(2),
];

// ─── section 2 — airtable setup ───────────────────────────────────────────────

const airtableSetup = [
  heading1('2.  AIRTABLE SETUP  (Admin — done once)'),
  ...gap(),
  body('The plugin stores all matter data in Airtable. You need one base, shared across the entire team. This is done once by the admin (Ann or Ken). All other team members skip to Section 3.'),
  ...gap(),
  heading2('Step 1 — Create an Airtable account'),
  ...gap(),
  bullet('Go to airtable.com and sign up (the free plan is sufficient)'),
  bullet('Use the firm email address'),
  ...gap(),
  heading2('Step 2 — Create the base'),
  ...gap(),
  numbered('Open the shared template link Robin sends you'),
  numbered('Click "Use this template"'),
  numbered('Name the base: Kenya Conveyancing Manager'),
  numbered('Click "Create base"'),
  ...gap(),
  note('No template link? Create a base from scratch in Airtable → name it "Kenya Conveyancing Manager" → create the 4 tables below manually.'),
  ...gap(),
  heading2('Step 3 — Confirm the 4 tables exist'),
  ...gap(),
  makeTable([
    ['Conveyances',  'One record per property transaction — all party and property details, status, milestone tracking.'],
    ['Milestones',   'Nine records per conveyance (one per milestone) — target dates, status, Calendar event IDs.'],
    ['Parties',      'Buyers, sellers, and other parties with ID and PIN details.'],
    ['Documents',    'Records of every document drafted — linked to the conveyance and milestone.'],
  ], ['Table', 'Purpose']),
  ...gap(2),
  heading2('Step 4 — Get your Airtable API key'),
  ...gap(),
  numbered('In Airtable, click your profile icon (top right) → Account'),
  numbered('Go to Developer Hub → Personal access tokens'),
  numbered('Click "Create new token"'),
  numbered('Name it: CoWork Plugin'),
  numbered('Scopes: data.records:read, data.records:write, schema.bases:read'),
  numbered('Click "Create token" — copy it immediately (shown once only)'),
  ...gap(),
  note('All team members use the same AIRTABLE_API_KEY. If it is ever compromised, generate a new token and update all team members\' CoWork settings.'),
  ...gap(2),
];

// ─── section 3 — per-user installation ───────────────────────────────────────

const perUserInstall = [
  heading1('3.  INSTALLATION  (Every team member)'),
  ...gap(),
  body('Each person who will use the Conveyancing Manager installs it individually. Takes 5 minutes. Do this once per user.'),
  ...gap(),
  heading2('Step 1 — Get Claude CoWork'),
  ...gap(),
  bullet('Download CoWork from claude.ai/download (Mac or Windows)'),
  bullet('Sign in with an Anthropic account — each person uses their own account'),
  ...gap(),
  note('CoWork requires an Anthropic Pro subscription ($20/month per user). The firm pays for however many users need access.'),
  ...gap(),
  heading2('Step 2 — Install the plugin'),
  ...gap(),
  numbered('Open CoWork'),
  numbered('Click the plugin icon (puzzle piece, top left)'),
  numbered('Click "Add from GitHub"'),
  numbered('Paste this URL exactly:'),
  codeBlock('https://github.com/Muthomimutiga/kenya-conveyancing-mak-partners-advocates-llp'),
  numbered('Click "Install" — CoWork downloads and installs the plugin'),
  numbered('The plugin appears in your list as: Kenya Conveyancing Manager'),
  ...gap(),
  heading2('Step 3 — Add your Airtable API key'),
  ...gap(),
  body('The admin (Section 2 above) provides this key to all team members.'),
  ...gap(),
  numbered('In CoWork, go to Settings → Environment Variables'),
  numbered('Click "Add variable"'),
  numbered('Name: AIRTABLE_API_KEY'),
  numbered('Value: paste the key your admin gave you'),
  numbered('Click "Save"'),
  ...gap(),
  note('Everyone enters the same AIRTABLE_API_KEY. This is correct — you are all sharing one Airtable base.'),
  ...gap(),
  heading2('Step 4 — Activate the plugin'),
  ...gap(),
  numbered('In CoWork, start a new conversation'),
  numbered('Click the plugin icon → toggle Kenya Conveyancing Manager ON'),
  numbered('The plugin is now active for this conversation'),
  ...gap(),
  body('Installation complete. The admin (one person only) now runs /setup-conveyancing. All other users skip to Section 5.'),
  ...gap(2),
];

// ─── section 4 — setup-conveyancing ──────────────────────────────────────────

const setupSection = [
  heading1('4.  /SETUP-CONVEYANCING  (Admin — run once)'),
  ...gap(),
  body('This command wires the plugin to your Airtable base. It finds all table and field IDs, generates the live tracking dashboard, and installs all dependencies for document generation. Takes 2–3 minutes.'),
  ...gap(),
  body('Run this once only, by the admin, after completing Section 2.'),
  ...gap(),
  heading2('How to run it'),
  ...gap(),
  numbered('Open CoWork → activate the Kenya Conveyancing Manager plugin'),
  numbered('Type: /setup-conveyancing'),
  numbered('Follow the prompts — the plugin finds your Airtable base automatically'),
  numbered('At the end, you receive a live Conveyancing Tracker dashboard — bookmark it'),
  ...gap(),
  note('If the command cannot find the base, check it is named exactly "Kenya Conveyancing Manager" in Airtable. Rename it if needed, then try again.'),
  ...gap(2),
];

// ─── section 5 — daily use ────────────────────────────────────────────────────

const dailyUse = [
  heading1('5.  DAILY USE'),
  ...gap(),

  heading2('Opening a new matter — /new-conveyance'),
  ...gap(),
  body('Use this when you receive new instructions on a property transaction. The command walks you through intake, then automatically:'),
  bullet('Creates the matter record in Airtable'),
  bullet('Calculates all 9 milestone target dates from today'),
  bullet('Creates 9 Outlook Calendar reminders (7-day + 1-day alerts each)'),
  bullet('Creates an Official Search expiry reminder (lodgement day + 30 days)'),
  bullet('Generates 3 opening documents: Sale Agreement, Engagement Letter, and Fee Note'),
  ...gap(),
  body('You will be asked:'),
  ...gap(),
  makeTable([
    ['Buyer full name(s)',             'Exactly as they will appear on the Transfer instrument'],
    ['Buyer National ID and KRA PIN',  ''],
    ['Seller full name(s)',            'Exactly as on the current title — a mismatch is grounds for rejection at the Registry after stamp duty has been paid'],
    ['Seller National ID and KRA PIN', ''],
    ['Property description',           'LR No. / Title No. / Plot No.'],
    ['Physical location',              'Estate, road, town'],
    ['Tenure',                         'Freehold or Leasehold (and years remaining if leasehold)'],
    ['Purchase price (Kshs.)',         ''],
    ['Deposit already paid (Kshs.)',   'Enter 0 if not yet paid'],
    ['Target completion date',         ''],
    ['Buyer\'s advocate',              'Firm name and email, or "Unknown"'],
    ['Seller\'s advocate',             'Firm name and email, or "Unknown"'],
    ['Is the seller a company or developer?', 'Yes = Developer Sale Agreement is used (off-plan). No = standard individual Sale Agreement. If unclear, the system will ask before proceeding.'],
  ], ['Field', 'Notes']),
  ...gap(2),

  heading2('Checking matters — /conveyance-status'),
  ...gap(),
  body('Gives you a dashboard of all active matters. Run this at the start of each working day. Shows overdue milestones, milestones due this week, official search windows expiring within 10 days, and completions due this month.'),
  ...gap(),

  heading2('Drafting documents — /draft-conveyance-doc'),
  ...gap(),
  body('Drafts any conveyancing document for a matter. The command asks which matter and which document, then pulls all party and property details from Airtable automatically. You never re-type names, IDs, or property descriptions.'),
  ...gap(),
  makeTable([
    ['Milestone 1 — Instructions',    'Sale Agreement (individual vendor)  ·  Developer Sale Agreement (off-plan)  ·  Engagement Letter  ·  Fee Note  ·  Letter acknowledging instructions'],
    ['Milestone 2 — Official Search', 'Official Search application letter  ·  LRA 84 form'],
    ['Milestone 3 — Consent',         'LCB consent application (agricultural land)  ·  NLC consent application (leasehold)'],
    ['Milestone 4 — Rates Clearance', 'Rates clearance application letter (County Government)'],
    ['Milestone 5 — Rent Clearance',  'Rent clearance application letter (NLC) — leasehold only'],
    ['Milestone 6 — Stamp Duty',      'Stamp duty guidance note to client'],
    ['Milestone 7 — Transfer Docs',   'LRA 33 Transfer (freehold)  ·  LRA 63 Transfer of Lease (leasehold)  ·  Requisitions on Title  ·  Reply to Requisitions  ·  LRA 58 Discharge of Charge'],
    ['Milestone 8 — Registration',    'Registration covering letter'],
    ['Milestone 9 — Completion',      'Completion Notice  ·  Undertaking Letter'],
    ['Any milestone',                  'Client update letter  ·  Reminder / chase notice to counterpart advocates'],
  ], ['Milestone', 'Documents available']),
  ...gap(),
  note('Engagement Letter and Fee Note are generated automatically when you open a new matter with /new-conveyance. You can also draft them separately at any time via /draft-conveyance-doc.'),
  ...gap(2),

  heading2('Completing a milestone — /complete-milestone'),
  ...gap(),
  body('When a milestone is done, run this command. It updates Airtable, advances the matter to the next milestone, and offers to draft the documents for the next stage.'),
  ...gap(),

  heading2('Sending client updates — /send-client-update'),
  ...gap(),
  body('Drafts a plain-English progress update for the client — no legal jargon — and sends it via Outlook to the client\'s email on record. Run this at each milestone to keep clients informed without drafting a letter from scratch.'),
  ...gap(2),
];

// ─── section 6 — 9 milestones ─────────────────────────────────────────────────

const milestones = [
  heading1('6.  THE 9-MILESTONE SCHEDULE'),
  ...gap(),
  body('Every conveyance follows this schedule from Day 0 (instructions received). Dates are calculated automatically and set in Outlook Calendar.'),
  ...gap(),
  makeTable([
    ['1 — Instructions + Sale Agreement', 'Day 0',  'Triggers the entire timeline. Three opening documents generated automatically: Sale Agreement (or Developer Sale Agreement for off-plan), Engagement Letter, and Fee Note.'],
    ['2 — Official Search',               'Day 7',  'LRA 84 application. 30-day validity window — expiry is tracked automatically and a separate Calendar alert is set.'],
    ['3 — LCB / NLC Consent',            'Day 14', 'LCB consent for agricultural land. NLC consent for all leasehold dealings. Skipped automatically for non-agricultural freehold transactions.'],
    ['4 — Rates Clearance',               'Day 14', 'Application to County Government. Runs in parallel with Milestone 3.'],
    ['5 — Rent Clearance',                'Day 14', 'NLC certificate confirming no rent arrears. Leasehold only — skipped automatically for freehold.'],
    ['6 — Stamp Duty',                    'Day 45', 'KRA iTax self-assessment. Gateway milestone — the Registrar will not accept any instrument unless it has been stamped.'],
    ['7 — Transfer Documents',            'Day 60', 'LRA 33 (freehold) or LRA 63 (leasehold). Plus LRA 58 Discharge of Charge if an existing charge must be discharged.'],
    ['8 — Registration',                  'Day 70', 'Lodge all instruments at the Land Registry. Priority by order of presentation.'],
    ['9 — Completion',                    'Day 80', 'Balance payment released. New title delivered to the buyer.'],
  ], ['Milestone', 'Target', 'What happens'], [30, 10, 60]),
  ...gap(2),
];

// ─── section 7 — training new forms ──────────────────────────────────────────

const trainForm = [
  heading1('7.  TRAINING NEW FORMS — /train-form'),
  ...gap(),
  body('The system already generates LRA 33, LRA 63, LRA 58, and LRA 84. For any other LRA form, use /train-form to teach it. The command auto-downloads the official template from the Ministry of Lands website, analyses the form structure, and saves a schema so it can generate that form on demand permanently.'),
  ...gap(),
  heading2('How to train a new form'),
  ...gap(),
  numbered('Type: /train-form'),
  numbered('Enter the form number (e.g. "LRA 42")'),
  numbered('Say "no file" — let the system auto-download from the Ministry of Lands'),
  numbered('Review the form analysis the system presents'),
  numbered('Confirm or correct any field details'),
  numbered('The system generates a test document for you to approve'),
  numbered('Once approved, the form is permanently available in /draft-conveyance-doc'),
  ...gap(),
  note('Once a form is trained, it stays trained. You never need to retrain the same form number.'),
  ...gap(2),
];

// ─── section 8 — troubleshooting + contact ────────────────────────────────────

const troubleshooting = [
  heading1('8.  TROUBLESHOOTING'),
  ...gap(),
  makeTable([
    ['"Cannot find Airtable base"',
     'Check the base is named exactly "Kenya Conveyancing Manager" in Airtable. Rename it if needed, then re-run /setup-conveyancing.'],
    ['"AIRTABLE_API_KEY not set"',
     'Go to CoWork Settings → Environment Variables. Confirm AIRTABLE_API_KEY is saved with the correct value.'],
    ['Downloaded document is empty or very small',
     'The npm package failed to install. Re-run /setup-conveyancing to reinstall all dependencies. If it persists, contact Robin Advisory Group.'],
    ['Plugin not showing in CoWork',
     'Click the plugin icon → confirm Kenya Conveyancing Manager is toggled ON for the current conversation.'],
    ['Names on the LRA form are wrong',
     'Update the Conveyance record in Airtable directly (the names in Airtable may not match the title register), then regenerate the document.'],
    ['Official search expiry not in Calendar',
     'Check Outlook (Microsoft 365) Calendar is connected in CoWork (Settings → Connectors). Re-run /setup-conveyancing to restore the connection.'],
    ['I need a form type not on the list',
     'Run /train-form and enter the LRA form number. The system downloads the official template automatically.'],
    ['Something is broken and you don\'t know why',
     'Send the error message to Robin Muthomi (Robin Advisory Group) by WhatsApp or email.'],
  ], ['Problem', 'Fix']),
  ...gap(2),

  heading1('9.  CONTACT'),
  ...gap(),
  makeTable([
    ['Name',          'Robin Muthomi Mutiga'],
    ['Organisation',  'Robin Advisory Group'],
    ['Email',         'robin@robinmuthomi.com'],
    ['WhatsApp',      '+254 799 157 696'],
    ['Support hours', 'Monday to Friday, 9am to 6pm'],
  ], null, [30, 70]),
  ...gap(2),
];

// ─── assemble ─────────────────────────────────────────────────────────────────

const hdr = buildHeader();
const ftr = buildFooter();

const doc = new Document({
  numbering: {
    config: [{
      reference: 'steps',
      levels: [{
        level: 0,
        format: 'decimal',
        text: '%1.',
        alignment: AlignmentType.LEFT,
        style: {
          paragraph: { indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.25) } },
        },
      }],
    }],
  },
  sections: [
    // Cover — no header/footer
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.0),
            bottom: convertInchesToTwip(1.0),
            left:   convertInchesToTwip(1.2),
            right:  convertInchesToTwip(1.2),
          },
        },
      },
      children: cover,
    },
    // Content — MAK letterhead header + footer on every page
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.4),
            bottom: convertInchesToTwip(1.5),
            left:   convertInchesToTwip(1.0),
            right:  convertInchesToTwip(1.0),
          },
        },
      },
      ...(hdr ? { headers: { default: hdr } } : {}),
      ...(ftr ? { footers: { default: ftr } } : {}),
      children: [
        ...overview,
        pageBreak(),
        ...airtableSetup,
        pageBreak(),
        ...perUserInstall,
        pageBreak(),
        ...setupSection,
        ...dailyUse,
        pageBreak(),
        ...milestones,
        pageBreak(),
        ...trainForm,
        ...troubleshooting,
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log('Playbook written to:', OUTPUT);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
