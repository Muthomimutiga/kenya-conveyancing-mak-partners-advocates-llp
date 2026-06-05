// ─────────────────────────────────────────────────────────────────────────────
// Royal Suburb Phase 3 — Verbatim Document Body
// Source: DRAFT AGREEMENT FOR SALE — ROYAL SUBURB PHASE THREE LIMITED
// Reference: MAK source DOCX supplied by Ann Wayodi on 2026-05-13.
//
// Distinctive features of this template:
//   - 90 Business Days Sale Completion lag from Anticipated Practical
//     Completion Date (8 May 2025)
//   - Change of User APPLIED but pending — surrender of Title required to
//     enable issuance of a new title
//   - Leasehold tenure from Government of Kenya (Title No. Nairobi/Block 138/1335)
//   - Six (6) month Defects Liability Period
//   - Strict ten (10) day late-payment grace with "sole discretion"
//     fundamental-breach language
//   - Vendor executes via Power of Attorney
//   - Six (6) recital style — modern RS3 numbering (1.1, 1.2, 1.3)
//   - WARRANTIES (plural) — short three-warranty form
//   - DISPUTE RESOLUTION via NCIA mediation → court (not arbitration)
//   - Bank: NCBA Ciata Mall (Vendor) / ABSA JKIA (MAK Advocates)
//   - Includes Property Management sub-clause and Utility & Georeferencing
//     Costs sub-clause inside Condition 3
//   - DATA PROTECTION clause positioned after ANTI-MONEY LAUNDERING and
//     before COUNTERPARTS (different order to Skywalk)
//
// Rules (per memory/feedback_no_paraphrased_fallbacks.md):
//   - Every clause's text is verbatim from the MAK source. Dynamic placeholders
//     are interpolated ONLY where the matter genuinely varies.
//   - Project-deterministic content is pulled from developer-projects.json.
//   - No em dashes anywhere. Source uses commas, en dashes, or rewrites.
// ─────────────────────────────────────────────────────────────────────────────

module.exports = function buildBody({ project, d, helpers }) {
  const {
    antiqua, bodyPara, centeredPara, spacer, definitionPara, bulletPara,
    makClauseH, makSubC, makRecital, makParty,
    AlignmentType, UnderlineType,
    Paragraph, PageBreak,
  } = helpers;

  const v = project.vendor;
  const land = project.land;
  const dev = project.development;
  const pay = project.payments;
  const purchaserName = d.purchaser_name || '[*]';

  const out = [];

  // ── HEADING & DATE LINE ───────────────────────────────────────────────────
  out.push(centeredPara([antiqua('AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());
  out.push(centeredPara([
    antiqua('THIS AGREEMENT is made as of the           day of                        			20….'),
  ]));
  out.push(spacer());

  // ── BETWEEN ───────────────────────────────────────────────────────────────
  out.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  out.push(spacer());

  // (1) Vendor party
  out.push(makParty([
    antiqua(`${v.company_name}`, { bold: true }),
    antiqua(` (Company Registration Number ${v.company_registration_number}), of ${v.po_box} (the `),
    antiqua('Vendor', { bold: true }),
    antiqua(' which shall, where context allows, include the Vendor’s successors in title and assigns); and'),
  ]));

  // (2) Purchaser party
  out.push(makParty([
    antiqua('The '), antiqua('Purchaser', { bold: true }), antiqua(', being the person(s), whose particulars are set out in Section I of the Schedule of Particulars (which shall, where context allows, include the Purchaser’s successors in title, personal representatives, heirs and permitted assigns (as may be applicable) and where the Purchaser is more than one person, the Purchaser’s obligation shall be joint and several).'),
  ]));
  out.push(spacer());

  // ── WHEREAS — 4 recitals ─────────────────────────────────────────────────
  out.push(bodyPara([antiqua('WHEREAS:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());

  // (A) Vendor's title — leasehold from Government of Kenya
  out.push(makRecital([
    antiqua(`The Vendor is registered as proprietor as lessee from the Government of Kenya of `), antiqua('ALL THAT', { bold: true }), antiqua(` property known as Title Number ${land.title_number} (subject to the conditions contained in the said Certificate of Lease (hereinafter collectively referred to as `),
    antiqua('"the Land"', { bold: true }),
    antiqua(').'),
  ]));

  // (B) Development recital — completed project description
  out.push(makRecital([
    antiqua('The Vendor has completed a development project on the Land known as '),
    antiqua('“ROYAL SUBURBS PHASE THREE APARTMENTS”', { bold: true }),
    antiqua(' (hereinafter referred to as '),
    antiqua('“the Development”', { bold: true }),
    antiqua(') which comprises 12 floors consisting of studio, Superior Studio, one bedroom and two bedroom residential apartments together with social amenities, pathways, driveways, commercial center, parking spaces, gardens, and other usual amenities in accordance with the Building Plans which are available for inspection at the Vendor’s offices.'),
  ]));

  // (C) Change of User — applied but pending; surrender of Title required
  out.push(makRecital([
    antiqua('The Vendor has applied for Change of User (as hereinafter defined) of the Land from single dwelling unit to multi dwelling units, which process will require surrender of the Title Deed in respect of the Land to enable issuance of a new title for the Land on or before the Practical Completion Date (as hereinafter defined).'),
  ]));

  // (D) Sale agreement recital
  out.push(makRecital([
    antiqua('Subject to this Agreement, the Vendor has agreed to sell, and the Purchaser has agreed to purchase the '), antiqua('Apartment(s)', { bold: true }), antiqua(' whose particulars are set out in Section II of the Schedule of Particulars, which is part of the Development in consideration of the '), antiqua('Purchase Price', { bold: true }), antiqua(' whose particulars are set out in Section III of the Schedule of Particulars, upon the terms and conditions set out below.'),
  ]));
  out.push(spacer());

  // ── NOW IT IS HEREBY AGREED ───────────────────────────────────────────────
  out.push(bodyPara([antiqua('NOW IT IS HEREBY AGREED as follows:', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DEFINITIONS AND INTERPRETATION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DEFINITIONS AND INTERPRETATION'));
  out.push(spacer());
  out.push(makSubC([antiqua('In this Agreement (including the recitals hereto) except where the context otherwise requires the following words and expressions shall have the following meanings:')]));
  out.push(spacer());

  // Helper: emit a definition at level 2 ("1.1.N")
  const def = (term, body) => {
    out.push(makSubC([
      antiqua(term, { bold: true }),
      antiqua(' means '),
      antiqua(body),
    ], 2));
  };

  // Definitions — RS3 verbatim, in order
  def('Anticipated Practical Completion Date', `${d.apcd_override || '8th May 2025'} being the anticipated date of issue by the Architect of a certificate of partial or sectoral practical completion confirming completion of all works in respect to the Development and “Practical Completion Certificate” shall be construed accordingly;`);
  def('Architect', 'TSAVO Architects Limited, of Post Office Box Number 15854-00509, Nairobi;');
  def('Architect’s Office', 'TSAVO Offices, Coral Bells Apartments, Thindigua, Nairobi;');
  def('Architectural Drawings', 'the Architect’s drawings for the Apartment(s) (including any revision of the drawings);');
  def('Ardhisasa', 'the National Land Information System, being an online Government platform operated by the Ministry of Lands and Physical Planning and responsible for management of online land transactions;');
  def('Building Plans', 'the registered building plan(s) for the Development approved by the relevant authorities which may be amended with approval from the relevant authorities from time to time;');
  def('Business Day', 'any day (other than Saturday, Sunday, national day or gazetted public holiday) on which banking institutions in Kenya are generally open for the conduct of banking business;');
  def('By-Laws', 'the by-laws specified under the Second Schedule of the Sectional Properties Regulations, 2021 subject to any amendments effected to the said By-Laws by the Vendor with respect to the Development;');

  // Change of User — composite definition with two sub-bullets
  out.push(makSubC([
    antiqua('Change of User', { bold: true }),
    antiqua(' means collectively:'),
  ], 2));
  out.push(bulletPara([antiqua('the approval for a formal change of user of the Land by the County Government of Nairobi to permit use of the Land for purposes of, inter alia, residential multi-dwelling apartment units, which has already been obtained by the Vendor; and')]));
  out.push(bulletPara([antiqua('the issuance of a new document of title for the Land by the Ministry of Lands and the National Land Commission (with the user endorsed as permitting, inter alia, residential multi-dwelling apartment units), which will be obtained by the Vendor in due course;')]));

  def('Common Property', 'all parts halls staircases and other access ways and areas on the Land and on the Development and includes the common parking areas, gardens and other amenities that are provided for the common use of the Purchaser and other occupiers or persons expressly or by implication authorized by them residing at the Development;');
  def('Corporation', 'the body corporate to be incorporated under the Sectional Properties Act to manage the Development and Corporation shall be construed to include the members of the Corporation;');
  def('Data Protection Act', 'the Data Protection Act No. 24 of 2019.');
  def('Data Protection Laws', 'together the Data Protection Act and the Data Protection Regulations (defined below).');
  def('Data Protection Regulations', 'together means the Data Protection (General) Regulations 2021, the Data Protection (Complaints Handling Procedure and Enforcement) Regulations 2021 and the Data Protection (Registration of Data Controllers and Processors) Regulations 2021.');
  def('Defects Liability Period', 'the period of six (6) months from and including the Anticipated Practical Completion Date (defined below) in which the Vendor is required to repair material defects that appear in the Apartment(s) subject to the provisions of Condition 2.7 below.');
  def('Development', `the Vendor’s development to be known as “${dev.name.toUpperCase()}” which shall be constructed to comprise twelve (12) floors consisting of studio, one-bedroom and Two Bedroom residential apartments together with social amenities like shops, food courts, gym, pathways, driveways, commercial center, parking spaces, gardens, and other usual amenities in accordance with the Building Plans and Architectural Drawings which are available for inspection at the Vendor’s offices.`);
  def('Land Act', 'the Land Act (Act No.6 of 2012);');
  def('Land Laws', 'together the Land Registration Act, the Land Act, the Sectional Properties Laws, any subsidiary legislation, rules and regulations promulgated thereunder, and any practice directions issued pursuant to the Land Act and the Land Registration Act;');
  def('Land Registration Act', 'the Land Registration Act (Act No. 3 of 2012);');
  def('Registrar', 'the relevant Land Registrar at the Lands Office, Nairobi;');

  // Sale Completion Date — anchored to APCD; 5 sub-conditions including Change of User
  out.push(makSubC([
    antiqua('Sale Completion Date', { bold: true }),
    antiqua(' means the date falling at least ninety (90) Business Days following the Anticipated Practical Completion Date (as defined above) subject to:'),
  ], 2));
  out.push(bulletPara([antiqua('all payment obligations of the Purchaser under this Agreement being satisfied in full;')]));
  out.push(bulletPara([antiqua('the Sectional Plan being duly registered at the Land Registry;')]));
  out.push(bulletPara([antiqua('the Sectional Title being issued in favour of the Vendor by the Land Registry with the Unit Factor endorsed thereon;')]));
  out.push(bulletPara([antiqua('the Change of User being completed by the Vendor; and')]));
  out.push(bulletPara([antiqua('the provisions of Condition 12 (Change in Law or Circumstances);')]));

  def('Sectional Plan', 'a geo-referenced plan of the Apartment prepared by a duly licensed surveyor, approved by the relevant County Government and registered with the relevant Land Registry;');
  def('Sectional Properties Act', 'the Sectional Properties Act (No.21 of 2020), Laws of Kenya;');
  def('Sectional Properties Regulations', 'the Sectional Properties Regulations, 2021 promulgated under the Sectional Properties Act;');
  def('Sectional Properties Laws', 'together the Sectional Properties Act and the Sectional Properties Regulations as amended from time to time;');
  def('Sectional Title(s)', 'a certificate of lease/title in respect to the Apartment registered under the Sectional Properties Laws;');
  def('Service Charge', 'a monthly sum that shall be payable after the Anticipated Practical Completion Date by the Purchaser to the Corporation subject to Condition 5.1 and the By-Laws, which Service Charge shall be utilized for purposes of managing the Development;');
  def('Unit Factor', 'a proportionate factor of ownership in the Corporation, determined in accordance with the Sectional Properties Laws; and');
  def('Vendor’s Advocates', 'the law firm of MAK & PARTNERS ADVOCATES 4th Floor, Victoria at Two Rivers, Two Rivers Development, Limuru Road, P.O Box 10644 - 00100, Nairobi, Kenya.');

  // 1.2 In this Agreement, reference to:
  out.push(makSubC([antiqua('In this Agreement, reference to:')]));
  out.push(makSubC([antiqua('the “Vendor” shall include any person to whom the Vendor’s interest in the Land (or any part thereof) is transferred or assigned;')], 2));
  out.push(makSubC([antiqua('a “party” or to “parties” shall mean a party or the parties to this Agreement.')], 2));

  // 1.3 Recitals
  out.push(makSubC([antiqua('The recitals form an integral part of this Agreement and shall have the same force and effect as if expressly set out in the body of this Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 2. THE VENDOR'S WORKS AND PRACTICAL COMPLETION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE VENDOR’S WORKS AND PRACTICAL COMPLETION'));
  out.push(spacer());

  // 2.1
  out.push(makSubC([antiqua('The Vendor has undertaken the construction of the Development substantially in accordance with the approved Building Plans and the Architectural Drawings.')]));

  // 2.2 — right to make revisions, with three sub-clauses
  out.push(makSubC([antiqua('Notwithstanding any other provisions in this Agreement, the Vendor shall have the right (in its reasonable discretion) to:')]));
  out.push(makSubC([antiqua(' make such revisions, variations or modifications to the Building Plans and the Architectural Drawings as the Vendor may require and which either:')], 2));
  out.push(makSubC([antiqua('will not affect the external facade to a material extent of the Development or the Apartment(s); or')], 2));
  out.push(makSubC([antiqua('are required for obtaining any necessary licenses or permissions or complying with any requirement made by any local or other authority; or')], 2));
  out.push(makSubC([antiqua('which the Vendor believes will improve the quality of accommodation or general appearance of the Development and/or the Apartment; and')], 2));
  out.push(makSubC([antiqua('to substitute materials and/or items as nearly as may be of the same quality and appearance in lieu of those contained or referred to in the Building Plans if it is deemed expedient by the Architect to ensure that the construction of the Development is not unduly delayed or where the materials and/or items are not readily available or cannot be obtained without extra cost (logistical, financial or otherwise) to the Vendor and to vary the works relating to the Development in such manner as may be necessary as a result of the use of such substituted materials and or items.')], 2));

  // 2.3
  out.push(makSubC([antiqua('The Purchaser shall not have the right to make variations to the design, layout or position of the Apartment and neither shall the Purchaser have the right to issue any instructions to the Vendor’s Architect.')]));

  // 2.4
  out.push(makSubC([antiqua('The Purchaser having inspected or been afforded the opportunity to inspect the Building Plans buys the Apartment with full knowledge in all respects of the condition thereof.')]));

  // 2.5
  out.push(makSubC([antiqua('Subject to the provisions of this Agreement, the Vendor shall use all reasonable endeavors to meet the Anticipated Practical Completion Date. Notwithstanding this provision, the Vendor shall notify the Purchaser of any delays in meeting the Anticipated Practical Completion Date at least three (3) months prior to the Anticipated Practical Completion Date and in such an event the Purchaser shall not be entitled to any damages or compensation.')]));

  // 2.6 — Defects Liability provisos
  out.push(makSubC([antiqua('The Vendor will (as between the Vendor and the Purchaser) ensure that any material defects in the Apartment(s) which shall appear within the Defects Liability Period shall be repaired at the Vendor’s cost provided always that:')]));
  out.push(makSubC([antiqua('the Purchaser has completed payment of the Purchase Price before or within the Defects Liability Period and has taken possession of the Apartment;')], 2));
  out.push(makSubC([antiqua('the Purchaser notifies the Vendor of the material defects that the Vendor is bound to repair within the Defects Liability Period; and')], 2));
  out.push(makSubC([antiqua('the Vendor shall only be bound to remedy those material defects notified to it in writing by the Purchaser within Defects Liability Period;')], 2));
  out.push(bodyPara([antiqua('and provided further that the Vendor shall not be liable to repair any material defects that relate to works undertaken by the Purchaser in fitting out the Apartment(s) on taking possession or any defects which shall comprise deterioration of decoration occasioned by ordinary wear and tear.')]));

  // 2.7 — Right of entry post-possession
  out.push(makSubC([antiqua('In the event that possession of the Apartment has been granted to the Purchaser in accordance with Condition 5.1, the Vendor shall have the right with servants, agents, workmen and independent contractors and their plant, machinery and materials to enter the Apartment(s) upon at least forty-eight (48) hours prior notice (save in cases of emergency when less or no notice may be appropriate) for carrying out such works as are referred to in Condition 2.6.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 3. THE PURCHASE PRICE AND OTHER PAYMENTS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE PURCHASE PRICE AND OTHER PAYMENTS'));
  out.push(spacer());

  // 3.1
  out.push(makSubC([antiqua('The Purchaser shall pay the Purchase Price free of set off, deduction or counterclaim on the terms set out in Section V of the Schedule of Particulars.')]));

  // 3.2 — Stage 1/2/3 legal fees
  out.push(makSubC([antiqua('the Purchaser shall pay legal fees and costs (as set out in the Schedule to this Agreement), with:')]));
  out.push(makSubC([antiqua('“Stage 1 costs” due and payable at the time of execution of this Agreement;')], 2));
  out.push(makSubC([antiqua('“Stage 2 costs” due and payable within thirty (30) days of completion of payment of the Purchase Price. The Purchaser hereby acknowledges and accepts that the Stage 2 costs indicated in this Agreement are estimated amounts and the Vendor reserves the right to adjust these costs at the time scheduled for payment on the basis of the prevailing rate of inflation and actual expenses being incurred by the Vendor and/or the Corporation after the Anticipated Practical Completion Date and as such the final Stage 2 costs due from the Purchaser will be determined and communicated at the time the Purchaser is due to make payment and;')], 2));
  out.push(makSubC([antiqua('“Stage 3 costs” due and payable on the Sale Completion Date. It is hereby agreed that:')], 2));

  // 3.3 — Utility and Georeferencing Costs
  out.push(makSubC([
    antiqua('In addition to the payment obligations set out in Condition 3.1 and 3.2 above, the Purchaser shall also pay to the Vendor the utility and georeferencing costs (the '),
    antiqua('Utility and Georeferencing Costs', { bold: true }),
    antiqua(') free of set off, deduction or counterclaim on the terms set out in Section VI of the Schedule of Particulars.'),
  ]));

  // 3.4 — Two sub-clauses on rental income and negotiation continuity
  out.push(makSubC([antiqua('It is hereby agreed that:')]));
  out.push(makSubC([antiqua('notwithstanding the negotiation period and/or the date of signing of this Agreement, the Purchasers will continue with their payment obligations under this Agreement. For avoidance of doubt, the payment obligations of the Purchasers shall not be suspended or avoided by any delay in the execution of this Agreement; and')], 2));
  out.push(makSubC([antiqua('the Vendor shall be entitled to possession of the Apartment and to collect all rental income generated from the Apartment after the Anticipated Practical Completion Date until full payment of the Balance of the Purchase Price is received by the Vendor and such rental income shall not be apportioned by the Purchasers towards settlement of the Purchase Price for any reason whatsoever')], 2));

  // 3.5 — Vendor bank account (verbatim layout)
  out.push(makSubC([antiqua('All payments to the Vendor shall be paid to the Vendors account bank account as advised.')]));
  const vb = pay.vendor_bank;
  out.push(definitionPara([antiqua(`ACCOUNT NAME: ${vb.account_name}`, { bold: true })]));
  out.push(definitionPara([antiqua(`ACCOUNT NO:     ${vb.account_number}`, { bold: true })]));
  out.push(definitionPara([antiqua(`BANK:  	                ${vb.bank_name}`, { bold: true })]));
  out.push(definitionPara([antiqua(`BRANCH:              ${vb.branch.toUpperCase()}`, { bold: true })]));
  out.push(definitionPara([antiqua(`BANK CODE:        ${vb.bank_code}`)]));
  out.push(definitionPara([antiqua(`BRANCH CODE:    ${vb.branch_code}`, { bold: true })]));
  out.push(definitionPara([antiqua(`SWIFT:                   ${vb.swift_code}`, { bold: true })]));
  out.push(definitionPara([antiqua(`PAYBILL:                ${vb.paybill_number}`, { bold: true })]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 4. OVERDUE PAYMENTS — 10-day grace, sole discretion
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('OVERDUE PAYMENTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('If the Purchaser fails to honor the Purchaser’s payment obligations to the Vendor including payment of the Balance in the manner provided in the Agreement, then:')]));
  out.push(makSubC([antiqua('if payment shall not have been effected within ten (10) days of the due date or such period as advised by the Vendor, then the Vendor may, in its sole discretion, (but without prejudice to any other right or remedy) elect to treat non-payment as a fundamental breach of the Purchaser’s obligations under this Agreement and the provisions of Section 6 shall apply.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 5. GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT'));
  out.push(spacer());

  // 5.1 Conditions for Possession
  out.push(makSubC([antiqua('Conditions for Possession', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([antiqua('Subject to payment of (i) the Purchase Price in full as provided for in Condition 3.1 and (ii) Stage 1 costs and Stage 2 costs in full as provided in Condition 3.1.1, the Vendor shall grant possession of the Apartment to the Purchaser upon the issuance of the Practical Completion Certificate and, for avoidance of doubt, in case the Purchaser is paying the Balance in installments extending beyond the Anticipated Practical Completion Date, the Purchaser shall not be entitled to possession of the Apartment or any rental income accruing from the Apartment until full payment of the Balance is received by the Vendor in accordance with this Agreement. Upon the handover of possession of the Apartment by the Vendor to the Purchaser (whether directly to the Purchaser or indirectly to the Purchaser’s tenant), the Purchaser shall with effect from the first calendar month of receiving possession of the Apartment be responsible and ensure to remit to the Vendor and/or the Corporation (as the case may be) the monthly Service Charge for the Apartment as and when it shall become due, whether formally demanded or not.')]));

  // 5.2 — Post-DLP inspection window
  out.push(makSubC([antiqua('Where the Purchaser is granted possession of the Apartment by the Vendor after the Defect Liability Period, then the Purchaser shall be afforded a period of thirty (30) days from the time of handover of the Apartment(s) to carry out an inspection of the Apartment(s) with the Vendor so as to agree on any reasonable repairs that may be required (if any) as a result of occupation by any tenant to return the Apartment(s) to a reasonable state of repair and condition, save for ordinary wear and tear.')]));

  // 5.3 — Apartment deemed sold
  out.push(makSubC([antiqua('Subject to Condition 5.1 and Condition 12, the Purchaser hereby acknowledges, confirms and agrees that the Apartment(s) will be deemed sold upon the terms and conditions of this Agreement, the Land Laws and any legal requirements under Kenyan law as at the Sale Completion Date.')]));

  // 5.4 — Private residence use
  out.push(makSubC([antiqua('The Purchaser agrees and acknowledges that subject to the conditions set in the By- Laws, the Purchaser shall use the Apartment for the purposes of a private residence and for no other purpose whatsoever.')]));

  // 5.5 — Sale completion at Vendor's Advocates
  out.push(makSubC([antiqua('The sale of the Apartment(s) shall be completed at the offices of the Vendor’s Advocates on the Sale Completion Date.')]));

  // 5.6 — Transfer instrument + 4 documents
  out.push(makSubC([
    antiqua('On the Sale Completion Date subject to Conditions 5.7 and 5.8 below, the Vendor shall issue an instrument of transfer (the '),
    antiqua('Transfer', { bold: true }),
    antiqua(') to the Purchaser (in a form drawn by the Vendor’s Advocates and provided to the Purchaser for review prior to the Sale Completion Date) and the Purchaser shall execute the Transfer and return the same to the Vendor’s Advocates together with:'),
  ]));
  out.push(makSubC([antiqua('copy of the National Identity Card or valid Passport or a Certificate of Incorporation (as the case maybe) of the Purchaser;')], 2));
  out.push(makSubC([antiqua('copy of a current dated CR12 company search of the Purchaser (if applicable);')], 2));
  out.push(makSubC([antiqua('copy of the tax PIN Certificate of the Purchaser; and')], 2));
  out.push(makSubC([antiqua('three (3) coloured passport photos of the Purchaser or the Director(s) and Secretary of the Purchaser (as the case maybe).')], 2));

  // 5.7 — Vendor responsible for Sectional Plan
  out.push(makSubC([antiqua('The Vendor shall be responsible for the registration of the Sectional Plan and upon completion of construction of the Development, the Vendor shall:')]));
  out.push(makSubC([antiqua('procure a duly licensed surveyor to undertake the process of geo-referencing and preparation of the Sectional Plan;')], 2));
  out.push(makSubC([antiqua('apply for registration of the Sectional Plan in accordance with the provisions of the Sectional Properties Laws; and')], 2));
  out.push(makSubC([antiqua('apply for registration of the Corporation in accordance with the Sectional Properties Laws.')], 2));

  // 5.8 The Corporation
  out.push(makSubC([antiqua('The Corporation', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('The Corporation shall be responsible for the management and administration of the Development and the Common Property subject to the provisions of the By-Laws. The membership rights in the Corporation shall be determined by the Unit Factor and upon registration of the Corporation, the Unit Factor shall be endorsed on the Sectional Title(s) as evidence of membership in the Corporation.')], 2));
  out.push(makSubC([antiqua('Subject to Condition 5.8.3, upon the initial registration of the Corporation, the Corporation shall adopt the By-Laws. Any amendments to the By-Laws of the Corporation (as the case may be) shall be made in accordance with the provisions of Sectional Properties Laws.')], 2));
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges that they shall be bound by the provisions of the By-Laws.')], 2));
  out.push(makSubC([antiqua('Subject to Condition 5.7.3, the Purchaser hereby acknowledges that they shall bear a proportionate share of the costs for registering the Corporation and its By-Laws.')], 2));

  // 5.9 — Registration of Transfer
  out.push(makSubC([antiqua('Subject to registration of the Sectional Plan, issuance of the Sectional Title(s) in favour of the Vendor and payment of “Stage 3 costs” (as specified Condition 3.1.4) which are due on the Sale Completion Date, the Vendor’s Advocates shall undertake the registration of the Transfer within a reasonable period of time taking into account any delays in registration that may occur at the Lands Office, Survey of Kenya or any other relevant national or county government office.')]));

  // 5.10 Completion Documents
  out.push(makSubC([antiqua('Completion Documents', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([antiqua('Upon registration, the Vendor’s Advocates shall release to the Purchaser the following:')]));
  out.push(makSubC([antiqua('original Sectional Title(s) for the Apartment(s) duly registered in favour of the Purchaser;')], 2));
  out.push(makSubC([antiqua('stamped and registered Transfer(s) of the Apartment(s) in favour of the Purchaser;')], 2));
  out.push(makSubC([antiqua('KRA payment e-slip in respect to payment of stamp duty on the Transfer(s);')], 2));
  out.push(makSubC([antiqua('certified copy of the Valuation for Stamp Duty Form (approved by the Government Valuer) for the Apartment(s);')], 2));
  out.push(makSubC([antiqua('certified copy of the Practical Completion Certificate;')], 2));
  out.push(makSubC([antiqua('certified copy of the certificate of registration of the Corporation;')], 2));
  out.push(makSubC([antiqua('certified copy of the registered By-Laws;')], 2));
  out.push(makSubC([antiqua('certified copy of the license from National Construction Authority in respect to the development;')], 2));
  out.push(makSubC([antiqua('certified copy of Occupational Certificate from the relevant County Government;')], 2));
  out.push(makSubC([antiqua('certified copy of the duly registered Sectional Plan in respect to the Apartment; and')], 2));
  out.push(makSubC([antiqua('certified copy of the license from the National Environmental Management Authority for the Development.')], 2));

  // 5.11 Property Management
  out.push(makSubC([antiqua('Property Management', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([
    antiqua('Upon grant of possession of the Apartment as provided under Condition 5.1, the Purchaser shall have the option of engaging '),
    antiqua('TSAVO LIFESTYLE LIMITED', { bold: true }),
    antiqua(' (the '),
    antiqua('Property Manager', { bold: true }),
    antiqua(') for the purposes of managing the Apartment on the Purchaser’s behalf, subject to the Purchaser and the Property Manager entering into a property management agreement.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TERMINATION OF AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('TERMINATION OF AGREEMENT'));
  out.push(spacer());
  out.push(makSubC([
    antiqua('Upon the occurrence of a breach of this Agreement, an injured party shall, prior to exercising their rights against a defaulting party, first attempt to address and resolve the breach with the defaulting party through good-faith negotiations for a period of thirty (30) days (the '),
    antiqua('Negotiation Period', { bold: true }),
    antiqua('). If for any reason such breach is unable to be resolved within the Negotiation Period then the injured party shall upon expiry of the Negotiation Period, be entitled to exercise their rights under this section.'),
  ]));

  out.push(makSubC([
    antiqua('Subject to Condition 6.1, if the Purchaser fails to comply with its obligations under this Agreement, the Vendor may give the Purchaser notice in writing to comply with its obligations (the '),
    antiqua('Vendor’s Default Notice', { bold: true }),
    antiqua(') and require the Purchaser to make good the default within thirty (30) days, time being of the essence. On the failure of the Purchaser to comply with the Vendor’s Default Notice the Vendor may, without prejudice to its other rights or remedies, terminate this Agreement by thirty (30) days’ notice in writing to the Purchaser (the '),
    antiqua('Vendor’s Termination Notice', { bold: true }),
    antiqua(') and upon expiry of the Vendor’s Termination Notice:'),
  ]));

  out.push(makSubC([antiqua('the Vendor shall, within ninety (90) days of the expiry of the Vendor’s Termination Notice, refund to the Purchaser the amount paid on account of the Purchase Price subject to deduction of all pending legal costs and thereafter this Agreement shall stand terminated and neither party shall have any claims against the other whether in tort, contract or otherwise;')], 2));

  out.push(makSubC([antiqua('prior to termination of this Agreement, the Purchaser may identify other persons to purchase the Apartment(s) on terms and conditions similar to this Agreement and if such new purchaser shall enter into an agreement with the Vendor for the purchase of the Apartment(s) at a price higher than the Purchase Price, then it is hereby agreed between the parties that the profit earned on the sale shall be paid to the Purchaser within thirty (30) days of completion of the sale of the Apartment(s) to the new purchaser; and')], 2));

  out.push(makSubC([antiqua('the Vendor shall be entitled to recover by action any amounts found to be due to the Vendor in the event of there being any deficiency.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 7. NOTICES AND COMMUNICATION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('NOTICES AND COMMUNICATION'));
  out.push(spacer());
  out.push(makSubC([
    antiqua('Any notice or other communication (hereinafter defined as a '),
    antiqua('Notice', { bold: true }),
    antiqua(') given or made under this Agreement shall be in writing by letter or email as follows:'),
  ]));
  out.push(bodyPara([antiqua('In the case of the Vendor, to:', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(definitionPara([antiqua(`Address: 	   ${v.company_name}`)]));
  out.push(definitionPara([antiqua('                         P.O. Box Number 15854-00509')]));
  out.push(definitionPara([antiqua('                         NAIROBI')]));
  out.push(definitionPara([antiqua(`		   Email: ${v.notice_email}`)]));
  out.push(spacer());
  out.push(bodyPara([antiqua('In the case of the Purchaser', { underline: { type: UnderlineType.SINGLE } }), antiqua(', to the address whose particulars are set out in Section I of the Schedule of Particulars.')]));
  out.push(bodyPara([antiqua('The details of the Alternative Contact of the Purchaser are set out in Section VII of the Schedule of Particulars. It is hereby acknowledged that the details of Alternative Contact provided above are solely intended for purposes of enabling prompt communication in the event that the Purchaser is not reachable for whatever reason and does not in any way impose any contractual obligation on the Alternative Contact under this Agreement.')]));
  out.push(makSubC([antiqua('Any Notice sent by post shall be deemed effective five (5) Business Days after posting upon proof that it was properly addressed to the recipient and put in the post while any Notice sent by email shall be deemed effective two (2) Business Days after emailing upon proof that it was properly emailed and successfully delivered to the recipient.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 8. FORCE MAJEURE
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('FORCE MAJEURE'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor will not be liable for any delays in construction as a consequence of any act, cause or event which:')]));
  out.push(makSubC([antiqua('was not within the control of the Vendor;')], 2));
  out.push(makSubC([antiqua('was not caused or precipitated by the Vendor’s negligence; and')], 2));
  out.push(makSubC([antiqua('could not have been prevented by the Vendor’s reasonable diligence, including without limitation:')], 2));
  out.push(bulletPara([antiqua('any Act of God, war, or hostilities (whether war be declared or not);')]));
  out.push(bulletPara([antiqua('any sabotage, riots or other act of civil disobedience, civil commotion, rebellion, act of a public enemy or invasions;')]));
  out.push(bulletPara([antiqua('international economic sanctions, blockade, embargo, any closing of borders, roads, rail links, airports, harbours, docks or other assistance to or adjuncts of the transport, shipping or navigation of, to or within a place;')]));
  out.push(bulletPara([antiqua('industry wide or country wide strikes or industrial action for a continuous period of seven (7) days and exceeding an aggregate period of thirty (30) days in any calendar year;')]));
  out.push(bulletPara([antiqua('any judicial actions, strikes, lockouts, industrial disputes, or actions of any such nature;')]));
  out.push(bulletPara([antiqua('any actions or inactions of any government or any agency or subdivision thereof;')]));
  out.push(bulletPara([antiqua('any act of terror;')]));
  out.push(bulletPara([antiqua('any changes in law or regulations affecting property construction and developments;')]));
  out.push(bulletPara([antiqua('any storms, floods or other inclement weather, earthquakes, subsidence, epidemics, pandemics, or other natural physical disasters;')]));
  out.push(bulletPara([antiqua('fire, accident, explosion, or shortage of labour; and')]));
  out.push(bulletPara([antiqua('any event or circumstances of a nature analogous to any of the foregoing triggered by facts and circumstances outside the control of the Vendor or the Purchaser.')]));
  out.push(bodyPara([
    antiqua('(hereinafter a “'),
    antiqua('Force Majeure Event', { bold: true }),
    antiqua('”).'),
  ]));
  // 8.2 — Note: source has trailing ".." (two dots) preserved verbatim
  out.push(makSubC([antiqua('The Vendor shall inform the Purchaser when a Force Majeure Event causes a significant delay in construction as soon as reasonably practicable and shall provide particulars of the probable material effect that the Force Majeure Event is likely to have on the performance of its obligations under this Agreement..')]));
  out.push(makSubC([antiqua('Notwithstanding the provisions of Condition 8.1, the obligations of the Purchaser to continue making payments to the Vendor in respect to the Purchase Price cannot be avoided or negated by the Purchaser claiming that any of the events or circumstances referred to in Condition 8.1 above have occurred unless evidence is provided by the Purchaser that the Force Majeure Event directly and adversely affects the Purchaser’s ability to pay.')]));
  out.push(makSubC([antiqua('Further to Condition 8.3, where a Force Majeure Event directly and adversely affects the Purchaser’s ability to pay thereby rendering it impossible for the Purchaser to fulfil their obligations under this Agreement during the subsistence of the Force Majeure Event, the Purchaser shall immediately notify the Vendor in writing and the parties shall engage in good faith negotiations to agree on an acceptable revised payment plan for the Purchase Price in accordance with Condition 6.1.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 9. WARRANTIES (plural — short three-warranty form, references Condition 17.3)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('WARRANTIES'));
  out.push(spacer());
  out.push(makSubC([antiqua('Without prejudice to the provisions of Condition 17.3 below, the Vendor warrants to the Purchaser that:')]));
  out.push(makSubC([antiqua('the Vendor is the registered legal and beneficial owner of the said Land and holds a clear and valid title to the Land;')], 2));
  out.push(makSubC([antiqua('the Vendor has the requisite power and authority to enter into and perform this Agreement; and')], 2));
  out.push(makSubC([antiqua('so far as the Vendor is aware, the Land is not in a buffer zone, road or forest reserve, riparian reserve, community land or public land.')], 2));
  out.push(makSubC([antiqua('The parties hereby agree that if any of the Warranties above is breached prior to the Anticipated Practical Completion Date then the provisions of Condition 6.3 shall apply.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 10. EXECUTORY AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('EXECUTORY AGREEMENT'));
  out.push(spacer());
  out.push(makSubC([antiqua('This Agreement is an executory agreement only and shall not operate or be deemed to operate as a lease of the Apartment(s).')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 11. VERIFICATION OF EXECUTION VIA LIVE AUDIO-VISUAL LINK
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('VERIFICATION OF EXECUTION VIA LIVE AUDIO-VISUAL LINK'));
  out.push(spacer());
  out.push(makSubC([
    antiqua('It is hereby agreed that for such period of time as the prevailing worldwide pandemic known as “Covid-19” or “Corona Virus Disease 2019” or “Coronavirus” shall serve to restrict or limit the physical witnessing and verification of execution of this Agreement by any party before a licensed Advocate, Judge, Magistrate, Commissioner for Oaths, Notary Public, Kenya Consular Officer or other authorized person specified under the Land Registration Act or other applicable legislation or regulation (hereinafter an '),
    antiqua('Authorized Person', { bold: true }),
    antiqua('), then the execution of this Agreement by any party may, without prejudice to the performance of the contractual rights and obligations of the respective parties, be verified by an Authorized Person during a live audio-visual link.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 12. CHANGES IN LAW OR CIRCUMSTANCES
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('CHANGES IN LAW OR CIRCUMSTANCES'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges, confirms and agrees that the sale of the Apartment(s) is subject always to any applicable changes in law or circumstances (including the Sectional Properties Act, if applicable) that may affect the form of title to be issued for the Apartments(s) and/or the provisions, rights and obligations of the respective parties under this Agreement and, if required, the Purchaser will execute such additional agreements and/or variations to this Agreement and pay such additional legal fees and/or costs as may be necessary to give effect to such changes in law or circumstances.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 13. DISPUTE RESOLUTION (NCIA two-tier)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DISPUTE RESOLUTION'));
  out.push(spacer());
  out.push(makSubC([antiqua('Any dispute, controversy or claim arising out of or relating to this Agreement or a termination thereof (including without prejudice to the generality of the foregoing, whether as to its interpretation, application or implementation), shall be resolved by way of consultation held in good faith between the parties. Such consultation shall begin immediately after one party has delivered to the other written request for such consultation. If within thirty (30) Business Days following the date on which such notice is given the dispute cannot be resolved amicably, the dispute, controversy or claim shall be submitted to a two-tier dispute resolution mechanism as follows:')]));
  out.push(makSubC([antiqua('once thirty (30) Business Days have elapsed and the dispute has not been resolved amicably, the parties shall refer the dispute to mediation at the Nairobi Center for International Arbitration (NCIA). The mediation shall take place in Nairobi in accordance with the Nairobi Centre for International Arbitration – Mediation Rules as at present in force; and')], 2));
  out.push(makSubC([antiqua('should the consultation and mediation process referred to in this Condition 13.1 fail to resolve the dispute then either party may refer the dispute to a Kenyan court of competent jurisdiction for hearing and determination of the dispute,')], 2));
  out.push(bodyPara([
    antiqua('PROVIDED ALWAYS THAT', { bold: true, underline: { type: UnderlineType.SINGLE } }),
    antiqua(' where a remedy exists under this Agreement to cater for the dispute concerned (be it an issue of interpretation, application or implementation), a party shall be obligated to adopt the agreed remedy available to the party under this Agreement.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 14. ANTI-MONEY LAUNDERING
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('ANTI-MONEY LAUNDERING'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser confirms that the monies utilized to pay the Purchase Price for the Apartment(s) and any other sums due from the Purchaser under this Agreement are not and shall not be from the proceeds of crime.')]));
  out.push(makSubC([antiqua('Failure by the Purchaser to adhere to the provisions of this clause shall be treated as a material breach of the provisions of this Agreement and if required by any Competent Authority shall entitle the Vendor, without prejudice to any other rights or remedies that the Vendor may have, to terminate this Agreement forthwith by issuance of written notice to that effect to the Purchaser and confiscate all monies paid by the Purchaser to the Vendor and submit such monies to the relevant Competent Authority or as required by law.')]));
  out.push(makSubC([antiqua('Furthermore, the Purchaser warrants to the Vendor that all deposits paid by the Purchaser to the Vendor in connection with the Purchase Price or and any other sums due from the Purchaser under this Agreement paid to the Vendor’s Advocates do not in any way contravene the Proceeds of Crime and Anti-Money Laundering Act, 2009 or the Proceeds of Crime and Anti-Money Laundering (Amendment) Act, 2021 or any other law in Kenya and hold the Vendor and the Vendor’s Advocates (as the case may be) fully indemnified against any claim or action arising out of a breach by the Purchaser of the aforementioned laws.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 15. DATA PROTECTION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DATA PROTECTION'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor hereby confirms to the Purchaser that all personal data given to the Vendor by the Purchaser and their Next of Kin under this Agreement shall be used in accordance with the Data Protection Laws.')]));
  out.push(makSubC([antiqua('By signing this Agreement, the Purchaser hereby consents to their personal data being collected and processed for the purposes of execution, performance and completion of this Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 16. COUNTERPARTS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('COUNTERPARTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('This Agreement may be executed in several counterparts, each of which will be deemed to be an original, but all of which, taken together, will constitute one and the same Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 17. GENERAL PROVISIONS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GENERAL PROVISIONS'));
  out.push(spacer());
  out.push(makSubC([antiqua('This Agreement is personal to the Purchaser and the Purchaser shall not be entitled to vary, assign, or novate this Agreement without the written consent of the Vendor and if such consent is given then it shall be subject to the following conditions:')]));
  out.push(makSubC([antiqua('a written variation, assignment or novation agreement to be drawn by the Vendor’s Advocates and signed by all parties including the Vendor; and')], 2));
  out.push(makSubC([antiqua('payment of an administration fee of Kenya Shillings Ten Thousand (Kshs.10,000/=) (inclusive of VAT) by the Purchaser, which shall be payable to the Vendor’s Advocates at the time of variation, assignment or novation.')], 2));
  out.push(makSubC([antiqua('In the case of individuals, if the Purchaser(s) passes away or becomes incapacitated during the term of this Agreement, then the Purchaser’s lawful representatives and/or heirs shall be the only parties recognized by the Vendor as capable of executing and/or benefitting from this Agreement and/or the Sectional Title(s). Where the Purchaser comprises more than one individual leaving behind other individual survivor(s) who are contracting parties, then the survivor(s) shall to all intents and purposes be recognized by the Vendor as the surviving contractual party under this Agreement and/or Sectional Title(s), subject to any legal process initiated by a deceased purchaser’s legal representatives under the Law of Succession Act (Cap.160).')]));
  out.push(makSubC([antiqua('The Purchaser acknowledges and admits that the Purchaser has entered into this Agreement on the basis of the Purchaser’s independent due diligence and not in reliance upon any representation made by or on behalf of the Vendor')]));
  out.push(makSubC([antiqua('Each of the provisions of this Agreement is severable and distinct from the others and if any one or more of these provisions is or becomes invalid illegal or unenforceable the validity legality and enforceability of the remaining provisions shall not in any way be affected or impaired.')]));
  out.push(makSubC([antiqua('Notwithstanding the grant of the Sectional Title(s), this Agreement shall remain in force with regard to any obligations or restrictions hereunder not provided for in the Sectional Title(s).')]));
  out.push(makSubC([antiqua('Each party shall meet its own tax obligations as required under law and any future tax obligations imposed under the law.')]));
  out.push(makSubC([antiqua('The Vendor’s obligations shall be limited to the contractual obligations and duties contained in this Agreement and any claim by the Purchaser against the Vendor in tort is hereby excluded.')]));
  out.push(makSubC([antiqua('Any liability of the Vendor to the Purchaser shall be limited to the Purchase Price, which would constitute a direct loss.')]));
  out.push(makSubC([antiqua('This Agreement constitutes the entire agreement between the parties and any representations, warranties, or statements, whether written, oral or implied, and whether made before or after this Agreement are excluded.')]));
  out.push(makSubC([antiqua('Each of the parties hereby agrees and confirms, for the purposes of the Law of Contract Act (Chapter 23, Laws of Kenya), the Land Act, 2012 and the Land Registration Act, 2012 that it, he or she has executed this Agreement with the intention to bind itself, himself or herself to the contents hereof.')]));
  out.push(makSubC([antiqua('This Agreement shall be governed and construed in accordance with Kenyan laws.')]));
  out.push(spacer());

  // ── IN WITNESS WHEREOF ───────────────────────────────────────────────────
  out.push(bodyPara([antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties hereto as of the day and year first before written.', { bold: true })]));
  out.push(spacer());
  out.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  return out;
};
