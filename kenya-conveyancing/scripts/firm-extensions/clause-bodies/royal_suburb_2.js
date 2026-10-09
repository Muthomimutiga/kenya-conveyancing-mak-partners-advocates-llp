// ─────────────────────────────────────────────────────────────────────────────
// Royal Suburb Phase 2 — Verbatim Document Body
// Source: AGREEMENT FOR SALE — ROYAL SUBURB PHASE 2 LIMITED
// Reference: MAK source DOCX supplied by Ann Wayodi on 2026-05-13
//            (_mak_source_templates/AGREEMENT FOR SALE-ROYAL SUBURBS 2.docx).
//
// Distinctive features of this template (vs RS1 / Skywalk):
//   - Construction COMPLETE; new title with Change of User already issued
//   - Title Long Stop Date anchored at 60 Business Days post-PCD (not 90)
//   - 6-month Defects Liability Period
//   - Vendor executes via Power of Attorney
//   - Land is LEASEHOLD from the Government of Kenya of Title 138/1333
//     (area 0.2024 ha, original 1012/47/1/8, LSP 317244, IR 8126/28)
//   - DISPUTE RESOLUTION via NCIA mediation → court (not arbitration)
//   - Banks: NCBA Ciata Mall (Vendor) / NCBA Kakamega (MAK Advocates)
//   - WARRANTY (singular) — long form
//   - Includes COVID live audio-visual link clause
//
// Rules (per memory/feedback_no_paraphrased_fallbacks.md):
//   - Every clause's text is VERBATIM from the MAK source. Dynamic placeholders
//     interpolated only where the matter genuinely varies (purchaser name, ID,
//     dates, prices, apartment number).
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
    AlignmentType, UnderlineType,
    Paragraph, PageBreak,
  } = helpers;

  const v = project.vendor;
  const land = project.land;
  const dev = project.development;
  const pay = project.payments;
  const purchaserName = d.purchaser_name || '[*]';

  const out = [];

  // ── HEADING & DATE LINE (centred, MAK house style) ───────────────────────
  out.push(centeredPara([antiqua('AGREEMENT FOR SALE', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());
  out.push(centeredPara([
    antiqua('This Agreement is made on the………day of……………………………..20……'),
  ]));
  out.push(spacer());

  // ── BETWEEN ───────────────────────────────────────────────────────────────
  out.push(bodyPara([antiqua('BETWEEN:', { bold: true })]));
  out.push(spacer());

  // (1) Vendor party — RS2 verbatim
  out.push(makParty([
    antiqua(`${v.company_name}`, { bold: true }),
    antiqua(` (Company Registration Number ${v.company_registration_number}.), a limited liability company incorporated in the Republic of Kenya having its registered office at Nairobi aforesaid whose postal address is ${v.po_box} (hereinafter called `),
    antiqua('"the Vendor"', { bold: true }),
    antiqua(' which expression shall where the context so admits include its successors and assigns) of the first part; and'),
  ]));

  // (2) Purchaser party — verbatim
  out.push(makParty([
    antiqua('The '), antiqua('Purchaser', { bold: true }), antiqua(', being the person(s), whose particulars are set out in Section I of the Schedule of Particulars (which shall, where context allows, include the Purchaser’s successors in title, personal representatives, heirs and permitted assigns (as may be applicable) and where the Purchaser is more than one person, the Purchaser’s obligation shall be joint and several).'),
  ]));
  out.push(spacer());

  // ── WHEREAS recitals ──────────────────────────────────────────────────────
  out.push(bodyPara([antiqua('WHEREAS: -', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(spacer());

  // (A) Land recital — RS2: leasehold from Govt of Kenya of Title 138/1333
  out.push(makRecital([
    antiqua(`The Vendor is registered as proprietor as lessee from the Government of Kenya of `), antiqua('ALL THAT', { bold: true }), antiqua(` property known as Title No ${land.title_number} (subject to the conditions contained in the said Certificate of Lease (hereinafter collectively referred to as `),
    antiqua('"the Land"', { bold: true }),
    antiqua(').'),
  ]));

  // (B) Development recital — RS2 specific: 12 floors, studios + 1BR + 2BR + amenities
  out.push(makRecital([
    antiqua('The Vendor has erected and completed a development project on the Land known as '),
    antiqua(`“${dev.name.toUpperCase()} APARTMENTS”`, { bold: true }),
    antiqua(' (hereinafter referred to as '),
    antiqua('“the Development”', { bold: true }),
    antiqua(`) which comprises ${dev.floors} floors consisting of studio, one bedroom and two bedroom residential apartments together with social amenities like shops, food courts gym, pathways, driveways, commercial center, parking spaces, gardens, and other usual amenities in accordance with the Building Plans which are available for inspection at the Vendor’s offices.`),
  ]));

  // (C) Change of User completed recital — RS2 specific
  out.push(makRecital([
    antiqua('The Vendor has completed the  Change of User Process (as hereinafter defined) of the Land from single dwelling unit to multi dwelling units and has acquired a new title with the new user endorsed.'),
  ]));

  // (D) Sale agreement recital
  out.push(makRecital([
    antiqua('Subject to this Agreement, the Vendor has agreed to sell, and the Purchaser has agreed to purchase the '), antiqua('Apartment(s)', { bold: true }), antiqua(' whose particulars are set out in Section II of the Schedule of Particulars, which is part of the Development in consideration of the '), antiqua('Purchase Price', { bold: true }), antiqua(' whose particulars are set out in Section III of the Schedule of Particulars, upon the terms and conditions set out below.'),
  ]));
  out.push(spacer());

  // ── IT IS HEREBY AGREED AND CONFIRMED ────────────────────────────────────
  out.push(bodyPara([
    antiqua('IT IS HEREBY AGREED AND CONFIRMED', { bold: true, underline: { type: UnderlineType.SINGLE } }),
    antiqua(' by and between the parties hereto as follows: -'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 1. DEFINITIONS AND INTERPRETATIONS
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

  // Definitions — RS2 verbatim, in source order
  def('Architect', 'TSAVO Architects Limited, of Post Office Box Number 15854-00509, Nairobi;');
  def('Architect’s Office', 'TSAVO Offices, Coral Bells Apartments, Thindigua, Nairobi;');
  def('Architectural Drawings', 'the Architect’s drawings for the Apartment(s) (including any revision of the drawings);');
  def('Ardhisasa', 'the National Land Information System, being an online Government platform operated by the Ministry of Lands and Physical Planning and responsible for management of online land transactions;');
  def('“Building Plans”', 'the Architect’s designs including registered floor plans, drawings and specifications relating to the Development and approved by the appropriate County authority(ies) as the same may be supplemented, replaced, added to or revised by the Vendor from time to time as provided herein, which are available for inspection by the Purchaser at the offices of the Vendor, and upon the execution of this Agreement, the Purchaser shall be deemed to have duly inspected and understood the Building Plans to the complete satisfaction of the Purchaser;');
  def('Business Day', 'any day (other than Saturday, Sunday, national day or gazetted public holiday) on which banking institutions in Kenya are generally open for the conduct of banking business;');
  def('By-Laws', 'the by-laws specified under the Second Schedule of the Sectional Properties Regulations, 2021 subject to any amendments effected to the said By-Laws by the Vendor with respect to the Development;');

  // Change of User — definition with two sub-bullets
  out.push(makSubC([
    antiqua('Change of User', { bold: true }),
    antiqua(' means collectively:'),
  ], 2));
  out.push(bulletPara([antiqua('the approval for a formal change of user of the Land by the County Government of Nairobi to permit use of the Land for purposes of residential multi-dwelling apartment units, which have already been obtained by the Vendor; and')]));
  out.push(bulletPara([antiqua('the issuance of a new document of title for the Land by the Ministry of Lands and the National Land Commission (with the user endorsed as permitting residential multi-dwelling apartment units), which has been obtained by the Vendor;')]));

  def('Common Property', 'all parts halls staircases and other access ways and areas on the Land and on the Development and includes the common parking areas, gardens and other amenities that are provided for the common use of the Purchaser and other occupiers or persons expressly or by implication authorized by them residing at the Development;');
  def('Corporation', 'the body corporate to be incorporated under the Sectional Properties Act to manage the Development and Corporation shall be construed to include the members of the Corporation;');
  def('Data Protection Act', 'the Data Protection Act No. 24 of 2019.');
  def('Data Protection Laws', 'together the Data Protection Act and the Data Protection Regulations (defined below).');
  def('Data Protection Regulations', 'together means the Data Protection (General) Regulations 2021, the Data Protection (Complaints Handling Procedure and Enforcement) Regulations 2021 and the Data Protection (Registration of Data Controllers and Processors) Regulations 2021.');
  def('Defects Liability Period', 'the period of six (6) months from and including the Anticipated Practical Completion Date (defined below) in which the Vendor is required to repair material defects that appear in the Apartment(s).');
  def('Development', `development known as “Royal Suburb Phase Two” comprised of ${dev.unit_breakdown} constructed and maintained on the Land and identified in the Plans;`);

  // Land — RS2 specific: detailed Land Reference description with hectares, original number, LSP, IR
  def('Land', 'all that Property ALL that piece of Land situate in the City of Nairobi in Nairobi Area District containing by measurement nought decimal two nought two four hectares (0.2024 ha) or thereabouts and being Land Reference Number 138/1333 (original Number 1012/47/1/8) as delineated on Land Survey Plan number 317244 annexed to the Assent registered as IR 8126/28 and subject to the terms and the conditions in the Certificate of Title (subject to the outcome of the change of user)');
  def('Land Act', 'the Land Act (Act No.6 of 2012);');
  def('Land Laws', 'together the Land Registration Act, the Land Act, the Sectional Properties Laws, any subsidiary legislation, rules and regulations promulgated thereunder, and any practice directions issued pursuant to the Land Act and the Land Registration Act;');
  def('Land Registration Act', 'the Land Registration Act (Act No. 3 of 2012);');
  def('Registrar', 'the relevant Land Registrar at the Lands Office, Nairobi;');
  def('Sectional Plan', 'a geo-referenced plan of the Apartment prepared by a duly licensed surveyor, approved by the relevant County Government and registered with the relevant Land Registry;');
  def('Sectional Properties Act', 'the Sectional Properties Act (No.21 of 2020), Laws of Kenya;');
  def('Sectional Properties Regulations', 'the Sectional Properties Regulations, 2021 promulgated under the Sectional Properties Act;');
  def('Sectional Properties Laws', 'together the Sectional Properties Act and the Sectional Properties Regulations as amended from time to time;');
  def('Sectional Title(s)', 'a certificate of lease/title in respect to the Apartment registered under the Sectional Properties Laws;');
  def('Service Charge', 'a monthly sum that shall be payable after the Anticipated Practical Completion Date by the Purchaser to the Corporation and the By-Laws, which Service Charge shall be utilized for purposes of managing the Development;');
  def('Unit Factor', 'a proportionate factor of ownership in the Corporation, determined in accordance with the Sectional Properties Laws; and');
  def('Plans', 'collectively (i) the Building Plans and (ii) the Architect’s drawings in respect of the Apartment (including any revision of the drawings), copies of which are available for inspection at the Vendor’s Office;');
  def('Practical Completion Date', 'the anticipated date of issue by the Architect of a certificate of practical completion of the Development to the effect that in the opinion of the Architect practical completion of the Apartment Works has been achieved and so much of the Development as gives in the Architect\'s opinion sufficient access to the Apartment for the purposes of the Purchaser being able to occupy the Apartment, and “Practical Completion Certificate” shall be construed accordingly;');

  // Title Long Stop Date — RS2: 60 BD post-PCD with 4 sub-conditions
  out.push(makSubC([
    antiqua('Title Long Stop Date', { bold: true }),
    antiqua(' means the date falling at least sixty (60) Business Days following the Practical Completion Date (as defined below) '),
    antiqua('SUBJECT TO:', { bold: true }),
  ], 2));
  out.push(bulletPara([antiqua('all payment obligations of the Purchaser being satisfied in full')]));
  out.push(definitionPara([antiqua('the Transfer duly executed by the Purchaser.')]));
  out.push(bulletPara([antiqua('the Change of User being completed by the Vendor; and')]));
  out.push(definitionPara([antiqua('Sectional title deeds being issued by the Ministry of Lands.')]));

  def('Vendor\'s Advocates', 'MAK & PARTNERS ADVOCATES 4th Floor, Victoria at Two Rivers, Two Rivers Development, Limuru Road, P.O Box 10644 - 00100, Nairobi, Kenya');
  def('Vendor’s Office', 'Coral Bells, Thindigua, Kiambu Road, Nairobi');

  // 1.2 Interpretation rules block
  out.push(makSubC([antiqua('In this agreement:')]));
  out.push(makSubC([antiqua('Where the context so admits the expression “the Vendor” and “the Purchaser” includes the respective successors, personal representatives and assigns (as the case may be) of the Vendor and the Purchaser.')], 2));
  out.push(makSubC([antiqua('Words importing the singular meaning where the context so admits include the plural meaning and vice versa.')], 2));
  out.push(makSubC([antiqua('Words of the neuter gender include the feminine and masculine genders and words denoting natural persons include corporations and firms and all such words shall be construed interchangeably in that manner.')], 2));
  out.push(makSubC([antiqua('Headings to sections are for convenience only and shall not affect the construction or interpretation of this Agreement.')], 2));
  out.push(makSubC([antiqua('the expression “person” shall include any legal or natural person, partnership, trust company, joint venture, agency, government or local authority department or other body (whether corporate or non-corporate);')], 2));
  out.push(makSubC([antiqua('any statute or any provision of any statute shall be deemed to refer to any statutory modification or re-enactment thereof and to any statutory instrument, order or regulation made thereunder or under any such re-enactment;')], 2));
  out.push(makSubC([antiqua('a document “in the agreed terms” or in “agreed form” shall mean in the form agreed by or on behalf of the parties and initialized by or on their behalf;')], 2));
  out.push(makSubC([antiqua('In this Agreement any reference to any document (including this Agreement) means that document as is supplemented, amended or varied from time to time in accordance with the terms thereof and (if applicable) hereof.')], 2));
  out.push(makSubC([antiqua('If the Purchaser is at any time more than one person their obligations shall be joint and several.')], 2));
  out.push(makSubC([antiqua('For the purposes of this Agreement, if a definition imposes substantive rights on a party to this Agreement, such rights and obligations shall be given effect to and shall be enforceable, notwithstanding that they are contained in the definition.')], 2));
  out.push(makSubC([antiqua('The recitals form an integral part of this Agreement and shall have the same force and effect as if expressly set out in the body of this Agreement and any reference to this Agreement shall include the recitals.')], 2));
  out.push(makSubC([antiqua('The parties acknowledge and agree that this Agreement has been jointly negotiated and drafted by all of the parties to it and that it is intended to benefit all of the parties equally.  Accordingly, neither this Agreement nor any of the provisions thereof shall be construed strictly against any of the parties.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 2. THE VENDOR'S WORK
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE VENDOR’S WORK'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor has constructed the Development substantially in accordance with the Plans.')]));
  out.push(makSubC([antiqua('The Vendor shall use all reasonable endeavours to comply with such requirements as should permit the County Government to issue an Occupation Certificate for the Development following the carrying out of the works relating to the Apartment.')]));
  out.push(makSubC([antiqua('The Vendor shall obtain all the permits, clearances and licenses including but not limited to the land rent and rates clearance certificates.')]));
  out.push(makSubC([antiqua('The Purchaser has had an opportunity of inspecting the Building Plans and or drawings for the Apartment and the Development and accordingly (whether they have inspected the same or not) the Purchaser shall be deemed to have notice of the identity of the Development and the Apartment and the specifications and condition thereof.')]));
  out.push(makSubC([antiqua('The Purchaser acknowledges and agrees that any visit made to the Land/Development by the Purchaser or the Purchaser’s servants, agents or representatives shall be entirely at the risk of the Purchaser, the Purchaser’s servants, agents or representatives (as the case may be) and the Vendor shall have no liability to any such person for any loss, damage, injury or fatality suffered or incurred by any such person. The Purchaser further acknowledges and accepts on its behalf and on behalf of its servants, agents and representatives that they shall observe the site safety rules and shall wear protective gears provided by the Vendor.')]));
  out.push(makSubC([antiqua('The Purchaser acknowledges that any material defects in the Apartment which shall appear within a period of six (6) months from the Practical Completion Date (other than those defects which shall arise from normal shrinkage and drying out of plaster or which shall comprise deterioration of decoration occasioned by ordinary wear and tear) shall be remedied by the Vendor within a reasonable period of time provided that the Vendor shall only be bound to remedy those material defects notified to it in writing by the Purchaser within six (6) months from the Practical Completion Date.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 3. THE PURCHASE PRICE AND OTHER PAYMENTS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE PURCHASE PRICE AND OTHER PAYMENTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser shall pay the Purchase Price free of set off, deduction or counterclaim on the terms set out in Section V of the Schedule of Particulars.')]));
  out.push(makSubC([antiqua('the Purchaser shall pay legal fees and costs (as set out in the Schedule to this Agreement), with:')]));
  out.push(makSubC([antiqua('“Stage 1 costs” due and payable at the time of execution of this Agreement;')], 2));
  out.push(makSubC([antiqua('“Stage 2 costs” due and payable within thirty (30) days of completion of payment of the Purchase Price. The Purchaser hereby acknowledges and accepts that the Stage 2 costs indicated in this Agreement are estimated amounts and the Vendor reserves the right to adjust these costs at the time scheduled for payment on the basis of the prevailing rate of inflation and actual expenses being incurred by the Vendor and/or the Corporation after the Anticipated Practical Completion Date and as such the final Stage 2 costs due from the Purchaser will be determined and communicated at the time the Purchaser is due to make payment and;')], 2));
  out.push(makSubC([antiqua('“Stage 3 costs” due and payable on the Sale Completion Date. It is hereby agreed that:')], 2));

  out.push(makSubC([
    antiqua('In addition to the payment obligations set out in Condition 3.1 and 3.2 above, the Purchaser shall also pay to the Vendor the utility and georeferencing costs (the '),
    antiqua('Utility and Georeferencing Costs', { bold: true }),
    antiqua(') free of set off, deduction or counterclaim on the terms set out in Section VI of the Schedule of Particulars.'),
  ]));

  out.push(makSubC([antiqua('It is hereby agreed that:')]));
  out.push(makSubC([antiqua('notwithstanding the negotiation period and/or the date of signing of this Agreement, the Purchaser will continue with their payment obligations under this Agreement. For avoidance of doubt, the payment obligations of the Purchaser shall not be suspended or avoided by any delay in the execution of this Agreement; and')], 2));
  out.push(makSubC([antiqua('the Vendor shall be entitled to possession of the Apartment and to collect all rental income generated from the Apartment after the Anticipated Practical Completion Date until full payment of the Balance of the Purchase Price is received by the Vendor and such rental income shall not be apportioned by the Purchaser towards settlement of the Purchase Price for any reason whatsoever.')], 2));

  out.push(makSubC([antiqua("the Purchaser is at liberty to make lump-sum payments to offset the Balance due to the Vendor at any time, provided that, at the time of payment of any lump sum amount, the Purchaser is and remains up to date on the Purchaser's existing payment obligations under Condition 4.1. For the avoidance of doubt, the Purchaser acknowledges that this Condition does not in any way allow for a lump sum payment plan that is subject to finance from a third-party lender with a condition that the Sectional Title and lender's security be registered prior to payment by such lender; and")]));
  out.push(makSubC([antiqua('All payments to the Vendor shall be paid to the following bank account:')]));

  // Bank account — verbatim from project registry
  const vb = pay.vendor_bank;
  out.push(definitionPara([antiqua(`Name: ${vb.account_name}`)]));
  out.push(definitionPara([antiqua(`Bank Name: ${vb.bank_name}`, { bold: true })]));
  out.push(definitionPara([antiqua(`Branch: ${vb.branch ? vb.branch.toUpperCase() : ''}`, { bold: true })]));
  out.push(definitionPara([antiqua(`Account No: ${vb.account_number}`, { bold: true })]));
  out.push(definitionPara([antiqua(`Swift code: ${vb.swift_code}`)]));
  if (vb.bank_code) out.push(definitionPara([antiqua(`Bank Code:${vb.bank_code}`, { bold: true })]));
  if (vb.branch_code) out.push(definitionPara([antiqua(`Branch Code:${vb.branch_code}`, { bold: true })]));
  if (vb.paybill_number) out.push(definitionPara([antiqua(`PayBill: ${vb.paybill_number}`)]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 4. OVERDUE PAYMENTS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('OVERDUE PAYMENTS'));
  out.push(spacer());
  out.push(makSubC([antiqua('If the Purchaser fails to honour the Purchaser’s payment obligations to the Vendor then:')]));
  out.push(makSubC([antiqua('if payment shall not have been effected within sixty (60) days of the due date, then the Vendor may (but without prejudice to any other right or remedy) elect to treat non-payment as a fundamental breach of the Purchaser’s obligations under this Agreement and the provisions of Clause 7 shall apply.')], 2));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 5. GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GRANT OF POSSESSION, SALE COMPLETION REGISTRATION AND PROPERTY MANAGEMENT'));
  out.push(spacer());

  // 5.1 Conditions for Possession (sub-heading)
  out.push(makSubC([antiqua('Conditions for Possession', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([antiqua('Subject to payment of (i) the Purchase Price in full and (ii) Stage 1 costs and Stage 2 costs in full the Vendor shall grant possession of the Apartment to the Purchaser upon the issuance of the Practical Completion Certificate and, for avoidance of doubt, in case the Purchaser is paying the Balance in installments extending beyond the Anticipated Practical Completion Date, the Purchaser shall not be entitled to possession of the Apartment or any rental income accruing from the Apartment until full payment of the Balance is received by the Vendor in accordance with this Agreement. Upon the handover of possession of the Apartment by the Vendor to the Purchaser (whether directly to the Purchaser or indirectly to the Purchaser’s tenant), the Purchaser shall with effect from the first calendar month of receiving possession of the Apartment be responsible and ensure to remit to the Vendor and/or the Corporation (as the case may be) the monthly Service Charge for the Apartment as and when it shall become due, whether formally demanded or not.')]));

  out.push(makSubC([antiqua('Where the Purchaser is granted possession of the Apartment by the Vendor after the Defect Liability Period, then the Purchaser shall be afforded a period of thirty (30) days from the time of handover of the Apartment(s) to carry out an inspection of the Apartment(s) with the Vendor so as to agree on any reasonable repairs that may be required (if any) as a result of occupation by any tenant to return the Apartment(s) to a reasonable state of repair and condition, save for ordinary wear and tear.')]));

  out.push(makSubC([antiqua('the Purchaser hereby acknowledges, confirms and agrees that the Apartment(s) will be deemed sold upon the terms and conditions of this Agreement, the Land Laws and any legal requirements under Kenyan law as at the Sale Completion Date.')]));

  out.push(makSubC([antiqua('The Purchaser agrees and acknowledges that subject to the conditions set in the By- Laws, the Purchaser shall use the Apartment for the purposes of a private residence and for no other purpose whatsoever.')]));

  out.push(makSubC([antiqua('The sale of the Apartment(s) shall be completed at the offices of the Vendor’s Advocates on the Sale Completion Date.')]));

  out.push(makSubC([
    antiqua('On the Sale Completion Date the Vendor shall issue an instrument of transfer (the '),
    antiqua('Transfer', { bold: true }),
    antiqua(') to the Purchaser (in a form drawn by the Vendor’s Advocates and provided to the Purchaser for review prior to the Sale Completion Date) and the Purchaser shall execute the Transfer and return the same to the Vendor’s Advocates together with:'),
  ]));
  out.push(makSubC([antiqua('copy of the National Identity Card or valid Passport or a Certificate of Incorporation (as the case maybe) of the Purchaser;')], 2));
  out.push(makSubC([antiqua('copy of a current dated CR12 company search of the  (if applicable);')], 2));
  out.push(makSubC([antiqua('copy of the tax PIN Certificate of the Purchaser; and')], 2));
  out.push(makSubC([antiqua('three (3) coloured passport photos of the Purchaser or the Director(s) and Secretary of the Purchaser (as the case maybe).')], 2));

  out.push(makSubC([antiqua('The Vendor shall be responsible for the registration of the Sectional Plan and upon completion of construction of the Development, the Vendor shall:')]));
  out.push(makSubC([antiqua('procure a duly licensed surveyor to undertake the process of geo-referencing and preparation of the Sectional Plan;')], 2));
  out.push(makSubC([antiqua('apply for registration of the Sectional Plan in accordance with the provisions of the Sectional Properties Laws; and')], 2));
  out.push(makSubC([antiqua('apply for registration of the Corporation in accordance with the Sectional Properties Laws.')], 2));

  // The Corporation (sub-heading)
  out.push(makSubC([antiqua('The Corporation', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(makSubC([antiqua('The Corporation shall be responsible for the management and administration of the Development and the Common Property subject to the provisions of the By-Laws. The membership rights in the Corporation shall be determined by the Unit Factor and upon registration of the Corporation, the Unit Factor shall be endorsed on the Sectional Title(s) as evidence of membership in the Corporation.')], 2));
  out.push(makSubC([antiqua('upon the initial registration of the Corporation, the Corporation shall adopt the By-Laws. Any amendments to the By-Laws of the Corporation (as the case may be) shall be made in accordance with the provisions of Sectional Properties Laws.')], 2));
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges that they shall be bound by the provisions of the By-Laws.')], 2));
  out.push(makSubC([antiqua('Subject to Condition 5.7.3, the Purchaser hereby acknowledges that they shall bear a proportionate share of the costs for registering the Corporation and its By-Laws.')], 2));

  out.push(makSubC([antiqua('Subject to registration of the Sectional Plan, issuance of the Sectional Title(s) in favour of the Vendor and payment of “Stage 3 costs” which are due on the Sale Completion Date, the Vendor’s Advocates shall undertake the registration of the Transfer within a reasonable period of time taking into account any delays in registration that may occur at the Lands Office, Survey of Kenya or any other relevant national or county government office.')]));

  // Completion Documents (sub-heading + 11 items)
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

  // Property Management (sub-heading)
  out.push(makSubC([antiqua('Property Management', { bold: true, underline: { type: UnderlineType.SINGLE } })]));
  out.push(bodyPara([
    antiqua('Upon grant of possession of the Apartment, the Purchaser shall have the option of engaging '),
    antiqua('TSAVO LIFESTYLE LIMITED', { bold: true }),
    antiqua(' (the '),
    antiqua('Property Manager', { bold: true }),
    antiqua(') for the purposes of managing the Apartment on the Purchaser’s behalf, subject to the Purchaser and the Property Manager entering into a property management agreement.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 6. TERMINATION OF THIS AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('TERMINATION OF THIS AGREEMENT'));
  out.push(spacer());
  out.push(makSubC([
    antiqua('Upon the occurrence of a breach of this Agreement an injured party shall, prior to exercising their rights against a defaulting party, as a first attempt to address and resolve the breach with the defaulting party through good-faith negotiations for a period of thirty (30) days (the '),
    antiqua('Negotiation Period', { bold: true }),
    antiqua('). If for any reason such breach is unable to be resolved within the Negotiation Period then the injured party shall upon expiry of the Negotiation Period, be entitled to exercise their rights under this section.'),
  ]));

  out.push(makSubC([
    antiqua('If the Purchaser fails to comply with its obligations under this Agreement, the Vendor may give the Purchaser notice in writing to comply with its obligations ('),
    antiqua('“the Vendor’s Default Notice”', { bold: true }),
    antiqua(') and require the Purchaser to make good the default within thirty (30) days, time being of the essence. On the failure of the Purchaser to comply with the Vendor’s Default Notice, the Vendor may either extend the time for compliance or assign a similar apartment in a different project with a longer payment plan without prejudice to its other rights or remedies, terminate this Agreement by thirty (30) days’ notice in writing to the Purchaser ('),
    antiqua('“the Vendor’s Termination Notice”', { bold: true }),
    antiqua(') and upon expiry of the Vendor’s Termination Notice:'),
  ]));

  out.push(makSubC([antiqua('the Vendor shall, within ninety (90) days of the expiry of the Vendor’s Termination Notice, refund the Purchaser the amount paid on account of the Purchase Price subject to deduction of legal costs that are due as provided by the schedule of costs and thereafter this Agreement shall stand terminated and neither party shall have any claims against the other whether in tort, contract or otherwise;')], 2));

  out.push(makSubC([antiqua('prior to termination of this Agreement, the Purchaser may with the consent of the Vendor identify other persons to purchase the Apartment on terms and conditions similar to this Agreement. If such new purchaser shall enter into an agreement with the Vendor for the purchase of the Apartment at a price higher than the Purchase Price, then it is hereby agreed between the parties that the profit earned from the sale shall be paid to the Purchaser within thirty (30) days of completion of the sale of the Apartment to the new purchaser; and')], 2));

  out.push(makSubC([antiqua('the Vendor shall be entitled to recover by action any amounts found to be due to the Vendor in the event of there being any deficiency.')], 2));

  out.push(makSubC([
    antiqua('Subject to clause 6.1, if (as the case may be) the Development is not completed by the  Practical Completion Date or such other date as may be notified in writing by the Vendor to the Purchaser or there is a breach of any of the warranties specified in clause 9 (the '),
    antiqua('Warranties', { bold: true }),
    antiqua(' and '),
    antiqua('“Warranty”', { bold: true }),
    antiqua(' shall be construed accordingly) prior to the Title Longstop Date, then the Vendor shall inform the Purchaser of the delay in completion or breach of the Warranty and provide a timeline for completion or remedying of the breach of Warranty not exceeding ninety (90) days. If the Development is still not completed by the expiry of the timeline specified for completion and provided always that any delay in completing the Development by the Vendor shall not in any way be as a result of or on account of circumstances beyond the Vendor’s control, then the Purchaser shall be entitled to issue the Vendor with a completion notice in writing specifying the default and requiring the Vendor comply with its obligations within thirty (30) days of the date of the notice  (the '),
    antiqua('Purchaser’s Default Notice', { bold: true }),
    antiqua('). Failure by the Vendor to comply with the Purchaser’s Default Notice shall constitute a fundamental breach of this Agreement and the Purchaser may, without prejudice to any rights or remedies of the  Purchaser terminate this Agreement by thirty (30) days’ notice in writing to the Vendor (the '),
    antiqua('Purchaser’s Termination Notice', { bold: true }),
    antiqua(') and upon expiry of the said Purchaser’s Termination Notice the Vendor shall refund all monies paid on account of the Purchase Price  to the Purchaser within ninety (90) days of expiry of the Purchaser’s Termination Notice and thereafter this Agreement shall stand terminated and neither party shall have any claims against the other whether in tort, contract or otherwise.'),
  ]));
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
  out.push(bulletPara([antiqua('any Act of God, war or hostilities (whether war be declared or not);')]));
  out.push(bulletPara([antiqua('any sabotage, riots or other acts of civil disobedience, civil commotion, rebellion, act of a public enemy or invasions;')]));
  out.push(bulletPara([antiqua('any judicial actions, strikes, lockouts, industrial disputes or actions of any such nature;')]));
  out.push(bulletPara([antiqua('any actions or inactions of any government or any agency or subdivision thereof;')]));
  out.push(bulletPara([antiqua('any act of terror;')]));
  out.push(bulletPara([antiqua('any storms, floods or other inclement weather, earthquakes, subsidence, epidemics pandemics save for Covid-19 which both Parties are aware of and have anticipated its effect vis a vis their obligations under this Agreement or other natural physical disasters; and')]));
  out.push(definitionPara([antiqua('fire, accident or explosion')]));

  out.push(makSubC([
    antiqua('The Vendor shall promptly notify the Purchaser (the '),
    antiqua('Force Majeure Notice', { bold: true }),
    antiqua(') when such circumstances cause a delay in performance, failure in performance or failure in adequate performance and when they cease so to do. The Purchaser undertakes to continue with its performance of obligations under this Agreement immediately the Force Majeure event ceases. If such circumstances continue for more than six (6) months after the date of the Force Majeure Notice, either Party may terminate this Agreement but without prejudice to any accrued rights the Vendor may have against the Purchaser but subject to this agreement. Any payment obligations arising during the subsistence of the Force Majeure event shall be deemed to be suspended.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 8. WARRANTY (singular in RS2 — long form)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('WARRANTY'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor warrants to the Purchaser that it has a good and indefeasible title to the Land and that its ownership thereof is not subject to any challenge whatsoever.')]));
  out.push(makSubC([antiqua('The Vendor has the legal capacity to enter into and to perform and observe the terms of this Agreement.')]));
  out.push(makSubC([antiqua('The Vendor is not engaged in nor threatened by any litigation, arbitration or administrative proceedings relating to the Land.')]));
  out.push(makSubC([antiqua('The Vendor has not given any rights of way, easement or any overriding interest and has no intention of so doing.')]));
  out.push(makSubC([antiqua('The Vendor hereby undertakes to disclose to the Purchaser anything which is or may be inconsistent with any of the warranties or representations, immediately it comes to its notice.')]));
  out.push(makSubC([antiqua('so far as the Vendor is aware, there are and have been no boundary disputes relating to or regarding the Land; and')]));
  out.push(makSubC([antiqua('dimensions and areas of the Land as set out in the documents of title are true, accurate and correct.')]));
  out.push(makSubC([antiqua('The Vendor will disclose in writing to the Purchaser any event or circumstance which may arise or become known to it after the date of this Agreement and prior to the Practical Completion Date which is inconsistent with any of the Warranties or which had it occurred on or before the date of this Agreement would have constituted a breach of the Warranties or which is material to be known by a purchaser for value of the Apartment.')]));
  out.push(makSubC([antiqua('The parties hereby agree that if any of the Warranties above is breached prior to the Practical Completion Date then the breach shall be construed accordingly and the provisions of clause 6.3 shall apply.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 9. THE LAW SOCIETY CONDITIONS FOR SALE (2015)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('THE LAW SOCIETY CONDITIONS FOR SALE (2015)'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Law Society of Kenya Conditions of Sale will apply to this Agreement and shall be deemed incorporated herein in extensor save in so far as the LSK Conditions are not inconsistent with the provisions of this Agreement or are varied or excluded by the terms of this Agreement.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 10. NOTICE
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('NOTICE'));
  out.push(spacer());
  out.push(makSubC([antiqua('In this Clause:')]));
  out.push(bodyPara([
    antiqua('Any notice or other communication (hereinafter defined as a '),
    antiqua('Notice', { bold: true }),
    antiqua(') given or made under this Agreement shall be in writing by letter or email as follows:'),
  ]));
  out.push(bodyPara([antiqua('In the case of the Vendor, to:')]));
  out.push(definitionPara([antiqua(`	Address:	${v.company_name}`)]));
  out.push(definitionPara([antiqua('			P.O. Box Number 15854-00509')]));
  out.push(definitionPara([antiqua('			NAIROBI')]));
  out.push(definitionPara([antiqua(`			Email: ${v.notice_email}`)]));
  out.push(bodyPara([antiqua('In the case of the Purchaser, to the address whose particulars are set out in Section I of the Schedule of Particulars.')]));
  out.push(spacer());
  out.push(bodyPara([antiqua('The details of the Alternative Contact of the Purchaser are set out in Section VII of the Schedule of Particulars. It is hereby acknowledged that the details of Alternative Contact provided above are solely intended for purposes of enabling prompt communication in the event that the Purchaser is not reachable for whatever reason and does not in any way impose any contractual obligation on the Alternative Contact under this Agreement.')]));
  out.push(makSubC([antiqua('Any Notice sent by post shall be deemed effective five (5) Business Days after posting upon proof that it was properly addressed to the recipient and put in the post while any Notice sent by email shall be deemed effective two (2) Business Days after emailing upon proof that it was properly emailed and successfully delivered to the recipient.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 11. GENERAL CONDITIONS
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('GENERAL CONDITIONS'));
  out.push(spacer());
  out.push(makSubC([antiqua('This agreement is personal to the purchaser and the Purchaser shall not assign or transfer this agreement to any third party without the written consent of the Vendor such consent not to be unreasonably withheld.')]));
  out.push(makSubC([antiqua('No immaterial error or omission or misstatement in this Agreement or in any Plan of the Development or the Apartment referred to in this Agreement or in any statement made by any person prior to the making of this Agreement shall in any way affect the obligations of the Purchaser or the Vendor under this Agreement or entitle the Purchaser to damages or compensation.')]));
  out.push(makSubC([antiqua('Save as provided herein time shall be deemed to be of the essence to this Agreement.')]));
  out.push(makSubC([antiqua('The Purchaser agrees and confirms that:')]));
  out.push(makSubC([antiqua('The Purchaser enters into this Agreement solely as a result of searches, surveys and inspections the Purchaser has carried out and on the basis of the terms of this Agreement and not in reliance upon any representation either written or oral or implied or made by or on behalf of the Vendor; and')], 2));
  out.push(makSubC([antiqua('This Agreement constitutes the whole agreement between the parties hereto relating to the sale and purchase of the Apartment and supersedes and extinguishes any prior agreements undertakings representations warranties and arrangements of any nature whatsoever whether or not in writing relating to the sale and purchase of the Apartment.')], 2));
  out.push(makSubC([antiqua('If any term or condition of this Agreement shall to any extent be found or held to be invalid or unenforceable, the parties shall negotiate in good faith to amend such term or condition so as to be valid and enforceable and to be construed with the interests of the parties as contained herein. No amendments or modification of this Agreement shall be valid or binding on any party unless the same:')]));
  out.push(makSubC([antiqua('is made in writing;')], 2));
  out.push(makSubC([antiqua('refers expressly to this Agreement; and')], 2));
  out.push(makSubC([antiqua('is signed by the party concerned or its or their duly authorized representative.')], 2));
  out.push(makSubC([antiqua('Each of the provisions of this Agreement is severable and distinct from the others and, if at any time one or more of these provisions is or becomes invalid, illegal or unenforceable, the validity, legality and enforceability of the remaining provisions shall not in any way be affected or impaired.')]));
  out.push(makSubC([antiqua('The construction, validity and performance of this Agreement shall be governed by and construed in accordance with the laws of Kenya.')]));
  out.push(makSubC([antiqua('Each of the parties hereby agree and confirm, for the purpose of the Law of Contract Act (Chapter 23, Laws of Kenya) the Land Act and the Land Registration Act, 2012 that it, he or she has executed this agreement with the intention to bind itself, himself or herself to the contents hereof.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 12. EXECUTORY AGREEMENT
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('EXECUTORY AGREEMENT'));
  out.push(spacer());
  out.push(makSubC([antiqua('This Agreement is an executory agreement only and shall not operate or be deemed to operate as a Lease of the Apartment.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 13. VERIFICATION OF EXECUTION VIA LIVE AUDIO-VISUAL LINK
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
  // 14. CHANGES IN LAW OR CIRCUMSTANCES
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('CHANGES IN LAW OR CIRCUMSTANCES'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser hereby acknowledges, confirms and agrees that the sale of the Apartment(s) is subject always to any applicable changes in law or circumstances (including the Sectional Properties Act, if applicable) that may affect the form of title to be issued for the Apartments(s) and/or the provisions, rights and obligations of the respective parties under this Agreement and, if required, the Purchaser will execute such additional agreements and/or variations to this Agreement and pay such additional legal fees and/or costs as may be necessary to give effect to such changes in law or circumstances.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 15. DISPUTE RESOLUTION (NCIA mediation → court)
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DISPUTE RESOLUTION'));
  out.push(spacer());
  out.push(makSubC([antiqua('Any dispute, controversy or claim arising out of or relating to this Agreement or a termination thereof (including without prejudice to the generality of the foregoing, whether as to its interpretation, application or implementation), shall be resolved by way of consultation held in good faith between the parties. Such consultation shall begin immediately after one party has delivered to the other written request for such consultation. If within thirty (30) Business Days following the date on which such notice is given the dispute cannot be resolved amicably, the dispute, controversy or claim shall be submitted to a two-tier dispute resolution mechanism as follows:')]));
  out.push(makSubC([antiqua('once thirty (30) Business Days have elapsed and the dispute has not been resolved amicably, the parties shall refer the dispute to mediation at the Nairobi Center for International Arbitration (NCIA). The mediation shall take place in Nairobi in accordance with the Nairobi Centre for International Arbitration – Mediation Rules as at present in force; and')], 2));
  out.push(makSubC([antiqua('should the consultation and mediation process referred to in this Condition 15.1 fail to resolve the dispute then either party may refer the dispute to a Kenyan court of competent jurisdiction for hearing and determination of the dispute,')], 2));
  out.push(bodyPara([
    antiqua('PROVIDED ALWAYS THAT', { bold: true }),
    antiqua(' where a remedy exists under this Agreement to cater for the dispute concerned (be it an issue of interpretation, application or implementation), a party shall be obligated to adopt the agreed remedy available to the party under this Agreement.'),
  ]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 16. ANTI-MONEY LAUNDERING
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('ANTI-MONEY LAUNDERING'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Purchaser confirms that the monies utilized to pay the Purchase Price for the Apartment(s) and any other sums due from the Purchaser under this Agreement are not and shall not be from the proceeds of crime.')]));
  out.push(makSubC([antiqua('Failure by the Purchaser to adhere to the provisions of this clause shall be treated as a material breach of the provisions of this Agreement and if required by any Competent Authority shall entitle the Vendor, without prejudice to any other rights or remedies that the Vendor may have, to terminate this Agreement forthwith by issuance of written notice to that effect to the Purchaser and confiscate all monies paid by the Purchaser to the Vendor and submit such monies to the relevant Competent Authority or as required by law.')]));
  out.push(makSubC([antiqua('Furthermore, the Purchaser warrants to the Vendor that all deposits paid by the Purchaser to the Vendor in connection with the Purchase Price or and any other sums due from the Purchaser under this Agreement paid to the Vendor’s Advocates do not in any way contravene the Proceeds of Crime and Anti-Money Laundering Act, 2009 or the Proceeds of Crime and Anti-Money Laundering (Amendment) Act, 2021 or any other law in Kenya and hold the Vendor and the Vendor’s Advocates (as the case may be) fully indemnified against any claim or action arising out of a breach by the Purchaser of the aforementioned laws.')]));
  out.push(spacer());

  // ─────────────────────────────────────────────────────────────────────────
  // 17. DATA PROTECTION
  // ─────────────────────────────────────────────────────────────────────────
  out.push(makClauseH('DATA PROTECTION'));
  out.push(spacer());
  out.push(makSubC([antiqua('The Vendor hereby confirms to the Purchaser that all personal data given to the Vendor by the Purchaser and their Next of Kin under this Agreement shall be used in accordance with the Data Protection Laws.')]));
  out.push(makSubC([antiqua('By signing this Agreement, the Purchaser hereby consents to their personal data being collected and processed for the purposes of execution, performance and completion of this Agreement.')]));
  out.push(spacer());

  // ── IN WITNESS WHEREOF ───────────────────────────────────────────────────
  out.push(bodyPara([antiqua('IN WITNESS WHEREOF this Agreement has been duly executed by the parties hereto as of the day and year first before written.', { bold: true })]));
  out.push(spacer());
  out.push(new Paragraph({ children: [new PageBreak()], spacing: { before: 0, after: 0 } }));

  return out;
};
