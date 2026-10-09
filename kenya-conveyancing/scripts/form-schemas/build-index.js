#!/usr/bin/env node
// scripts/form-schemas/build-index.js: write _index.json, the one list of what this
// plugin drafts. Three sources feed it: the four forms with hand-built builders in
// generate-conveyancing-document.js (the static table below), every lra_NN.json in
// this directory, and the registrar documents in _excluded.json.
//   node scripts/form-schemas/build-index.js
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, '_source');

// The forms served by a custom builder in the generator, not by a schema file.
// Keep in step with LRA_TYPES and the buildLRAnn functions in the generator.
// form_number and regulation follow _source, including the Ministry's own spelling
// (LRA-58 is hyphenated). Where the official text carries a glaring typo, regulation
// is the corrected string that is published and printed, and regulation_official keeps
// the Ministry's spelling for the check; verifyStatic below matches regulation_official
// when it is present, regulation otherwise, and fails the build on drift.
const CUSTOM = [
  {
    form_id: 'lra_33', form_number: 'LRA 33', doc_title: 'TRANSFER OF INTEREST IN LAND', regulation: '(r. 49(1))',
    category: 'instrument', party_mode: 'two_party', custom_fields: [], pairs_with_lra9: true,
    party_roles: { transferor: 'Transferor(s)', transferor_single: 'Transferor', transferee: 'Transferee(s)', transferee_single: 'Transferee' },
    when_used: 'Transfers a registered interest in land from the transferor to the transferee for registration at the land registry.',
  },
  {
    form_id: 'lra_58', form_number: 'LRA-58', doc_title: 'DISCHARGE OF CHARGE', regulation: '(r. 74(1))',
    category: 'instrument', party_mode: 'two_party', custom_fields: [], pairs_with_lra9: true,
    // the chargee discharges, so the chargee is the party passed first
    party_roles: { transferor: 'Chargee(s)', transferor_single: 'Chargee', transferee: 'Chargor(s)', transferee_single: 'Chargor' },
    when_used: 'Releases a charge over a title once the secured debt has been repaid.',
  },
  {
    form_id: 'lra_63', form_number: 'LRA 63', doc_title: 'TRANSFER OF LEASE', regulation: '(r. 76(2)(g), 77(2)(g))',
    category: 'instrument', party_mode: 'two_party', custom_fields: [], pairs_with_lra9: true,
    party_roles: { transferor: 'Transferor(s)', transferor_single: 'Transferor', transferee: 'Transferee(s)', transferee_single: 'Transferee' },
    when_used: 'Transfers a registered lease from the transferor to the transferee for registration at the land registry.',
  },
  {
    form_id: 'lra_84', form_number: 'LRA 84', doc_title: 'APPLICATION FOR OFFICIAL SEARCH', regulation: '(r. 86(1))', regulation_official: '(r. 86(1)',
    category: 'application', party_mode: 'single_party', custom_fields: [], pairs_with_lra9: false,
    party_roles: { transferor: 'Applicant', transferor_single: 'Applicant' },
    when_used: 'Asks the land registry for an official search of the register of a title.',
  },
];

// The same rule the lint applies to a schema, applied to the static table: the form
// number and the regulation must be in the official text, or the build stops.
const norm = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').replace(/…/g, '...').trim().toLowerCase();
function verifyStatic() {
  const problems = [];
  for (const c of CUSTOM) {
    const n = String(c.form_number).replace(/\D/g, '');
    const p = path.join(SRC, `lra-${n}.txt`);
    if (!fs.existsSync(p)) { problems.push(`${c.form_id}: no official text at ${p}`); continue; }
    const src = norm(fs.readFileSync(p, 'utf8'));
    if (!src.includes(norm('form ' + c.form_number))) problems.push(`${c.form_id}: official text does not carry "Form ${c.form_number}"`);
    const reg = c.regulation_official === undefined ? c.regulation : c.regulation_official;
    if (!src.includes(norm(reg))) problems.push(`${c.form_id}: regulation "${reg}" not found in the official text`);
    // the role words are the form's own, so they are checked against it too
    for (const label of Object.values(c.party_roles || {})) {
      const word = norm(label).replace(/\(s\)$/, '');
      if (word && !src.includes(word)) problems.push(`${c.form_id}: party role "${label}" not found in the official text`);
    }
  }
  if (problems.length) {
    problems.forEach(p => console.error('FAIL  ' + p));
    console.error(`build-index: ${problems.length} static entry problem(s). The custom table must match _source.`);
    process.exit(1);
  }
}
verifyStatic();

const formNumberOrder = (f) => Number(String(f.form_number).replace(/\D/g, '')) || 0;

function schemaEntries() {
  return fs.readdirSync(DIR)
    .filter(f => /^(lra|lcb)_\d+\.json$/.test(f))
    .map((f) => {
      const s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      return {
        form_id: s.form_id,
        form_number: s.form_number,
        doc_title: s.doc_title,
        regulation: s.regulation,
        party_roles: s.party_roles || {},
        // only where the Ministry's own spelling differs from the one that prints
        ...(s.regulation_official === undefined ? {} : { regulation_official: s.regulation_official }),
        category: s.category,
        party_mode: s.party_mode,
        when_used: s.when_used,
        custom_fields: (s.custom_fields || []).map(c => c.name),
        pairs_with_lra9: !!s.pairs_with_lra9,
        builder: 'schema',
      };
    });
}

const forms = [...CUSTOM.map(c => ({ ...c, builder: 'custom' })), ...schemaEntries()]
  .sort((a, b) => formNumberOrder(a) - formNumberOrder(b));

const dupes = forms.map(f => f.form_id).filter((id, i, all) => all.indexOf(id) !== i);
if (dupes.length) {
  console.error(`build-index: ${dupes.join(', ')} is served by both a custom builder and a schema file. One form, one builder.`);
  process.exit(1);
}

const excluded = JSON.parse(fs.readFileSync(path.join(DIR, '_excluded.json'), 'utf8')).excluded;

const index = {
  built: new Date().toISOString().slice(0, 10),
  forms,
  excluded,
};
fs.writeFileSync(path.join(DIR, '_index.json'), JSON.stringify(index, null, 2) + '\n');

const custom = forms.filter(f => f.builder === 'custom').length;
console.log(`_index.json: ${forms.length} form(s) (${custom} custom builder(s), ${forms.length - custom} schema(s)), ${excluded.length} excluded.`);
