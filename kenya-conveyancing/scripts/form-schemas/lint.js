#!/usr/bin/env node
// scripts/form-schemas/lint.js [ids...]: every schema against the official text. Exit 1 on any problem.
const fs = require('fs'); const path = require('path');
const DIR = __dirname; const SRC = path.join(DIR, '_source');
// A form's official text is named for its family: lra-33.txt, lcb-1.txt. The library began
// LRA-only and gained the Land Control Board's prescribed consent form, which is made under
// different regulations entirely.
const sourceFileFor = (id, formNumber) => {
  const family = String(id || '').startsWith('lcb_') ? 'lcb' : 'lra';
  const n = String(formNumber || id || '').replace(/\D/g, '');
  return path.join(SRC, `${family}-${n}.txt`);
};
const REQ = ['form_id', 'form_number', 'regulation', 'doc_title', 'doc_title_official', 'source', 'category', 'when_used', 'party_mode', 'party_roles', 'detail_rows', 'body_text', 'execution', 'custom_fields', 'pairs_with_lra9'];
// \x07 is the cell marker macOS textutil leaves where a table cell ends: it is not
// text of the form, and a paragraph that spans a cell boundary could never match
// while it was treated as one. It normalises away like whitespace.
const norm = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\x07/g, ' ').replace(/\s+/g, ' ').replace(/…/g, '...').trim().toLowerCase();
const strip = (s) => norm(String(s).replace(/\{\{\w+\}\}/g, ' '));
function lintOne(id, problems) {
  const p = path.join(DIR, id + '.json'); let s;
  try { s = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { problems.push(`${id}: not valid JSON (${e.message})`); return; }
  for (const k of REQ) if (s[k] === undefined) problems.push(`${id}: missing ${k}`);
  if (s.form_id !== id) problems.push(`${id}: form_id "${s.form_id}" does not match the file name`);
  const srcPath = sourceFileFor(id, s.form_number);
  if (!fs.existsSync(srcPath)) { problems.push(`${id}: no official text at ${srcPath}`); return; }
  // A source file may carry a provenance header. Those lines are ours, not the form's.
  const readSource = (p) => fs.readFileSync(p, 'utf8').replace(/^#.*$/gm, '');
  const src = norm(readSource(srcPath)); const srcTight = src.replace(/\s/g, '');
  const n = String(s.form_number || '').replace(/\D/g, '');
  // The registry forms head themselves "Form LRA 33". The Land Control Board's consent
  // application heads itself "FORM 1" in the Schedule to its own regulations, so the
  // heading check follows the family rather than assuming every form is an LRA one.
  const headed = id.startsWith('lcb_')
    ? new RegExp(`form[ -]?${n}\\b`).test(src)
    : new RegExp(`form lra[ -]?${n}\\b`).test(src);
  if (!headed) problems.push(`${id}: official text does not carry its own form number (${s.form_number})`);
  if (!src.includes(norm(s.regulation_official ?? s.regulation))) problems.push(`${id}: regulation "${s.regulation_official ?? s.regulation}" not found in the official text`);
  if (!srcTight.includes(norm(s.doc_title_official).replace(/\s/g, ''))) problems.push(`${id}: doc_title_official not found verbatim in the official text`);
  for (const b of s.body_text || []) { const official = b.text_official ?? b.text ?? ''; const t = strip(official); if (!t) continue; const probe = t.slice(0, 40).replace(/\s/g, ''); if (probe.length >= 12 && !srcTight.includes(probe)) problems.push(`${id}: body text not in the official form: "${String(official).slice(0, 60)}"`); }
  const declared = new Set((s.custom_fields || []).map(c => c.name));
  const used = new Set(); const scan = (v) => { if (typeof v === 'string') for (const m of v.matchAll(/\{\{(\w+)\}\}/g)) used.add(m[1]); else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') Object.values(v).forEach(scan); };
  scan(s.detail_rows); scan(s.body_text); scan(s.annex);
  const base = new Set(['vendor_name', 'vendor_id', 'purchaser_name', 'purchaser_id', 'property_lr_no', 'property_location', 'purchase_price_words', 'purchase_price_figures', 'date', 'declaration_text', 'sworn_at']);
  for (const u of used) if (!declared.has(u) && !base.has(u)) problems.push(`${id}: placeholder {{${u}}} is not declared in custom_fields`);
  for (const k of ['when_used', 'doc_title']) if (/—/.test(s[k] || '')) problems.push(`${id}: em dash in ${k}`);
  if (!['two_party', 'single_party', 'none'].includes(s.party_mode)) problems.push(`${id}: bad party_mode`);
  if (!['deed', 'witnessed', 'declaration', 'signature', 'none'].includes((s.execution || {}).mode)) problems.push(`${id}: bad execution.mode`);
}
// ── Checks added after the seed forms, on the same rule: the official text decides ──

function readSchema(id) {
  try { return JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')); } catch (e) { return null; }
}

// Shapes lintOne does not cover: the registry block, and a signer the party mode
// cannot produce (single_party with a transferee signer prints an EXECUTION heading
// with nothing beneath it).
function lintExtra(id, problems) {
  const s = readSchema(id); if (!s) return;
  const rb = s.registry_block;
  const okRb = rb === undefined || rb === 'default' || rb === 'none'
    || (Array.isArray(rb) && rb.length > 0 && rb.every(l => typeof l === 'string'));
  if (!okRb) problems.push(`${id}: registry_block must be "default", "none", or a non-empty array of lines`);
  if (s.party_mode === 'single_party' && (s.execution || {}).signer === 'transferee') {
    problems.push(`${id}: party_mode "single_party" with execution.signer "transferee" signs nobody. Use "transferor" (or "both", which is the transferor here).`);
  }
  // An execution option that may be one string or { transferor, transferee }.
  const okSided = (v) => typeof v === 'string'
    || (v && typeof v === 'object' && !Array.isArray(v)
        && Object.keys(v).every(k => ['transferor', 'transferee'].includes(k))
        && Object.values(v).every(x => typeof x === 'string'));
  const exec = s.execution || {};
  for (const k of ['signed_label', 'signing_recital']) {
    if (exec[k] !== undefined && !okSided(exec[k])) problems.push(`${id}: execution.${k} must be a string or { transferor, transferee }`);
  }
  if (exec.verification_heading !== undefined && !okSided(exec.verification_heading)) problems.push(`${id}: execution.verification_heading must be a string or { transferor, transferee }`);
  if (exec.photograph !== undefined && typeof exec.photograph !== 'boolean') problems.push(`${id}: execution.photograph must be true or false`);
  if (exec.company_seal !== undefined && typeof exec.company_seal !== 'boolean') problems.push(`${id}: execution.company_seal must be true or false`);
  if (exec.signatory_cell !== undefined && !['default', 'attorney'].includes(exec.signatory_cell)) problems.push(`${id}: execution.signatory_cell must be "default" or "attorney"`);
  if (exec.verification_variant !== undefined && !['default', 'attorney'].includes(exec.verification_variant)) problems.push(`${id}: execution.verification_variant must be "default" or "attorney"`);

  // The head, per form: the filing box, the title line, any lines of the form's own.
  const isLines = (v) => Array.isArray(v) && v.length > 0 && v.every(l => typeof l === 'string');
  if (s.filing_box !== undefined && s.filing_box !== 'default' && s.filing_box !== 'none' && !isLines(s.filing_box)) {
    problems.push(`${id}: filing_box must be "default", "none", or a non-empty array of lines`);
  }
  if (s.title_line !== undefined && s.title_line !== 'default' && s.title_line !== 'none' && !isLines(s.title_line)) {
    problems.push(`${id}: title_line must be "default", "none", or a non-empty array of lines`);
  }
  if (s.head_lines !== undefined && !isLines(s.head_lines)) problems.push(`${id}: head_lines must be a non-empty array of lines`);
  if (s.act_lines !== undefined && !isLines(s.act_lines)) problems.push(`${id}: act_lines must be a non-empty array of lines`);
  if (s.pre_title_lines !== undefined && !isLines(s.pre_title_lines)) problems.push(`${id}: pre_title_lines must be a non-empty array of lines`);
  if (s.foot_notes !== undefined && !isLines(s.foot_notes)) problems.push(`${id}: foot_notes must be a non-empty array of lines`);
  for (const note of (Array.isArray(s.foot_notes) ? s.foot_notes : [])) if (/—/.test(note)) problems.push(`${id}: em dash in foot_notes`);
  const headKeys = [['head_lines', s.head_lines], ['act_lines', s.act_lines], ['pre_title_lines', s.pre_title_lines],
    ['filing_box', isLines(s.filing_box) ? s.filing_box : undefined],
    ['title_line', isLines(s.title_line) ? s.title_line : undefined],
    ['foot_notes', s.foot_notes]];
  // The recital and the certificate heading are the form's own words, so they face the
  // verbatim probe and the placeholder scan like every other text the schema carries.
  const sided = (v) => typeof v === 'string' ? [v]
    : (v && typeof v === 'object' && !Array.isArray(v) ? Object.values(v).filter(x => typeof x === 'string') : []);
  if (sided(exec.signing_recital).length) headKeys.push(['execution.signing_recital', sided(exec.signing_recital)]);
  if (sided(exec.verification_heading).length) headKeys.push(['execution.verification_heading', sided(exec.verification_heading)]);
  for (const [i, a] of (s.annex || []).entries()) {
    for (const k of ['body_lines', 'closing_lines']) {
      if (a && a[k] !== undefined && !isLines(a[k])) problems.push(`${id}: annex[${i}].${k} must be a non-empty array of lines`);
      if (a && isLines(a[k])) headKeys.push([`annex[${i}].${k}`, a[k]]);
    }
  }
  for (const [i, ex] of ((exec.extra_blocks) || []).entries()) {
    if (!ex || typeof ex !== 'object') continue;
    if (sided(ex.signing_recital).length) headKeys.push([`execution.extra_blocks[${i}].signing_recital`, sided(ex.signing_recital)]);
    if (sided(ex.verification_heading).length) headKeys.push([`execution.extra_blocks[${i}].verification_heading`, sided(ex.verification_heading)]);
  }

  for (const [i, b] of (s.body_text || []).entries()) {
    if (b.type !== 'table') continue;
    if (!isLines(b.columns)) { problems.push(`${id}: body_text[${i}] table needs a non-empty columns array of strings`); continue; }
    if (typeof b.rows_field !== 'string' || !b.rows_field) problems.push(`${id}: body_text[${i}] table needs a rows_field naming the field that carries its rows`);
    headKeys.push([`body_text[${i}].columns`, b.columns]);
  }
  for (const [i, ex] of (((s.execution || {}).extra_blocks) || []).entries()) {
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) { problems.push(`${id}: execution.extra_blocks[${i}] must be an object`); continue; }
    for (const k of Object.keys(ex)) {
      if (!['signed_label', 'signer_label', 'verification', 'name_field', 'signing_recital',
            'signatory_cell', 'verification_heading', 'verification_variant', 'frame', 'photograph',
            'company_seal'].includes(k)) {
        problems.push(`${id}: execution.extra_blocks[${i}] has an unknown key "${k}"`);
      }
    }
    if (ex.frame !== undefined && !['deed', 'witnessed'].includes(ex.frame)) problems.push(`${id}: execution.extra_blocks[${i}].frame must be "deed" or "witnessed"`);
    if (ex.signatory_cell !== undefined && !['default', 'attorney'].includes(ex.signatory_cell)) problems.push(`${id}: execution.extra_blocks[${i}].signatory_cell must be "default" or "attorney"`);
    if (ex.verification_variant !== undefined && !['default', 'attorney'].includes(ex.verification_variant)) problems.push(`${id}: execution.extra_blocks[${i}].verification_variant must be "default" or "attorney"`);
    for (const k of ['signer_label', 'name_field']) {
      if (ex[k] !== undefined && typeof ex[k] !== 'string') problems.push(`${id}: execution.extra_blocks[${i}].${k} must be a string`);
    }
    if (ex.verification_heading !== undefined && !okSided(ex.verification_heading)) problems.push(`${id}: execution.extra_blocks[${i}].verification_heading must be a string or { transferor, transferee }`);
    if (ex.photograph !== undefined && typeof ex.photograph !== 'boolean') problems.push(`${id}: execution.extra_blocks[${i}].photograph must be true or false`);
    if (ex.company_seal !== undefined && typeof ex.company_seal !== 'boolean') problems.push(`${id}: execution.extra_blocks[${i}].company_seal must be true or false`);
    for (const k of ['signed_label', 'signing_recital']) {
      if (ex[k] !== undefined && !okSided(ex[k])) problems.push(`${id}: execution.extra_blocks[${i}].${k} must be a string or { transferor, transferee }`);
    }
    if (ex.verification !== undefined && typeof ex.verification !== 'boolean') problems.push(`${id}: execution.extra_blocks[${i}].verification must be true or false`);
    if (!ex.signer_label) problems.push(`${id}: execution.extra_blocks[${i}] needs a signer_label naming who signs`);
  }
  for (const [key, lines] of headKeys) {
    for (const line of (Array.isArray(lines) ? lines : [])) {
      if (/—/.test(line)) problems.push(`${id}: em dash in ${key}`);
    }
  }

  // Text that moved out of body_text is still the form's text, so it faces the same
  // verbatim probe lintOne applies to a body block, and the same placeholder scan.
  const srcPath = sourceFileFor(id, s.form_number);
  if (!fs.existsSync(srcPath)) return;
  const srcTight = norm(fs.readFileSync(srcPath, 'utf8').replace(/^#.*$/gm, '')).replace(/\s/g, '');
  const declared = new Set((s.custom_fields || []).map(c => c.name));
  const base = new Set(['vendor_name', 'vendor_id', 'purchaser_name', 'purchaser_id', 'property_lr_no', 'property_location', 'purchase_price_words', 'purchase_price_figures', 'date', 'declaration_text', 'sworn_at']);
  for (const [i, b] of (s.body_text || []).entries()) {
    if (b.type === 'table' && typeof b.rows_field === 'string' && b.rows_field
        && !declared.has(b.rows_field) && !base.has(b.rows_field)) {
      problems.push(`${id}: body_text[${i}] table rows_field "${b.rows_field}" is not declared in custom_fields`);
    }
  }
  for (const v of sided(exec.signed_label)) {
    for (const m of String(v).matchAll(/\{\{(\w+)\}\}/g)) {
      if (!declared.has(m[1]) && !base.has(m[1])) problems.push(`${id}: placeholder {{${m[1]}}} in execution.signed_label is not declared in custom_fields`);
    }
  }
  for (const [i, ex] of (((s.execution || {}).extra_blocks) || []).entries()) {
    if (!ex || typeof ex !== 'object') continue;
    if (ex.name_field && !declared.has(ex.name_field) && !base.has(ex.name_field)) {
      problems.push(`${id}: execution.extra_blocks[${i}] name_field "${ex.name_field}" is not declared in custom_fields`);
    }
    for (const v of [...sided(ex.signed_label), ex.signer_label]) {
      for (const m of String(v || '').matchAll(/\{\{(\w+)\}\}/g)) {
        if (!declared.has(m[1]) && !base.has(m[1])) problems.push(`${id}: placeholder {{${m[1]}}} in execution.extra_blocks[${i}] is not declared in custom_fields`);
      }
    }
  }

  for (const [key, lines] of headKeys) {
    for (const entry of (Array.isArray(lines) ? lines : [])) {
      // an entry may carry more than one line of the form (a box column's label over
      // its blank); each line faces the probe on its own
      for (const line of String(entry).split('\n')) {
        const t = strip(line); if (!t) continue;
        const probe = t.slice(0, 40).replace(/\s/g, '');
        if (probe.length >= 12 && !srcTight.includes(probe)) problems.push(`${id}: ${key} text not in the official form: "${line.slice(0, 60)}"`);
      }
      for (const m of String(entry).matchAll(/\{\{(\w+)\}\}/g)) {
        if (!declared.has(m[1]) && !base.has(m[1])) problems.push(`${id}: placeholder {{${m[1]}}} in ${key} is not declared in custom_fields`);
      }
    }
  }
}

// Completeness. lintOne proves every line of the schema came from the official form;
// this proves the other direction, that no operative paragraph of the form was left
// out. It warns and never changes the exit code, because a form legitimately carries
// notes and registry furniture a schema does not repeat.
// Blanks are compared as blanks: any run of dots or ellipses, in the official text or
// in a {{placeholder}}, collapses to a single full stop on both sides.
const SKELETON = [
  'REPUBLIC OF KENYA', 'THE LAND REGISTRATION ACT', 'THE LAND REGISTRATION (GENERAL) REGULATIONS, 2017',
  'Date Received Presentation Book Official Fees Paid . No. Kshs.',
  'EXECUTION:', 'SIGNED as a deed by the . in the presence of:-', 'SIGNED by the . in the presence of:-',
  'Certificate of Verification under Section 45 of the Land Registration Act', 'Certificate of Verification',
  'I CERTIFY that the above-named . appeared before me on the . day of . 20. and being known to me/being identified by*. of . acknowledge the above signatures or marks to be his/hers and that he/she had freely and voluntarily executed this instrument and understood its contents.',
  'I CERTIFY that the above-named . appeared before me on the . day of . 20. and being known to me/being identified by . of . acknowledged the above signatures or marks to be his/her/them and that he/she/they had freely and voluntarily executed this instrument and understood its contents.',
  'Signature and Designation of Person Certifying**', 'Name and signature of person certifying', 'Signature of witness',
  'ID/No. PIN No. Signature. ID/Passport Number. Signature/Thumb Print.', 'Insert Passport Photo', 'Coloured Photograph',
  'SWORN at . by the said . this . day of . 20. BEFORE ME: COMMISSIONER FOR OATHS',
  'DECLARED at . by the said . this . day of . 20.',
  'DECLARED before me at . on the . day of . 20.',
  "REGISTERED and SEALED this . day of . 20. Seal. LAND REGISTRAR Name:. Registrar's Stamp/No:. Signature:.",
  'DRAWN BY:', 'Sealed with the Common Seal of the . Director Secretary Company Seal',
].join(' ');

const blanks = (s) => String(s).replace(/([.…]\s*){2,}/g, '. ');
const tight  = (s) => norm(blanks(String(s))).replace(/\s/g, '');

// Only the strings the builder actually prints, in the order it prints them, so that
// a paragraph the schema splits across consecutive blocks still reads as one run.
function coveredText(s) {
  const parts = [s.doc_title_official || s.doc_title || '', `${s.title_label || 'TITLE NO'}: .`];
  if (Array.isArray(s.head_lines)) parts.push(...s.head_lines);
  if (Array.isArray(s.pre_title_lines)) parts.push(...s.pre_title_lines);
  if (Array.isArray(s.filing_box)) parts.push(...s.filing_box);
  if (Array.isArray(s.title_line)) parts.push(...s.title_line);
  if (Array.isArray(s.foot_notes)) parts.push(...s.foot_notes);
  for (const r of (s.detail_rows || [])) parts.push(r.label || '', r.value_template || '');
  for (const b of (s.body_text || [])) parts.push(b.text || '');
  for (const a of (s.annex || [])) {
    parts.push(a.heading || '', a.intro || '', a.closing || '', a.jurat || '', a.jurat_signatory || '');
    if (Array.isArray(a.body_lines)) parts.push(...a.body_lines);
    if (Array.isArray(a.closing_lines)) parts.push(...a.closing_lines);
  }
  if (Array.isArray(s.act_lines)) parts.push(...s.act_lines);
  // a table block carries its words in its column headings, not in a text
  for (const b of (s.body_text || [])) if (b.type === 'table' && Array.isArray(b.columns)) parts.push(...b.columns);
  // and the execution carries the wording of its certificates and its extra signatories
  const ex = s.execution || {};
  const sidedParts = (v) => typeof v === 'string' ? [v]
    : (v && typeof v === 'object' && !Array.isArray(v) ? Object.values(v).filter(x => typeof x === 'string') : []);
  parts.push(ex.signer_label || '', ...sidedParts(ex.verification_heading), ...sidedParts(ex.signing_recital), ...sidedParts(ex.signed_label));
  for (const b of (ex.extra_blocks || [])) {
    if (!b || typeof b !== 'object') continue;
    parts.push(b.signer_label || '', ...sidedParts(b.verification_heading), ...sidedParts(b.signing_recital), ...sidedParts(b.signed_label));
  }
  if (Array.isArray(s.registry_block)) parts.push(...s.registry_block);
  return tight(parts.join(' ').replace(/\{\{\w+\}\}/g, '.') + ' ' + SKELETON);
}

function warnCompleteness(id, warnings) {
  const s = readSchema(id); if (!s) return;
  const srcPath = sourceFileFor(id, s.form_number);
  if (!fs.existsSync(srcPath)) return;
  const covered = coveredText(s);
  for (const raw of fs.readFileSync(srcPath, 'utf8').replace(/^#.*$/gm, '').split('\n')) {
    const line = raw.replace(//g, ' ').trim();
    if (line.length < 60) continue;
    if (!/[A-Za-z]{3}/.test(blanks(line).replace(/[.\s]/g, ''))) continue;
    const probe = tight(line).slice(0, 40);
    if (probe.length < 12) continue;
    if (!covered.includes(probe)) warnings.push(`${id}: official paragraph not found in the schema: "${line.slice(0, 60)}"`);
  }
}

const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DIR).filter(f => /^(lra|lcb)_\d+\.json$/.test(f)).map(f => f.replace('.json', ''));
const problems = []; const warnings = [];
ids.forEach(id => { lintOne(id, problems); lintExtra(id, problems); warnCompleteness(id, warnings); });
problems.forEach(p => console.log('FAIL  ' + p));
warnings.forEach(w => console.log('WARN  ' + w));
console.log(problems.length
  ? `lint: ${problems.length} problem(s) in ${ids.length} schema(s), ${warnings.length} warning(s)`
  : `lint: ${ids.length} schema(s) clean, ${warnings.length} warning(s)`);
process.exit(problems.length ? 1 : 0);
