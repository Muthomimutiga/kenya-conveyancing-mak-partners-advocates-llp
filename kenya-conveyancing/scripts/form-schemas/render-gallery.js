#!/usr/bin/env node
// scripts/form-schemas/render-gallery.js <outDir> [--pdf] [--bundle] [ids...]
//
// Renders every form the plugin draws, filled with one coherent, realistic matter, so a
// person can look through the whole library the way a registry clerk would.
//
// This is not render-all.js. That one fills fields with "TEST FIELD NAME" to prove a schema
// renders; it is a machine check and reads like one. This one fills them with facts that
// belong together, so the page can be judged as a document: the same parties, the same
// title, the same lender and the same dates across all seventy forms.
//
// The matter: Peter Kamau Njoroge sells Kikuyu/Kikuyu/T.1234 at Gitaru to Grace Wanjiru
// Mwangi for Kshs. 8,500,000, ten per cent down, completing 22nd December 2026, the title
// charged to Tumaini Bank Limited. Every name is invented.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const SCRIPTS = path.dirname(DIR);
const FIX = path.join(SCRIPTS, 'test-fixtures');
const SOURCE_GEN = path.join(SCRIPTS, 'generate-conveyancing-document.js');
const BUNDLE_GEN = path.join(SCRIPTS, 'generate-conveyancing-document.bundle.js');

const USAGE = 'usage: node render-gallery.js <outDir> [--pdf] [--bundle] [ids...]';
const argv = process.argv.slice(2);
const KNOWN = ['--pdf', '--bundle'];
const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN.includes(a));
if (unknown.length) { console.error(`render-gallery: unknown flag ${unknown.join(' ')}`); console.error(USAGE); process.exit(2); }
const wantPdf = argv.includes('--pdf');
const wantBundle = argv.includes('--bundle');
const rest = argv.filter((a) => !a.startsWith('--'));
const outDir = rest.shift();
if (!outDir) { console.error(USAGE); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

const hasDeps = fs.existsSync(path.join(SCRIPTS, 'node_modules', 'docx'));
const GEN = (wantBundle || !hasDeps) ? BUNDLE_GEN : SOURCE_GEN;

const ids = rest.length ? rest
  : fs.readdirSync(DIR).filter((f) => /^(lra|lcb)_\d+\.json$/.test(f)).map((f) => f.replace('.json', ''))
      .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]));

// ── The matter ────────────────────────────────────────────────────────────────
const VENDOR = 'PETER KAMAU NJOROGE';
const PURCHASER = 'GRACE WANJIRU MWANGI';
const LENDER = 'TUMAINI BANK LIMITED';
const TITLE = 'Kikuyu/Kikuyu/T.1234';
const ADVOCATE = {
  record_id: 'recWq7T2mZ9xK4Lpz', signin_id: 'recSg1A2b3C4d5E6f',
  name: 'Wanjiku Mutahi', name_caps: 'WANJIKU MUTAHI',
  p105_no: 'P.105/0000/00', practice_no: 'LSK/26/00000',
  practice_year: '2026', email: 'advocate@example.law',
};

const BASE = {
  date: '23rd September 2026',
  property_lr_no: TITLE,
  property_location: 'Gitaru, Kikuyu Sub-County, Kiambu County',
  vendor_name: VENDOR, vendor_id: '22334455',
  purchaser_name: PURCHASER, purchaser_id: '33445566',
  purchase_price_words: 'Eight Million Five Hundred Thousand Shillings',
  purchase_price_figures: '8,500,000',
  sworn_at: 'Nairobi',
  declaration_text: 'THAT I am the registered proprietor of all that parcel of land known as ' + TITLE + '.\nTHAT the facts deposed to herein are within my own knowledge save where stated to be on information and belief.\nTHAT I make this declaration conscientiously believing the same to be true.',
  advocate: ADVOCATE,
};

// One value per field the library asks for. Written so a page reads as a filled form and
// not as a test: a registry clerk reading it should have to look twice to see it is a
// specimen. Every name is invented.
const VALUES = {
  additional_conditions: 'The Chargor shall not create any further charge over the Property without the prior written consent of the Chargee.',
  additional_provisions: 'The parties agree that the covenants set out in the Schedule hereto shall run with the land.',
  adjoining_proprietors: 'Samuel Gitau Kariuki of L.R. No. Kikuyu/Kikuyu/T.1235 and Mary Nyokabi Waweru of L.R. No. Kikuyu/Kikuyu/T.1233',
  applicant_address: 'P.O. Box 4411-00100, Nairobi',
  applicant_address_for_service: 'care of the Advocates on record, P.O. Box 7788-00100, Nairobi',
  applicant_addresses: 'P.O. Box 4411-00100, Nairobi',
  applicant_email: 'gmwangi@example.com',
  applicant_names: PURCHASER,
  applicant_pin: 'A009988776J',
  applicant_telephone: '+254 722 000 111',
  bankrupt_name: 'JOSEPH MWANGI KAMAU',
  basis_of_entitlement: 'Surviving spouse of the deceased registered proprietor, by virtue of a grant of letters of administration confirmed on 14th August 2026',
  borrower_name: PURCHASER,
  cadastral_plan: 'Cadastral Plan No. 401/2026 lodged at the Survey of Kenya',
  case_number: 'Nairobi ELC Case No. 214 of 2026',
  cause_of_destruction: 'Destroyed by fire at the proprietor’s residence on 3rd March 2026',
  caution_date: '10th September 2026',
  caution_scope: 'The whole of the land comprised in the title',
  cautioner_address: 'P.O. Box 4411-00100, Nairobi',
  cautioner_pin: 'A009988776J',
  charge_date: '12th March 2019',
  charge_entry_number: '7',
  charge_entry_numbers: '7',
  charge_registration: 'Registered on 12th March 2019 as Entry No. 7 in the Encumbrances Section',
  chargor_name: VENDOR,
  // Seven fields fill a table and the schema tells the drafter the columns, separated by a
  // pipe, one row per line. Prose in these reads as one cell filled and the rest blank.
  combination_schedule: 'CP 401/2026 | Kikuyu/Kikuyu/T.1240 | 0.0900 ha',
  company_address: 'P.O. Box 9912-00100, Nairobi',
  company_name: LENDER,
  company_registration_no: 'CPR/2009/112233',
  conditions: 'The transfer is subject to the conditions endorsed on the certificate of title.',
  consideration: 'Kshs. 8,500,000',
  continuing_proprietors: PURCHASER,
  court_case_no: 'Nairobi ELC Case No. 214 of 2026',
  court_case_parties: 'Grace Wanjiru Mwangi versus Peter Kamau Njoroge',
  court_order_details: 'Order of the Environment and Land Court at Nairobi issued on 2nd September 2026 in ELC Case No. 214 of 2026',
  date_of_auction: '18th August 2026',
  date_of_charge: '12th March 2019',
  date_of_confirmation: '14th August 2026',
  date_of_court_order: '2nd September 2026',
  date_of_easement: '1st June 2020',
  date_of_grant: '2nd May 2026',
  deceased_joint_proprietor: 'JAMES NJOROGE KAMAU',
  deceased_name: 'JAMES NJOROGE KAMAU',
  deceased_proprietor: 'JAMES NJOROGE KAMAU',
  declarant_id_number: '22334455',
  declarant_name: VENDOR,
  declarant_po_box: 'P.O. Box 1123-00902, Kikuyu',
  declarant_postal_address: 'P.O. Box 1123-00902, Kikuyu',
  demised_premises: 'All that maisonette known as House No. 14 erected on ' + TITLE,
  documents_deposited: 'Original certificate of title and the duly executed transfer',
  dominant_land: 'Kikuyu/Kikuyu/T.1235',
  donee_address_for_service: 'care of the Advocates on record, P.O. Box 7788-00100, Nairobi',
  donee_email_address: 'gmwangi@example.com',
  donee_pin: 'A009988776J',
  donee_postal_address: 'P.O. Box 4411-00100, Nairobi',
  donee_registration_no: '',
  donee_tel_no: '+254 722 000 111',
  donor_pin: 'A001122334K',
  enclosed_documents: 'Original certificate of title | Kikuyu/Kikuyu/T.1234 | Yes\nDuly executed Transfer (LRA 33) | Kikuyu/Kikuyu/T.1234 | Yes\nDischarge of Charge (LRA 58) | Kikuyu/Kikuyu/T.1234 | Yes\nLand rent and rates clearance certificates | Kikuyu/Kikuyu/T.1234 | Yes',
  encumbrancer_po_box: '9912-00100',
  entry_no_encumbrances: '7',
  entry_numbers: '7',
  exhibit_mark_abstract: 'PKN-1',
  exhibit_mark_search: 'PKN-2',
  further_supporting_document: '',
  grounds: 'The Applicant has paid a deposit of Kshs. 850,000 under an Agreement for Sale dated 23rd September 2026.\nThe Proprietor has intimated an intention to deal with the land before completion.\nThe Applicant apprehends that a dealing registered before completion would occasion irreparable loss.',
  grounds_of_objection: 'The Objector is a beneficiary under the estate of the deceased registered proprietor and was not consulted.',
  guarantor: 'SAMUEL GITAU KARIUKI',
  instruments_presented: '12th March 2019 | Discharge of Charge | Kikuyu/Kikuyu/T.1234 | BK 4417 | \n23rd September 2026 | Transfer of Interest in Land | Kikuyu/Kikuyu/T.1234 | BK 4418 | ',
  interest_claimed: 'Purchaser’s interest under an Agreement for Sale dated 23rd September 2026',
  joint_proprietors_addresses: 'P.O. Box 1123-00902, Kikuyu',
  joint_proprietors_on_register: VENDOR + ' and JAMES NJOROGE KAMAU',
  land_control_board: 'Kikuyu',
  land_registry: 'Kiambu',
  official_reference: '',
  management_company: 'Gitaru Gardens Management Company Limited',
  marriage_certificate_date: '12th December 2015',
  marriage_law: 'the Marriage Act, 2014',
  nature_of_easement: 'Right of way six metres wide along the eastern boundary',
  nature_of_interest: 'Purchaser’s interest under an Agreement for Sale',
  nature_of_interest_in_land: 'Beneficiary under the estate of the deceased registered proprietor',
  nature_of_rectification: 'Correction of the proprietor’s name from Peter Kamau Njoro to Peter Kamau Njoroge',
  order_date: '2nd September 2026',
  outstanding_amount: 'Kshs. 3,200,000',
  owner_po_box: '9912-00100',
  parcel_schedule: 'Kikuyu/Kikuyu/T.1234 | 0.0450 | Sheet 12',
  partition_schedule: 'CP 401/2026 | Kikuyu/Kikuyu/T.1236 | 0.0225 ha | PETER KAMAU NJOROGE\nCP 401/2026 | Kikuyu/Kikuyu/T.1237 | 0.0225 ha | GRACE WANJIRU MWANGI',
  period_of_easement: 'In perpetuity',
  poa_docs_no_1: 'P.A. 4417',
  poa_docs_no_2: 'P.A. 4418',
  poa_docs_registry: 'Nairobi',
  poa_lands_no_1: 'I.R. 88213/1',
  poa_lands_no_2: 'I.R. 88213/2',
  poa_lands_registry: 'Nairobi',
  power_of_attorney_number: 'P.A. 4417',
  presentor_email: 'info@example.law',
  presentor_name: 'The Advocates on record',
  presentor_postal_address: 'P.O. Box 7788-00100, Nairobi',
  presentor_tel_no: '+254 704 000 000',
  principal_amount: 'Kshs. 6,000,000',
  property_released: 'Kikuyu/Kikuyu/T.1235',
  proposed_document: 'Transfer of Interest in Land',
  proprietor_address: 'P.O. Box 1123-00902, Kikuyu',
  proprietor_citizenship: 'Kenyan',
  proprietor_of_dominant_land: 'SAMUEL GITAU KARIUKI',
  proprietor_pin: 'A001122334K',
  proprietor_spouse_of: VENDOR,
  proprietors_address: 'P.O. Box 1123-00902, Kikuyu',
  proprietors_details: VENDOR + ' of P.O. Box 1123-00902, Kikuyu, ID No. 22334455',
  proprietors_grantors: VENDOR,
  rectifications: 'The proprietor’s name in the Proprietorship Section to read Peter Kamau Njoroge.',
  registered_proprietor: VENDOR,
  registered_proprietor_address: 'P.O. Box 1123-00902, Kikuyu',
  registered_proprietor_donor: VENDOR + ', ID No. 22334455, PIN A001122334K',
  registered_proprietor_id: '22334455',
  registered_proprietor_name: VENDOR,
  registered_proprietors: VENDOR,
  rent_or_stand_premium: 'Kshs. 120,000 per annum',
  reparcellation_schedule: 'CP 402/2026 | Kikuyu/Kikuyu/T.1238 | 0.0300 ha | PETER KAMAU NJOROGE\nCP 402/2026 | Kikuyu/Kikuyu/T.1239 | 0.0300 ha | GRACE WANJIRU MWANGI\nCP 402/2026 | Kikuyu/Kikuyu/T.1240 | 0.0300 ha | SAMUEL GITAU KARIUKI',
  restriction_date: '10th September 2026',
  restriction_duration: 'Until completion of the sale or further order of the Registrar',
  restriction_nature: 'No dealing of any kind is to be registered without the written consent of the Applicant',
  search_date: '15th September 2026',
  second_or_subsequent_chargee: 'HAZINA SACCO SOCIETY LIMITED',
  sectional_plan: 'Sectional Plan No. SP/2026/117',
  service_charge: 'Kshs. 8,000 per month',
  servient_land: TITLE,
  share_proprietor_1: VENDOR + ' as to one half',
  share_proprietor_2: PURCHASER + ' as to one half',
  share_proprietor_3: '',
  share_proprietor_4: '',
  special_instructions: '',
  specific_powers: 'To sell, transfer and give a good receipt for the proceeds of sale of ' + TITLE + '.',
  supplemental_collateral: 'Supplemental to the Debenture dated 12th March 2019',
  supporting_documents: 'Certified copy of the grant of letters of administration; official search issued 15th September 2026',
  tenancy_in_common_shares: 'One half to each of the proprietors',
  // Tenants in common are co-owners, not lessees. The schema's prompt asks for each one's
  // name, PIN, identity number and address, numbered as the form prints them.
  tenants_details: '1. PETER KAMAU NJOROGE, PIN A001122334K, ID 22334455, P.O. Box 1123-00902, Kikuyu\n2. GRACE WANJIRU MWANGI, PIN A009988776J, ID 33445566, P.O. Box 4411-00100, Nairobi',
  term: 'Ninety nine (99) years from 1st January 2000',
  transferee_poa_docs_no_1: 'P.A. 4419',
  transferee_poa_docs_no_2: 'P.A. 4420',
  transferee_poa_lands_no_1: 'I.R. 88214/1',
  transferee_poa_lands_no_2: 'I.R. 88214/2',
  transferee_poa_lands_registry: 'Nairobi',
  transferor_poa_docs_no_1: 'P.A. 4417',
  transferor_poa_docs_no_2: 'P.A. 4418',
  transferor_poa_lands_no_1: 'I.R. 88213/1',
  transferor_poa_lands_no_2: 'I.R. 88213/2',
  transferor_poa_lands_registry: 'Nairobi',
  trust_beneficiary: 'ESTHER NYAMBURA NJOROGE',
  undivided_share_transferred: 'One undivided half share',
  undivided_shares: 'One half to each of the proprietors',
  variations: 'The interest rate is varied from 13% to 11% per annum with effect from 1st October 2026.',
};

// Patterns for anything a later schema adds, so a new field reads plausibly instead of
// shouting TEST at whoever is reading the page.
function fallback(name) {
  if (/date/i.test(name)) return '23rd September 2026';
  if (/(amount|price|sum|value|consideration|premium)/i.test(name)) return 'Kshs. 8,500,000';
  if (/(fee|rent|charge)/i.test(name)) return 'Kshs. 120,000';
  if (/(pin)$/i.test(name)) return 'A001122334K';
  if (/(email)/i.test(name)) return 'advocate@example.law';
  if (/(tel|phone)/i.test(name)) return '+254 704 000 000';
  if (/(box|postal|address)/i.test(name)) return 'P.O. Box 7788-00100, Nairobi';
  if (/(no|number)$/i.test(name)) return '7';
  if (/name/i.test(name)) return VENDOR;
  return 'To be completed by the advocate';
}

const env = { ...process.env };
if (!env.KENYA_CONVEYANCING_FIRM_CONFIG) {
  env.KENYA_CONVEYANCING_FIRM_CONFIG = path.join(FIX, 'firm-config.json');
  env.KENYA_CONVEYANCING_ASSETS_DIR = path.join(FIX, 'assets');
  env.KENYA_CONVEYANCING_USER_CONFIG = '';
  env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'render-gallery-home-'));
}

let failures = 0;
const made = [];
for (const id of ids) {
  const schemaPath = path.join(DIR, id + '.json');
  if (!fs.existsSync(schemaPath)) { console.error(`FAIL  ${id}: no schema at ${schemaPath}`); failures++; continue; }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = { ...BASE, doc_type: id };
  for (const cf of (schema.custom_fields || [])) {
    const v = Object.prototype.hasOwnProperty.call(VALUES, cf.name) ? VALUES[cf.name] : fallback(cf.name);
    // An empty string in the table means "this is the row the Ministry marks optional and a
    // reader should see it blank". Only set it where the schema agrees it is optional.
    if (v === '' && cf.required !== false) continue;
    if (v !== '') data[cf.name] = v;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-gallery-'));
  const dataPath = path.join(tmp, id + '.json');
  const outPath = path.join(outDir, id + '.docx');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const r = spawnSync('node', [GEN, dataPath, outPath], { encoding: 'utf8', env });
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    console.error(`FAIL  ${id}`);
    if (r.stderr) console.error(r.stderr.trim());
    failures++;
    continue;
  }
  made.push({ id, outPath, title: schema.doc_title, number: schema.form_number, when: schema.when_used || '' });
  console.log(`ok    ${id}  ${schema.form_number}  ${schema.doc_title}`);
}

if (wantPdf && made.length) {
  const soffice = ['/usr/local/bin/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice', 'soffice']
    .find((p) => p === 'soffice' || fs.existsSync(p));
  const conv = spawnSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, ...made.map((m) => m.outPath)], { encoding: 'utf8' });
  if (conv.status !== 0) console.error('render-gallery: pdf conversion reported a problem');
}

fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(made.map(({ id, title, number, when }) => ({ id, number, title, when })), null, 2));
console.log(`render-gallery: ${made.length} rendered, ${failures} failed`);
process.exit(failures ? 1 : 0);
