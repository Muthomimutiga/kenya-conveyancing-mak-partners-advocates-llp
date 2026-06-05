// ─────────────────────────────────────────────────────────────────────────────
// Royal Suburb 1 — Verbatim Document Body
// Source: AGREEMENT FOR SALE — ROYAL SUBURB APARTMENTS LIMITED (Phase 1)
// Reference: MAK source DOCX supplied by Ann Wayodi on 2026-05-13, plus the
//            audited per-project drafting rules at
//            scripts/drafting-rules/developer_sale_agreement__royal_suburb_1.md
//
// Rules (per memory/feedback_no_paraphrased_fallbacks.md):
//   - Every clause's text is verbatim from the MAK source. Dynamic placeholders
//     are interpolated ONLY where the matter genuinely varies (purchaser name,
//     ID, dates, prices, apartment number, etc.).
//   - Project-deterministic content (vendor company name, Co. Reg. No., title
//     number, development name, bank accounts) is pulled from
//     developer-projects.json so a single edit to the registry propagates.
//   - Do not rephrase. If MAK's source has a comma, we have a comma. If it
//     says "WARRANTY" not "WARRANTIES", we say "WARRANTY".
// ─────────────────────────────────────────────────────────────────────────────

module.exports = function buildBody({ project, d, helpers }) {
  const {
    antiqua, bodyPara, centeredPara, spacer, definitionPara, bulletPara,
    makClauseH, makSubC, makRecital, makParty,
    AlignmentType, UnderlineType, BorderStyle,
    Paragraph, PageBreak,
    numberInWords,
  } = helpers;

  // Convenience accessors
  const v = project.vendor;
  const land = project.land;
  const dev = project.development;
  const pay = project.payments;
  const purchaserName = d.purchaser_name || '[*]';

  const out = [];

  // ── HEADING & DATE LINE (centred, MAK house style) ────────────────────────
  out.push(centeredPara([antiqua('AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());
  out.push(centeredPara([
    antiqua('This Agreement is made on the……..day of……………………………..20……'),
  ]));
  out.push(spacer());

  // ── BETWEEN ───────────────────────────────────────────────────────────────
  out.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  out.push(spacer());

  // (1) Vendor — verbatim RS1 Vendor party paragraph
  out.push(makParty([
    antiqua(`${v.company_name}`, { bold: true }),
    antiqua(` (Company Registration Number ${v.company_registration_number}), a limited liability company incorporated in the Republic of Kenya having its registered office at Nairobi aforesaid whose postal address is ${v.po_box} (hereinafter called `),
    antiqua('"the Vendor"', { bold: true }),
    antiqua(' which expression shall where the context so admits include its successors and assigns) of the first part; and'),
  ]));

  // (2) Purchaser — verbatim
  out.push(makParty([
    antiqua('The '), antiqua('Purchaser', { bold: true }), antiqua(', being the person(s), whose particulars are set out in Section I of the Schedule of Particulars (which shall, where context allows, include the Purchaser’s successors in title, personal representatives, heirs and permitted assigns (as may be applicable) and where the Purchaser is more than one person, the Purchaser’s obligation shall be joint and several).'),
  ]));
  out.push(spacer());

  // ── WHEREAS recitals (RS1 verbatim) ───────────────────────────────────────
  out.push(bodyPara([antiqua('WHEREAS: -', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());

  // (A) Land recital — RS1 specific: freehold "legal owner" wording, geographic clause intact
  out.push(makRecital([
    antiqua(`The Vendor is the legal owner of `), antiqua('ALL THAT', { bold: true }), antiqua(` parcel of land situate in the city of Nairobi in Nairobi County of the Republic of Kenya known as ${land.title_number} (hereinafter collectively referred to as `),
    antiqua('"the Land"', { bold: true }),
    antiqua(').'),
  ]));

  // (B) Development recital — RS1 specific
  out.push(makRecital([
    antiqua(`The Vendor has constructed on the Land a development known as `),
    antiqua(`"${dev.name}"`, { bold: true }),
    antiqua(' (hereinafter referred to as '),
    antiqua('"the Development"', { bold: true }),
    antiqua(') in accordance with the Building Plans which are available for inspection at the Vendor’s offices.'),
  ]));

  // (C) Subdivision pending recital — RS1 specific
  out.push(makRecital([
    antiqua('Pending the process of subdivision and transfer of a portion of the Land as contemplated above, the Vendor has commenced and shall undertake the construction of the Development (as defined below) and the Change of User (as defined below) on the Land.'),
  ]));

  // (D) Sale agreement recital
  out.push(makRecital([
    antiqua('Subject to this Agreement, the Vendor has agreed to sell, and the Purchaser has agreed to purchase the '), antiqua('Apartment(s)', { bold: true }), antiqua(' whose particulars are set out in Section II of the Schedule of Particulars, which is part of the Development in consideration of the '), antiqua('Purchase Price', { bold: true }), antiqua(' whose particulars are set out in Section III of the Schedule of Particulars, upon the terms and conditions set out below.'),
  ]));
  out.push(spacer());

  // ── Agreement intro phrase — RS1 uses "AGREED AND CONFIRMED" not "NOW IT IS HEREBY AGREED"
  out.push(bodyPara([antiqua('IT IS HEREBY AGREED AND CONFIRMED', { bold: true, underline: { type: UnderlineType.SINGLE } }), antiqua(' by and between the parties hereto as follows:-')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DEFINITIONS AND INTERPRETATIONS (plural in RS1)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DEFINITIONS AND INTERPRETATIONS'));
  out.push(spacer());
  out.push(makSubC([antiqua('In this Agreement and in the Schedule hereto the following words and expressions (save where the context requires otherwise) bear the following meanings: -')]));
  out.push(spacer());

  // Helper: emit a definition at level 2 ("1.1.N")
  const def = (term, body) => {
    out.push(makSubC([
      antiqua(term, { bold: true }),
      antiqua(' means '),
      antiqua(body),
    ], 2));
  };

  // Definitions — RS1 verbatim, in order
  def('Architect', 'TSAVO ARCHITECTS LIMITED, a private limited liability company incorporated in the Republic of Kenya for the purposes hereof of Post Office Box Number 15854-00509, Nairobi; Coral Bells, Thindigua, Kiambu Road, Nairobi; Invest@tsavo.ke;');
  def('Architect’s Building Plans', 'the Vendor’s appointed Architect’s designs including floor plans, drawings and specifications relating to the construction of the Property prepared by the Vendor and the Vendor’s Architect and approved by the appropriate County authority(ies) as the same may be supplemented, replaced, added to or revised by the Vendor from time to time as provided herein, are available for inspection by the Purchaser at the offices of the Vendor and upon the execution of this Agreement, the Purchaser shall be deemed to have duly inspected and understood the said Architect’s Building Plans to the complete satisfaction of the Purchaser;');
  def('Ardhisasa', 'the National Land Information System, being an online Government platform operated by the Ministry of Lands and Physical Planning and responsible for management of online land transactions;');
  def('Vendor’s Office', 'Coral Bells, Thindigua, Kiambu Road, Nairobi; Invest@tsavo.ke;');
  def('Business Day', 'any day (other than Saturday, Sunday, national day or gazetted public holiday) on which banking institutions in Kenya are generally open for the conduct of banking business;');
  def('Common Property', 'all parts halls staircases and other access ways and areas on the Land and on the Development and includes the common parking areas, gardens and other amenities that are provided for the common use of the Purchaser and other occupiers or persons expressly or by implication authorized by them residing at the Development;');
  def('Corporation', 'the body corporate to be incorporated under the Sectional Properties Act to manage the Development and Corporation shall be construed to include the members of the Corporation;');
  def('Data Protection Act', 'the Data Protection Act No. 24 of 2019.');
  def('Data Protection Laws', 'together the Data Protection Act and the Data Protection Regulations (defined below).');
  def('Data Protection Regulations', 'together means the Data Protection (General) Regulations 2021, the Data Protection (Complaints Handling Procedure and Enforcement) Regulations 2021 and the Data Protection (Registration of Data Controllers and Processors) Regulations 2021.');
  def('Development', `the Vendor’s proposed development known as "${dev.name}" comprised of ${dev.unit_breakdown} constructed and maintained on the Land and identified in the Plans;`);
  def('Land Laws', 'together the Land Registration Act, the Land Act, the Sectional Properties Laws, any subsidiary legislation, rules and regulations promulgated thereunder, and any practice directions issued pursuant to the Land Act and the Land Registration Act;');
  def('Land Registration Act', 'the Land Registration Act (Act No. 3 of 2012);');
  def('Registrar', 'the relevant Land Registrar at the Lands Office, Nairobi;');

  // Sale Completion Date — RS1 verbatim, 4 sub-conditions
  out.push(makSubC([
    antiqua('Sale Completion Date', { bold: true }),
    antiqua(' means the date falling at least ninety (90) Business Days following the Anticipated Practical Completion Date (as defined above) subject to:'),
  ], 2));
  // The 4 sub-conditions — these are bullet-style inside the SCD definition, render as definitionPara
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

  // 1.2 Interpretation rules block
  out.push(makSubC([antiqua('In this agreement:')]));
  // 9 sub-points of interpretation
  out.push(makSubC([antiqua('Words importing the singular meaning where the context so admits include the plural meaning and vice versa.')], 2));
  out.push(makSubC([antiqua('Words of the neuter gender include the feminine and masculine genders and words denoting natural persons include corporations and firms and all such words shall be construed interchangeably in that manner.')], 2));
  out.push(makSubC([antiqua('the expression "person" shall include any legal or natural person, partnership, trust company, joint venture, agency, government or local authority department or other body (whether corporate or non-corporate);')], 2));
  out.push(makSubC([antiqua('any statute or any provision of any statute shall be deemed to refer to any statutory modification or re-enactment thereof and to any statutory instrument, order or regulation made thereunder or under any such re-enactment;')], 2));
  out.push(makSubC([antiqua('a document "in the agreed terms" or in "agreed form" shall mean in the form agreed by or on behalf of the parties and initialized by or on their behalf;')], 2));
  out.push(makSubC([antiqua('In this Agreement any reference to any document (including this Agreement) means that document as is supplemented, amended or varied from time to time in accordance with the terms thereof and (if applicable) hereof.')], 2));
  out.push(makSubC([antiqua('If the Purchaser is at any time more than one person their obligations shall be joint and several.')], 2));
  out.push(makSubC([antiqua('For the purposes of this Agreement, if a definition imposes substantive rights on a party to this Agreement, such rights and obligations shall be given effect to and shall be enforceable, notwithstanding that they are contained in a definition.')], 2));
  out.push(makSubC([antiqua('The recitals form an integral part of this Agreement and shall have the same force and effect as if expressly set out in the body of this Agreement and any reference to this Agreement shall include the recitals.')], 2));
  out.push(makSubC([antiqua('The parties acknowledge and agree that this Agreement has been jointly negotiated and drafted by all of the parties to it and that it is intended to benefit all of the parties equally.  Accordingly, neither this Agreement nor any of the provisions thereof shall be construed strictly against any of the parties.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // AGREEMENT TO SELL — RS1 has this as a standalone heading-style block
  // ─────────────────────────────────────────────────────────────────────────
  out.push(centeredPara([antiqua('AGREEMENT TO SELL', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());
  out.push(bodyPara([antiqua('Subject to the terms of this Agreement, the Vendor agrees to sell and the Purchaser agrees to buy the Apartment free from encumbrances.', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 2. THE VENDOR'S WORK (singular)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE VENDOR’S WORK'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Development has been constructed substantially in accordance with the approved Building Plans and the Architectural Drawings.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 3. GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT'));
  out.push(spacer());

  // 3.1 Conditions for Possession (sub-heading)
  out.push(makSubC([antiqua('Conditions for Possession', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([antiqua('Subject to payment of (i) the Purchase Price in full as provided for in Condition 4.1 and (ii) Stage 1 costs and Stage 2 costs in full as provided in Condition 4.1.4, the Vendor shall grant possession of the Apartment to the Purchaser upon the issuance of the Practical Completion Certificate and, for the avoidance of doubt, in case the Purchaser is paying the Balance in instalments extending beyond the Anticipated Practical Completion Date, the Purchaser shall not be entitled to possession of the Apartment or any rental income accruing from the Apartment until full payment of the Balance is received by the Vendor in accordance with this Agreement. Upon the handover of possession of the Apartment by the Vendor to the Purchaser (whether directly to the Purchaser or indirectly to the Purchaser’s tenant), the Purchaser shall with effect from the first calendar month of receiving possession of the Apartment be responsible and ensure to remit to the Vendor and/or the Corporation (as the case may be) the monthly Service Charge for the Apartment as and when it shall become due, whether formally demanded or not.')]));

  out.push(makSubC([antiqua('Where the Purchaser is granted possession of the Apartment by the Vendor after the Defect Liability Period, then the Purchaser shall be afforded a period of thirty (30) days from the time of handover of the Apartment(s) to carry out an inspection of the Apartment(s) with the Vendor so as to agree on any reasonable repairs that may be required (if any) as a result of occupation by any tenant to return the Apartment(s) to a reasonable state of repair and condition, save for ordinary wear and tear.')]));

  out.push(makSubC([antiqua('Subject to Condition 3.1 and Condition 14, the Purchaser hereby acknowledges, confirms and agrees that the Apartment(s) will be deemed sold upon the terms and conditions of this Agreement, the Land Laws and any legal requirements under Kenyan law as at the Sale Completion Date.')]));

  out.push(makSubC([antiqua('The Purchaser agrees and acknowledges that subject to the conditions set in the By-Laws, the Purchaser shall use the Apartment for the purposes of a private residence and for no other purpose whatsoever.')]));

  out.push(makSubC([antiqua('The sale of the Apartment(s) shall be completed at the offices of the Vendor’s Advocates on the Sale Completion Date.')]));

  out.push(makSubC([
    antiqua('On the Sale Completion Date subject to Conditions 3.7 and 3.8 below, the Vendor shall issue an instrument of transfer (the '),
    antiqua('Transfer', { bold: true }),
    antiqua(') to the Purchaser (in a form drawn by the Vendor’s Advocates and provided to the Purchaser for review prior to the Sale Completion Date) and the Purchaser shall execute the Transfer and return the same to the Vendor’s Advocates together with:'),
  ]));
  // 3.6.1 - 3.6.4 (the four documents)
  out.push(makSubC([antiqua('copy of the National Identity Card or valid Passport or a Certificate of Incorporation (as the case maybe) of the Purchaser;')], 2));
  out.push(makSubC([antiqua('copy of a current dated CR12 company search of the Purchaser (if applicable);')], 2));
  out.push(makSubC([antiqua('copy of the tax PIN Certificate of the Purchaser; and')], 2));
  out.push(makSubC([antiqua('three (3) coloured passport photos of the Purchaser or the Director(s) and Secretary of the Purchaser (as the case maybe).')], 2));

  // 3.7 Vendor responsible for Sectional Plan
  out.push(makSubC([antiqua('The Vendor shall be responsible for the registration of the Sectional Plan and upon completion of construction of the Development, the Vendor shall:')]));
  out.push(makSubC([antiqua('procure a duly licensed surveyor to undertake the process of geo-referencing and preparation of the Sectional Plan;')], 2));
  out.push(makSubC([antiqua('apply for registration of the Sectional Plan in accordance with the provisions of the Sectional Properties Laws; and')], 2));
  out.push(makSubC([antiqua('apply for registration of the Corporation in accordance with the Sectional Properties Laws.')], 2));

  // 3.8 The Corporation
  out.push(makSubC([antiqua('The Corporation', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('The Corporation shall be responsible for the management and administration of the Development and the Common Property subject to the provisions of the By-Laws. The membership rights in the Corporation shall be determined by the Unit Factor and upon registration of the Corporation, the Unit Factor shall be endorsed on the Sectional Title(s) as evidence of membership in the Corporation.')], 2));
  out.push(makSubC([antiqua('Subject to Condition 3.8.3, upon the initial registration of the Corporation, the Corporation shall adopt the By-Laws. Any amendments to the By-Laws of the Corporation (as the case may be) shall be made in accordance with the provisions of Sectional Properties Laws.')], 2));
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges that they shall be bound by the provisions of the By-Laws.')], 2));
  out.push(makSubC([antiqua('Subject to Condition 3.7.3, the Purchaser hereby acknowledges that they shall bear a proportionate share of the costs for registering the Corporation and its By-Laws.')], 2));

  // 3.9 Registration of Transfer
  out.push(makSubC([antiqua('Subject to registration of the Sectional Plan, issuance of the Sectional Title(s) in favour of the Vendor and payment of "Stage 3 costs" which are due on the Sale Completion Date, the Vendor’s Advocates shall undertake the registration of the Transfer within a reasonable period of time taking into account any delays in registration that may occur at the Lands Office, Survey of Kenya or any other relevant national or county government office.')]));

  // 3.10 Completion Documents (sub-heading + 11 items)
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

  // 3.11 Property Management
  out.push(makSubC([antiqua('Property Management', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([
    antiqua('Upon grant of possession of the Apartment as provided under Condition 3.1, the Purchaser shall have the option of engaging '),
    antiqua('TSAVO LIFESTYLE LIMITED', { bold: true }),
    antiqua(' (the '),
    antiqua('Property Manager', { bold: true }),
    antiqua(') for the purposes of managing the Apartment on the Purchaser’s behalf, subject to the Purchaser and the Property Manager entering into a property management agreement.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 4. THE PURCHASE PRICE AND OTHER PAYMENTS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE PURCHASE PRICE AND OTHER PAYMENTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser shall pay the Purchase Price free of set off, deduction or counterclaim on the terms set out in Section V of the Schedule of Particulars.')]));

  // 4.2 Lump sum option — RS1 specific lump-sum provision
  out.push(makSubC([antiqua('The Purchaser is at liberty to make lump-sum payments to offset the Balance due to the Vendor at any time, provided that, at the time of payment of any lump sum amount, the Purchaser is and remains up to date on the Purchaser’s existing payment obligations under Condition 4.1. For the avoidance of doubt, the Purchaser acknowledges that this Condition does not in any way allow for a lump sum payment plan that is subject to finance from a third-party lender with a condition that the Sectional Title and lender’s security be registered prior to payment by such lender; and')]));

  // 4.3 Legal fees in 3 stages
  out.push(makSubC([antiqua('the Purchaser shall pay legal fees and costs (as set out in the Schedule to this Agreement), payable in three (3) stages as follows:')]));
  out.push(makSubC([antiqua('"Stage 1 costs" due and payable on execution of this Agreement;')], 2));
  out.push(makSubC([antiqua('"Stage 2 costs" due and payable within thirty (30) days of completion of payment of the Purchase Price. The Purchaser hereby acknowledges and accepts that the Stage 2 costs indicated in this Agreement are estimated amounts and the Vendor reserves the right to adjust these costs at the time scheduled for payment on the basis of the prevailing rate of inflation and actual expenses being incurred by the Vendor and/or the Corporation after the Anticipated Practical Completion Date and as such the final Stage 2 costs due from the Purchaser will be determined and communicated at the time the Purchaser is due to make payment and;')], 2));
  out.push(makSubC([antiqua('"Stage 3 costs" due and payable on the Sale Completion Date. It is hereby agreed that:')], 2));

  // 4.4 Bank account for vendor payments — verbatim banking details from project registry
  out.push(makSubC([antiqua('All payments to the Vendor shall be paid to the following bank account:')]));
  const vb = pay.vendor_bank;
  out.push(definitionPara([antiqua(`Name: ${vb.account_name}`)]));
  out.push(definitionPara([antiqua(`Bank Name: ${vb.bank_name}`, { bold: true })]));
  if (vb.branch) out.push(definitionPara([antiqua(`Branch: ${vb.branch}`, { bold: true })]));
  out.push(definitionPara([antiqua(`Account No.: ${vb.account_number}`, { bold: true })]));
  out.push(definitionPara([antiqua(`Swift code: ${vb.swift_code}`)]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 5. OVERDUE PAYMENTS — RS1 specific 60-day grace
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('OVERDUE PAYMENTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('If the Purchaser fails to honour the Purchaser’s payment obligations to the Vendor, then:')]));
  out.push(makSubC([antiqua('if payment shall not have been effected within sixty (60) days of the due date, then the Vendor may (but without prejudice to any other right or remedy) elect to treat non-payment as a fundamental breach of the Purchaser’s obligations under this Agreement and the provisions of Clause 6 shall apply.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TERMINATION OF THIS AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('TERMINATION OF THIS AGREEMENT'));
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

  out.push(makSubC([antiqua('The Vendor shall, within ninety (90) days of the expiry of the Vendor’s Termination Notice, refund to the Purchaser the amount paid on account of the Purchase Price subject to deduction of all pending legal costs on the date of termination of this Agreement and thereafter this Agreement shall stand terminated and neither party shall have any claims against the other whether in tort, contract or otherwise;')], 2));

  out.push(makSubC([antiqua('prior to termination of this Agreement, the Purchaser may identify other persons to purchase the Apartment(s) on terms and conditions similar to this Agreement and if such new purchaser shall enter into an agreement with the Vendor for the purchase of the Apartment(s) at a price higher than the Purchase Price, then it is hereby agreed between the parties that the profit earned on the sale shall be paid to the Purchaser within thirty (30) days of completion of the sale of the Apartment(s) to the new purchaser; and')], 2));

  out.push(makSubC([antiqua('the Vendor shall be entitled to recover by action any amounts found to be due to the Vendor in the event of there being any deficiency.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 7. FORCE MAJEURE
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('FORCE MAJEURE'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor shall not be liable in respect of any delay in performing or failure to perform any of its obligations hereunder in consequence of any act, cause or event which:')]));
  out.push(makSubC([antiqua('was not within its control;')], 2));
  out.push(makSubC([antiqua('was not caused or precipitated by its negligence; and')], 2));
  out.push(makSubC([antiqua('could not have been prevented by the Vendor’s reasonable diligence, including without limitation:')], 2));
  // Sub-list (level 3 effectively — we'll render as definitionPara with indent)
  out.push(bulletPara([antiqua('any Act of God, war or hostilities (whether war be declared or not);')]));
  out.push(bulletPara([antiqua('any sabotage, riots or other acts of civil disobedience, civil commotion, rebellion, act of a public enemy or invasions;')]));
  out.push(bulletPara([antiqua('any judicial actions, strikes, lockouts, industrial disputes or actions of any such nature;')]));
  out.push(bulletPara([antiqua('any actions or inactions of any government or any agency or subdivision thereof;')]));
  out.push(bulletPara([antiqua('any act of terror;')]));
  out.push(bulletPara([antiqua('any storms, floods or other inclement weather, earthquakes, subsidence, epidemics or other natural physical disasters; and')]));
  out.push(definitionPara([antiqua('fire, accident or explosion')]));

  out.push(makSubC([
    antiqua('The Vendor shall promptly notify the Purchaser (the '),
    antiqua('Force Majeure Notice', { bold: true }),
    antiqua(') when such circumstances cause a delay in performance, failure in performance or failure in adequate performance and when they cease so to do. The Purchaser undertakes to continue with its performance of obligations under this Agreement immediately the Force Majeure event ceases. If such circumstances continue for more than six (6) months after the date of the Force Majeure Notice, either Party may terminate this Agreement but without prejudice to any accrued rights the Vendor may have against the Purchaser but subject to this agreement. Any payment obligations arising during the subsistence of the Force Majeure event shall be deemed to be suspended.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 8. WARRANTY (singular in RS1)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('WARRANTY'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor warrants to the Purchaser that it has a good and indefeasible title to the Land and that its ownership thereof is not subject to any challenge whatsoever.')]));
  out.push(makSubC([antiqua('To the best of the Vendor’s knowledge, there are no third party rights over the Land.')]));
  out.push(makSubC([antiqua('The Vendor has the legal capacity to enter into and to perform and observe the terms of this Agreement.')]));
  out.push(makSubC([antiqua('The Property is not on a buffer zone, road reserve, riparian reserve or public land and the ownership thereof is not subject to any challenge whatsoever from the Government of Kenya, County Government of Nairobi, any authority or any third party whatsoever;')]));
  out.push(makSubC([antiqua('The use to which the Property is being put is authorized under or pursuant to the Physical and Land Use Planning Act and any relevant by-laws, building legislation, public health act requirements and other relevant legislation. The permission, consents, approvals and licenses authorising the use of the Property is unconditional and permanent.')]));
  out.push(makSubC([antiqua('The Vendor is not engaged in nor threatened by any litigation, arbitration or administrative proceedings relating to the Land.')]));
  out.push(makSubC([antiqua('There is no adverse claim on the Land or dispute regarding ownership, boundary, easement, rights of way or any such matters.')]));
  out.push(makSubC([antiqua('The Vendor has not given any rights of way, easement or any overriding interest and has no intention of so doing.')]));
  out.push(makSubC([antiqua('The Vendor hereby undertakes to disclose to the Purchaser anything which is or may be inconsistent with any of the warranties or representations, immediately it comes to its notice.')]));
  out.push(makSubC([antiqua('so far as the Vendor is aware, there are and have been no boundary disputes relating to or regarding the Land; and')]));
  out.push(makSubC([antiqua('dimensions and areas of Land as set out in the document of title are true, accurate and correct.')]));
  out.push(makSubC([antiqua('The Vendor will disclose in writing to the Purchaser any event or circumstance which may arise or become known to it after the date of this Agreement and prior to the Practical Completion Date which is inconsistent with any of the Warranties or which had it occurred on or before the date of this Agreement would have constituted a breach of the Warranties or which is material to be known by a purchaser for value of the Apartment.')]));
  out.push(makSubC([antiqua('The parties hereby agree that if any of the Warranties above is breached prior to the Practical Completion Date then the breach shall be construed accordingly and the provisions of clause 7.3 may apply.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 9. THE LAW SOCIETY CONDITIONS FOR SALE (2015) — RS1 only
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE LAW SOCIETY CONDITIONS FOR SALE (2015)'));
  out.push(spacer());
  out.push(bodyPara([antiqua('The Law Society of Kenya Conditions of Sale will apply to this Agreement and shall be deemed incorporated herein in extensor save in so far as the LSK Conditions are not inconsistent with the provisions of this Agreement or are varied or excluded by the terms of this Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 10. CHANGE OF LAND LAWS — RS1's name for this clause
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('CHANGE OF LAND LAWS'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges, confirms and agrees that the sale of the Apartment(s) is subject always to any applicable changes in law or circumstances (including the Sectional Properties Act, if applicable) that may affect the form of title to be issued for the Apartments(s) and/or the provisions, rights and obligations of the respective parties under this Agreement and, if required, the Purchaser will execute such additional agreements and/or variations to this Agreement and pay such additional legal fees and/or costs as may be necessary to give effect to such changes in law or circumstances.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 11. NOTICE (singular in RS1)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('NOTICE'));
  out.push(spacer());
  out.push(makSubC([antiqua('In this Clause:', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([
    antiqua('Any notice or other communication (hereinafter defined as a '),
    antiqua('Notice', { bold: true }),
    antiqua(') given or made under this Agreement shall be in writing by email and letter sent by post under Certificate of Service or by courier or served personally as follows:'),
  ]));
  out.push(bodyPara([antiqua('In the case of the Vendor, to:', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(definitionPara([antiqua(`Address: ${v.notice_address}`)]));
  out.push(definitionPara([antiqua(`Email: ${v.notice_email}`)]));
  out.push(spacer());
  out.push(bodyPara([antiqua('In the case of the Purchaser', { underline: { type: UnderlineType.SINGLE } }), antiqua(', to the address whose particulars are set out in Section I of the Schedule of Particulars.')]));
  out.push(bodyPara([antiqua('The details of the Alternative Contact of the Purchaser are set out in Section VII of the Schedule of Particulars. It is hereby acknowledged that the details of Alternative Contact provided above are solely intended for purposes of enabling prompt communication in the event that the Purchaser is not reachable for whatever reason and does not in any way impose any contractual obligation on the Alternative Contact under this Agreement. Notice given to one of the Purchaser shall be notice to all the Co-Purchaser.')]));
  out.push(makSubC([antiqua('Any Notice sent by post shall be deemed effective five (5) Business Days after posting upon proof that it was properly addressed to the recipient and put in the post while any Notice sent by email shall be deemed effective two (2) Business Days after emailing upon proof that it was properly emailed and successfully delivered to the recipient.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 12. ANTI-MONEY LAUNDERING
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('ANTI-MONEY LAUNDERING'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser confirms that the monies utilized to pay the Purchase Price for the Apartment(s) and any other sums due from the Purchaser under this Agreement are not and shall not be from the proceeds of crime.', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('Failure by the Purchaser to adhere to the provisions of this clause shall be treated as a material breach of the provisions of this Agreement and if required by any Competent Authority shall entitle the Vendor, without prejudice to any other rights or remedies that the Vendor may have, to terminate this Agreement forthwith by issuance of written notice to that effect to the Purchaser and confiscate all monies paid by the Purchaser to the Vendor and submit such monies to the relevant Competent Authority or as required by law.')]));
  out.push(bodyPara([antiqua('Furthermore, the Purchaser warrants to the Vendor that all deposits paid by the Purchaser to the Vendor in connection with the Purchase Price or and any other sums due from the Purchaser under this Agreement paid to the Vendor’s Advocates do not in any way contravene the Proceeds of Crime and Anti-Money Laundering Act, 2009 or the Proceeds of Crime and Anti-Money Laundering (Amendment) Act, 2021 or any other law in Kenya and hold the Vendor and the Vendor’s Advocates (as the case may be) fully indemnified against any claim or action arising out of a breach by the Purchaser of the aforementioned laws.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 13. DATA PROTECTION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DATA PROTECTION'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor hereby confirms to the Purchaser that all personal data given to the Vendor by the Purchaser and their Next of Kin under this Agreement shall be used in accordance with the Data Protection Laws.', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('By signing this Agreement, the Purchaser hereby consents to their personal data being collected and processed for the purposes of execution, performance and completion of this Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 14. GENERAL CONDITIONS — RS1 contains the arbitration dispute resolution here
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GENERAL CONDITIONS'));
  out.push(spacer());
  out.push(makSubC([antiqua('This agreement is personal to the purchaser and the Purchaser shall not assign or transfer this agreement to any third party without the written consent of the Vendor.')]));
  out.push(makSubC([antiqua('The Purchaser shall pay a fee of an amount equivalent to 3% (Three Per Cent) of the Purchase Price payable by the new Purchaser to the Vendor in respect of the resale of the Property should the Vendor approve the sale.')]));
  out.push(makSubC([antiqua('No immaterial error or omission or misstatement in this Agreement or in any Plan of the Development or the Apartment referred to in this Agreement or in any statement made by any person prior to the making of this Agreement shall in any way affect the obligations of the Purchaser or the Vendor under this Agreement or entitle the Purchaser to damages or compensation.')]));
  out.push(makSubC([antiqua('Save as provided herein time shall be deemed to be of the essence to this Agreement.')]));
  out.push(makSubC([antiqua('Notwithstanding the grant of the Sectional Title(s), this Agreement shall remain in force with regard to any obligations or restrictions hereunder not provided for in the Sectional Title(s).')]));
  out.push(makSubC([antiqua('The Purchaser agrees and confirms that:')]));
  out.push(makSubC([antiqua('The Purchaser enters into this Agreement solely as a result of searches, surveys and inspections that the Purchaser has carried out and on the basis of the terms of this Agreement and not in reliance upon any representation either written or oral or implied or made by or on behalf of the Vendor; and')], 2));
  out.push(makSubC([antiqua('This Agreement constitutes the whole agreement between the parties hereto relating to the sale and purchase of the Apartment and supersedes and extinguishes any prior agreements undertakings representations warranties and arrangements of any nature whatsoever whether or not in writing relating to the sale and purchase of the Apartment.')], 2));
  out.push(makSubC([antiqua('If any term or condition of this Agreement shall to any extent be found or held to be invalid or unenforceable, the parties shall negotiate in good faith to amend such term or condition so as to be valid and enforceable and to be construed with the interests of the parties as contained herein. No amendments or modification of this Agreement shall be valid or binding on any party unless the same:', { underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('is made in writing;')], 2));
  out.push(makSubC([antiqua('refers expressly to this Agreement; and')], 2));
  out.push(makSubC([antiqua('is signed by the party concerned or its or their duly authorized representative')], 2));
  out.push(makSubC([antiqua('Each of the provisions of this Agreement is severable and distinct from the others and, if at any time one or more of these provisions is or becomes invalid, illegal or unenforceable, the validity, legality and enforceability of the remaining provisions shall not in any way be affected or impaired.')]));
  out.push(makSubC([antiqua('The construction, validity and performance of this Agreement shall be governed by and construed in accordance with the laws of Kenya.')]));
  // 14.10 — first part of dispute resolution
  out.push(makSubC([antiqua('Any dispute, controversy or claim arising out of or relating to this Agreement or termination hereof (including without prejudice to the generality of the foregoing, whether as to its interpretation, application or implementation), shall be resolved by way of consultation held in good faith between the parties. Such consultation shall begin immediately after one party has delivered to the other written request for such consultation. If within thirty (30) Business Days following the date on which such notice is given the dispute cannot be resolved amicably, the dispute, controversy or claim shall be submitted to arbitration in accordance with Sub-Clause 16.11.')]));
  // 14.11 — arbitration mechanics (CIArb Kenya, RS1 specific)
  out.push(makSubC([antiqua('Should any dispute, controversy or claim arise between the parties and the consultation process referred to in Sub-Clause 16.10 shall have not resolved such dispute, the dispute shall upon application by any party be referred for arbitration to a person acceptable to the parties or if the parties cannot agree on the appointment of such person within a period of thirty (30) days from the date of such application, then the dispute shall be referred to arbitration by a single arbitrator to be appointed by the Chairman for the time being of the Chartered Institute of Arbitrators, Kenya Branch upon the written request of either party. The appointment of the arbitrator shall be final and binding on the parties. The arbitration shall take place in Nairobi and the language of arbitration shall be English. The arbitration shall be conducted in accordance with the rules or procedures for arbitration under the Arbitration Act, 1995. The decision of the arbitrator shall be final and binding on the parties and may be made an order of a court of competent jurisdiction.')]));
  // 14.12
  out.push(makSubC([antiqua('Each of the parties hereby agree and confirm, for the purpose of the Law of Contract Act (Chapter 23, Laws of Kenya) the Land Act and the Land Registration Act, 2012 that it, he or she has executed this agreement with the intention to bind itself, himself or herself to the contents hereof.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 15. EXECUTORY AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('EXECUTORY AGREEMENT'));
  out.push(spacer());
  out.push(makSubC([antiqua('This Agreement is an executory agreement only and shall not operate or be deemed to operate as a lease of the Apartment(s).')]));
  out.push(spacer());

  // ── IN WITNESS WHEREOF ───────────────────────────────────────────────────
  out.push(bodyPara([antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties hereto as of the day and year first before written.', { bold: true })]));
  out.push(spacer());
  out.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  return out;
};
