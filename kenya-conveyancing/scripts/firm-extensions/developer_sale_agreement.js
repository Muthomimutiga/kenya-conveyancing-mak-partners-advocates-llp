// MAK & Partners Advocates LLP: developer (off-plan) sale agreement, a firm extension.
//
// Served by the shared conveyancing generator for doc_type "developer_sale_agreement" (see the
// template README, "Firm extensions"). This is MAK's own work product and lives only in MAK's
// inputs (store/rag-docs/mak/overlay/), never in the shared template.
//
// Ported unchanged in substance from the MAK build's generator (commit 04d3fba, 7 Sep 2026,
// buildProjectAwareDeveloperSaleAgreement and its numbering), so the six verbatim clause bodies
// in clause-bodies/ render as before. What changed in the port:
//   - the docx library and the data arrive through ctx; nothing is required from node_modules,
//     because the plugin directory has none at the firm;
//   - a missing project_slug is refused instead of falling back to the old paraphrased
//     "legacy" body: firm work product is verbatim source text or nothing;
//   - errors are refusals (no document written), not stack traces.
//
// Registry: developer-projects.json (projects keyed by slug). Drafting rules: drafting-rules/.
'use strict';
const fs = require('fs');
const path = require('path');

const EXT_DIR = __dirname;

module.exports = function developerSaleAgreement(ctx) {
  const { d, refuse } = ctx;
  const {
    Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, PageBreak,
    AlignmentType, UnderlineType, BorderStyle, WidthType, LineRuleType, LevelFormat,
  } = ctx.docx;
  const BLACK = '1A1A1A';

  const registryPath = path.join(EXT_DIR, 'developer-projects.json');
  if (!fs.existsSync(registryPath)) refuse('[developer_sale_agreement] developer-projects.json is missing from scripts/firm-extensions/.');
  const REGISTRY = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const slugs = Object.keys(REGISTRY.projects || {});
  if (!d.project_slug) refuse('[developer_sale_agreement] no project_slug. A developer sale agreement is drawn from one of the firm\'s ' +
    `project precedents: ${slugs.join(', ')}. Set project_slug on the matter (the Conveyance's Project field) and re-run.`);
  const project = (REGISTRY.projects || {})[d.project_slug];
  if (!project) refuse(`[developer_sale_agreement] unknown project_slug "${d.project_slug}". Known projects: ${slugs.join(', ')}. ` +
    'Add an entry to scripts/firm-extensions/developer-projects.json under projects.');

  // ── Helpers (as in the MAK build) ──────────────────────────────────────────
  function antiqua(text, opts = {}) {
    return new TextRun({ text: String(text || ''), font: 'Tw Cen MT', size: 24, color: BLACK, ...opts });
  }
  function spacingB(after = 80) { return { before: 0, after, line: 240, lineRule: LineRuleType.AUTO }; }
  function spacer() { return new Paragraph({ children: [], spacing: { before: 0, after: 160 } }); }
  function definitionPara(children) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED, indent: { left: 1440 } });
  }
  function bulletPara(children) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ children: c, bullet: { level: 0 }, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED, indent: { left: 720 } });
  }
  function makClauseH(title) {
    return new Paragraph({ numbering: { reference: 'mak-main-clauses', level: 0 }, children: [antiqua(title, { bold: true, underline: { type: UnderlineType.SINGLE } })], spacing: spacingB(80), alignment: AlignmentType.LEFT });
  }
  function makSubC(children, level = 1) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ numbering: { reference: 'mak-main-clauses', level }, children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED });
  }
  function makRecital(children) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ numbering: { reference: 'mak-recitals', level: 0 }, children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED });
  }
  function makParty(children) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ numbering: { reference: 'mak-parties', level: 0 }, children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED });
  }
  function bodyPara(children) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ children: c, spacing: spacingB(80), alignment: AlignmentType.JUSTIFIED });
  }
  function centeredPara(children, extraOpts = {}) {
    const c = Array.isArray(children) ? children : [antiqua(children)];
    return new Paragraph({ children: c, spacing: spacingB(80), alignment: AlignmentType.CENTER, ...extraOpts });
  }
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

  function buildProjectAwareDeveloperSaleAgreement(project) {
    const children = [];
    const vendor       = project.vendor;
    const land         = project.land;
    const development  = project.development;
    const completion   = project.completion;
    const payments     = project.payments;
    const dispute      = project.dispute_resolution;
    const tsavo        = REGISTRY.tsavo_group_constants || {};
    const vAdv         = REGISTRY.vendor_advocates || {};

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
      refuse(
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
    // Horizontal rule: bottom border on an empty paragraph spans full content width
    const hRule = () => new Paragraph({
      children: [],
      spacing: { before: 40, after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } },
    });

    // Load MAK logo (designed PNG asset): falls back to text if missing.
    const makLogoPath = path.join(ctx.assetsDir, 'sale-agreement-logo.png');
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
    // Per-project relation phrase and apartment line: both pulled verbatim
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

    // Firm address block (centered, under the logo): bold per Robin's
    // formatting pass across all 6 templates.
    children.push(cvP([cvT(vAdv.address_line_1 || '', { bold: true })]));
    children.push(cvP([cvT(vAdv.address_line_2 || '', { bold: true })]));
    children.push(cvP([cvT(vAdv.po_box || '', { bold: true })]));
    children.push(cvP([cvT(`E: ${vAdv.email || ''}`, { bold: true })]));
    children.push(cvP([cvT(vAdv.website || '', { bold: true })]));
    children.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

    // ── DISPATCH: per-project verbatim body (REQUIRED: no fallback) ──────────
    // Generator HARD-FAILS if scripts/firm-extensions/clause-bodies/<project_slug>.js is absent.
    // This is by design: paraphrased fallbacks for firm work product are not
    // permitted (see memory/feedback_no_paraphrased_fallbacks.md).
    const perProjectBodyPath = path.join(EXT_DIR, 'clause-bodies', d.project_slug + '.js');
    if (!fs.existsSync(perProjectBodyPath)) {
      refuse(
        `Verbatim clause-bodies file is missing for project "${d.project_slug}". ` +
        `Expected at: ${perProjectBodyPath}\n` +
        `\n` +
        `Generators for MAK firm work product must use verbatim source text only. ` +
        `Paraphrased / synthesised fallbacks are not permitted.\n` +
        `\n` +
        `To add this project: extract the verbatim clauses from the MAK source DOCX ` +
        `into scripts/firm-extensions/clause-bodies/${d.project_slug}.js (see royal_suburb_1.js as the canonical example).`
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
      refuse(`clause-bodies/${d.project_slug}.js returned an empty or invalid body. Expected an array of Paragraph elements.`);
    }
    children.push(...perProjectBody);

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

  // ── Word auto-numbering: 1. / 1.1 / 1.1.1, (A) recitals, (1) parties ────────
  const numbering = [
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
  ];

  // ── Cover page border, where the project's precedent has one ──────────────
  const pageBorders = project.cover_page_border === true ? {
    pageBorders: { display: 'allPages', offsetFrom: 'page' },
    pageBorderTop:    { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 12, space: 24, color: 'auto' },
    pageBorderLeft:   { style: BorderStyle.THICK_THIN_SMALL_GAP, size: 12, space: 24, color: 'auto' },
    pageBorderBottom: { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, space: 24, color: 'auto' },
    pageBorderRight:  { style: BorderStyle.THIN_THICK_SMALL_GAP, size: 12, space: 24, color: 'auto' },
  } : undefined;

  return { children: buildProjectAwareDeveloperSaleAgreement(project), numbering, pageBorders };
};
