#!/usr/bin/env node
// scripts/form-schemas/render-all.js <outDir> [--pdf] [--bundle] [ids...]
// Render every library form (or just the ids given) with fixture data, so a schema
// can be read the way the registry will read it. Writes <outDir>/<form_id>.docx and
// exits non-zero if any form fails.
//   --pdf     also convert the outputs with soffice, for a page by page read
//   --bundle  render through generate-conveyancing-document.bundle.js
// With KENYA_CONVEYANCING_FIRM_CONFIG unset it renders against the fixture firm in
// scripts/test-fixtures, in an isolated HOME, so the output never carries a real firm.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const SCRIPTS = path.dirname(DIR);
const FIX = path.join(SCRIPTS, 'test-fixtures');
const SOURCE_GEN = path.join(SCRIPTS, 'generate-conveyancing-document.js');
const BUNDLE_GEN = path.join(SCRIPTS, 'generate-conveyancing-document.bundle.js');

const USAGE = 'usage: node render-all.js <outDir> [--pdf] [--bundle] [--sparse] [ids...]';
const argv = process.argv.slice(2);
const KNOWN = ['--pdf', '--bundle', '--sparse'];
const unknown = argv.filter(a => a.startsWith('--') && !KNOWN.includes(a));
if (unknown.length) {
  console.error(`render-all: unknown flag ${unknown.join(' ')}`);
  console.error(USAGE);
  process.exit(2);
}
const wantPdf = argv.includes('--pdf');
const wantBundle = argv.includes('--bundle');
const rest = argv.filter(a => !a.startsWith('--'));
const outDir = rest.shift();
if (!outDir) {
  console.error(USAGE);
  process.exit(2);
}
fs.mkdirSync(outDir, { recursive: true });

// The source generator needs scripts/node_modules; where that is not installed (a
// client build, or the preflight's read-only sandbox simulation) the bundle is used.
const hasDeps = fs.existsSync(path.join(SCRIPTS, 'node_modules', 'docx'));
const GEN = (wantBundle || !hasDeps) ? BUNDLE_GEN : SOURCE_GEN;

const ids = rest.length ? rest : fs.readdirSync(DIR).filter(f => /^(lra|lcb)_\d+\.json$/.test(f)).map(f => f.replace('.json', ''));

// The same facts the tests use, so a rendered form reads like a filled one.
const BASE = {
  date: '22nd September 2026',
  property_lr_no: 'TEST/BLOCK 1/1',
  property_location: 'Test Estate, Nairobi',
  vendor_name: 'JANE ROE', vendor_id: '87654321',
  purchaser_name: 'JOHN DOE', purchaser_id: '12345678',
  purchase_price_words: 'One Million', purchase_price_figures: '1,000,000',
  sworn_at: 'Nairobi',
};

function fixtureValue(name) {
  if (/date/i.test(name)) return '1st January 2026';
  if (/(amount|price|sum|value|consideration|fee|rent)/i.test(name)) return '1,000,000';
  return 'TEST ' + name.replace(/_/g, ' ').toUpperCase();
}

const env = { ...process.env };
if (!env.KENYA_CONVEYANCING_FIRM_CONFIG) {
  env.KENYA_CONVEYANCING_FIRM_CONFIG = path.join(FIX, 'firm-config.json');
  env.KENYA_CONVEYANCING_ASSETS_DIR = path.join(FIX, 'assets');
  env.KENYA_CONVEYANCING_USER_CONFIG = '';
  env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'render-all-home-'));
}

const SPARSE = process.argv.includes('--sparse');
let failures = 0;
const made = [];
for (const id of ids) {
  const schemaPath = path.join(DIR, id + '.json');
  if (!fs.existsSync(schemaPath)) { console.error(`FAIL  ${id}: no schema at ${schemaPath}`); failures++; continue; }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const data = { ...BASE, doc_type: id };
  // --sparse omits every field the schema itself declares optional, which is how a drafter
  // with an individual donee or no second proprietor actually fills the form. Filling them
  // all is what hid the defect that made 25 forms refuse legitimate input: a placeholder on
  // an optional field was being treated as a missing fact. Render both ways or see neither.
  for (const cf of (schema.custom_fields || [])) {
    if (SPARSE && cf.required === false) continue;
    data[cf.name] = fixtureValue(cf.name);
  }
  // declaration_text is not in every schema's custom_fields, so the sparse pass must still
  // supply it unless the schema itself declares it optional.
  const declaresOptional = (schema.custom_fields || [])
    .some(cf => cf.name === 'declaration_text' && cf.required === false);
  if (!(SPARSE && declaresOptional)) data.declaration_text = 'Line one.\nLine two.';

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-all-'));
  const dataPath = path.join(tmp, id + '.json');
  const outPath = path.join(outDir, id + '.docx');
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  const r = spawnSync('node', [GEN, dataPath, outPath], { encoding: 'utf8', env });
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    console.error(`FAIL  ${id}`);
    if (r.stderr) console.error(r.stderr.trim());
    if (r.stdout) console.error(r.stdout.trim());
    failures++;
    continue;
  }
  made.push(outPath);
  console.log(`ok    ${id} -> ${outPath}`);
}

if (wantPdf && made.length) {
  const r = spawnSync('soffice', ['--headless', '--convert-to', 'pdf', '--outdir', outDir, ...made], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('FAIL  soffice pdf conversion');
    if (r.stderr) console.error(r.stderr.trim());
    failures++;
  } else {
    console.log(`pdf   ${made.length} file(s) converted into ${outDir}`);
  }
}

console.log(`render-all: ${made.length} rendered, ${failures} failed (${path.basename(GEN)})`);
process.exit(failures ? 1 : 0);
