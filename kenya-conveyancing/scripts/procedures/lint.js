#!/usr/bin/env node
// scripts/procedures/lint.js [slug...]
//
// Proves that every procedure schema quotes law that actually exists.
//
// The form library is trustworthy because it is transcription and a lint proves it. A
// procedure library is judgment, so it needs the separation this lint enforces: a
// statutory_basis entry carries a `quote`, which is the statute's own words and must
// appear verbatim in the cached source, and an `effect`, which is our reading and is
// labelled as ours. The lint proves the quote. Nothing can prove the reading, which is
// why `verified_by` exists and why an advocate signs it off.
//
// This is not defensive engineering for its own sake. Asked for the Land Control Act by
// name, the Kenya Law MCP in this project returned the Air Passenger Service Charge Act.
// A procedure library built on model recall is a hallucination engine wearing a citation.
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, '_source');

// The same collapsing the form lint uses: a run of dots or underscores in a statute's
// printed text is a blank, and whitespace differs between a web rendering and a PDF.
const norm = (s) => String(s)
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/[.…_]{2,}/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const sources = new Map();
function source(slug) {
  if (sources.has(slug)) return sources.get(slug);
  const p = path.join(SRC, slug + '.txt');
  if (!fs.existsSync(p)) { sources.set(slug, null); return null; }
  const raw = fs.readFileSync(p, 'utf8');
  const asAt = (raw.match(/^# as at:\s*(.+)$/m) || [])[1] || 'unknown';
  const fetched = (raw.match(/^# fetched:\s*(.+)$/m) || [])[1] || 'unknown';
  const body = norm(raw.replace(/^#.*$/gm, ''));
  const v = { body, asAt, fetched };
  sources.set(slug, v);
  return v;
}

const REQUIRED = ['transaction_id', 'name', 'triggers', 'statutory_basis', 'bundle', 'verified_by'];
const STALE_AFTER_DAYS = 365;

const only = process.argv.slice(2);
const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .filter((f) => !only.length || only.includes(f.replace('.json', '')));

if (!files.length) { console.error('lint: no procedure schemas found'); process.exit(2); }

let errors = 0, warnings = 0, checked = 0;
const fail = (m) => { console.error(`FAIL  ${m}`); errors++; };
const warn = (m) => { console.error(`WARN  ${m}`); warnings++; };

for (const file of files) {
  const id = file.replace('.json', '');
  let s;
  try { s = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')); }
  catch (e) { fail(`${id}: not valid JSON, ${e.message}`); continue; }

  for (const k of REQUIRED) {
    if (s[k] === undefined || s[k] === '' || (Array.isArray(s[k]) && !s[k].length)) {
      fail(`${id}: missing "${k}". A procedure nobody has signed off does not ship.`);
    }
  }
  if (s.transaction_id && s.transaction_id !== id) {
    fail(`${id}: transaction_id is "${s.transaction_id}" but the file is ${file}`);
  }

  for (const [i, b] of (s.statutory_basis || []).entries()) {
    const where = `${id} statutory_basis[${i}]`;
    for (const k of ['act', 'source', 'provision', 'quote', 'effect']) {
      if (!b[k]) { fail(`${where}: missing "${k}"`); }
    }
    if (!b.source || !b.quote) continue;
    const src = source(b.source);
    if (!src) {
      fail(`${where}: no cached source at _source/${b.source}.txt. Run fetch-source.js before quoting it.`);
      continue;
    }
    checked++;
    if (!src.body.includes(norm(b.quote))) {
      fail(`${where}: the quote for ${b.act} ${b.provision} does not appear in _source/${b.source}.txt.\n` +
           `        quote: ${String(b.quote).slice(0, 120)}${String(b.quote).length > 120 ? '...' : ''}\n` +
           '        Either it is misquoted, or it is from a different provision, or the Act has been amended since it was cached.');
    }
    if (src.fetched !== 'unknown') {
      const age = Math.floor((Date.now() - Date.parse(src.fetched)) / 86400000);
      if (age > STALE_AFTER_DAYS) {
        warn(`${where}: _source/${b.source}.txt was fetched ${age} days ago (law as at ${src.asAt}). Re-fetch and re-read before relying on it.`);
      }
    }
  }

  // Every form the bundle names has to be one the plugin can actually draw.
  const index = path.join(DIR, '..', 'form-schemas', '_index.json');
  if (fs.existsSync(index)) {
    const idx = JSON.parse(fs.readFileSync(index, 'utf8'));
    const forms = idx.forms || idx;
    const known = new Set((Array.isArray(forms) ? forms : Object.values(forms)).map((f) => f.form_id));
    for (const [i, step] of (s.bundle || []).entries()) {
      if (!step.form_id) { fail(`${id} bundle[${i}]: missing form_id`); continue; }
      if (!known.has(step.form_id)) {
        fail(`${id} bundle[${i}]: "${step.form_id}" is not a form this plugin draws. Check _index.json.`);
      }
      if (step.required === false && !step.condition) {
        fail(`${id} bundle[${i}] (${step.form_id}): conditional, but no condition says when it applies.`);
      }
    }

    // Robin's point that some forms are used instead of others. A declared alternative has to
    // be mutually declared, or a drafter reading one entry never learns the other exists and
    // lodges both, which tells the registry the advocate has not decided what is happening.
    const byForm = new Map((s.bundle || []).map((b) => [b.form_id, b]));
    for (const step of (s.bundle || [])) {
      if (!step.alternative_to) continue;
      const other = byForm.get(step.alternative_to);
      if (!other) {
        fail(`${id} bundle (${step.form_id}): names "${step.alternative_to}" as its alternative, but that form is not in the bundle.`);
      } else if (other.alternative_to !== step.form_id) {
        fail(`${id} bundle (${step.form_id}): says its alternative is "${step.alternative_to}", but that one does not say the same back. An alternative is a pair or it is a mistake.`);
      }
    }
    for (const [i, a] of (s.alternatives || []).entries()) {
      for (const f of (a.choose_between || [])) {
        if (!byForm.has(f)) fail(`${id} alternatives[${i}]: "${f}" is not in the bundle.`);
      }
      if (!a.decided_by) fail(`${id} alternatives[${i}]: missing "decided_by". An alternative nobody can choose between is not guidance.`);
    }
  }

  // A consent that can void a transaction has to say what happens if it is missed.
  for (const [i, c] of (s.consents || []).entries()) {
    for (const k of ['name', 'when_required', 'authority', 'consequence_if_missed']) {
      if (!c[k]) fail(`${id} consents[${i}]: missing "${k}". A consent with no stated consequence teaches nobody why it matters.`);
    }
  }
}

console.log(`lint: ${files.length} procedure(s), ${checked} quote(s) proved against cached law, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
