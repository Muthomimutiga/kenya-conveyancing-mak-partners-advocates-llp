#!/usr/bin/env node
// scripts/procedures/render-procedure.js [slug...] [--all]
//
// Turns a procedure schema into the note an advocate actually reads, so the judgment in it
// can be reviewed as guidance rather than as JSON. This is the review artifact: the quotes
// are proved by lint.js, but the bundle, the sequence and the traps are a reading, and a
// reading has to be legible before anyone can sign it off.
//
// Every legal proposition prints with the provision beside it, because the rule that keeps
// this lawful is that the plugin states the law and the advocate decides.
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const argv = process.argv.slice(2);
const wantAll = argv.includes('--all');
const only = argv.filter((a) => !a.startsWith('--'));

const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .filter((f) => wantAll || !only.length || only.includes(f.replace('.json', '')));

if (!files.length) { console.error('render-procedure: nothing to render'); process.exit(2); }

const formTitles = (() => {
  const p = path.join(DIR, '..', 'form-schemas', '_index.json');
  if (!fs.existsSync(p)) return new Map();
  const idx = JSON.parse(fs.readFileSync(p, 'utf8'));
  const forms = idx.forms || idx;
  return new Map((Array.isArray(forms) ? forms : Object.values(forms))
    .map((f) => [f.form_id, { number: f.form_number, title: (f.doc_title || '').trim() }]));
})();

const formName = (id) => {
  const f = formTitles.get(id);
  if (!f) return id;
  const t = f.title.charAt(0) + f.title.slice(1).toLowerCase();
  // Land Control Act forms are numbered in their own regulations ("Form 1"), not in the LRA
  // series, so a bare "1" reads as a list index. Label them by their Act.
  const num = /^lcb_/.test(id) ? `LCB Form ${f.number}` : f.number;
  return `${num}, ${t}`;
};

const out = [];
const w = (s = '') => out.push(s);

for (const file of files) {
  const s = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));

  w(`# ${s.name}`);
  w();
  if (s.summary) { w(s.summary); w(); }

  const v = s.verified_by || {};
  if (String(v.status || '').toUpperCase().includes('AWAIT')) {
    w(`> **${v.status}.** ${v.note || ''}`);
    w();
  } else if (String(v.status || '').toUpperCase() === 'APPROVED') {
    w(`> **Approved** by ${v.by || 'the reviewing advocate'}${v.date ? `, ${v.date}` : ''}. The advocate on the matter decides.`);
    w();
  }

  w('## When this is the procedure');
  w();
  for (const t of (s.triggers || [])) w(`- ${t}`);
  w();

  if ((s.not_this_if || []).length) {
    w('### And when it is not');
    w();
    for (const n of s.not_this_if) {
      const go = n.use ? ` Use **${n.use.replace(/_/g, ' ')}** instead.` : '';
      w(`- **${n.fact}.**${go} ${n.why}`);
    }
    w();
  }

  w('## What to lodge');
  w();
  w('| Order | Form | Required | When |');
  w('|---|---|---|---|');
  for (const b of [...(s.bundle || [])].sort((a, z) => (a.order ?? 99) - (z.order ?? 99))) {
    const req = b.required === false ? 'Only if' : 'Always';
    const when = b.required === false ? (b.condition || '') : '';
    // A negative order means "before the registry lodgement" (the LCB consent comes first).
    const order = b.order == null ? '' : (b.order < 0 ? 'First, before lodging' : b.order);
    w(`| ${order} | ${formName(b.form_id)} | ${req} | ${when} |`);
  }
  w();
  for (const b of (s.bundle || [])) if (b.why) w(`- **${formName(b.form_id)}.** ${b.why}`);
  w();

  if ((s.alternatives || []).length) {
    w('### One or the other, never both');
    w();
    for (const a of s.alternatives) {
      w(`- **${(a.choose_between || []).map(formName).join(' or ')}.** Decided by: ${a.decided_by}. ${a.why || ''}`);
    }
    w();
  }

  if ((s.drafted_together || []).length) {
    w('### Drafted and lodged together');
    w();
    for (const d of s.drafted_together) {
      w(`- ${(d.forms || []).map(formName).join(', ')}. ${d.why || ''}`);
    }
    w();
  }

  if ((s.consents || []).length) {
    w('## Consents');
    w();
    for (const c of s.consents) {
      w(`### ${c.name}`);
      w();
      w(`- **Needed when:** ${c.when_required}`);
      if (c.when_not_required) w(`- **Not needed when:** ${c.when_not_required}`);
      w(`- **From:** ${c.authority}`);
      if (c.provision) w(`- **Under:** ${c.provision}`);
      if (c.deadline) w(`- **Deadline:** ${c.deadline}${c.deadline_provision ? ` (${c.deadline_provision})` : ''}`);
      w(`- **If it is missed:** ${c.consequence_if_missed}`);
      w();
    }
  }

  if ((s.clearances || []).length) {
    w('## Clearances');
    w();
    const lower = (t) => String(t).charAt(0).toLowerCase() + String(t).slice(1);
    for (const c of s.clearances) w(`- **${c.name}**, from ${lower(c.authority)}. ${c.when_required}`);
    w();
  }

  if ((s.sequence || []).length) {
    w('## Order of work');
    w();
    (s.sequence || []).forEach((step, i) => w(`${i + 1}. ${step}`));
    w();
  }

  if ((s.traps || []).length) {
    w('## What goes wrong');
    w();
    for (const t of s.traps) {
      w(`**${t.trap}.** ${t.why_wrong}${t.provision ? ` (${t.provision})` : ''}`);
      w();
    }
  }

  if ((s.practice_varies || []).length) {
    w('## Where practice varies');
    w();
    w('These are not settled by any statute: where registries differ, record what yours does; where an entry sets out routes, the advocate on the matter chooses.');
    w();
    for (const p of s.practice_varies) w(`- **${p.step}.** ${p.note}`);
    w();
  }

  w('## The law this rests on');
  w();
  w('Each quote below is proved word for word against the cached Act on every build. The reading beside it is ours, and is what needs an advocate\'s eye.');
  w();
  for (const b of (s.statutory_basis || [])) {
    w(`**${b.act} ${b.provision}**`);
    w();
    w(`> ${b.quote}`);
    w();
    w(b.effect);
    w();
  }

  w('---');
  w();
}

process.stdout.write(out.join('\n'));
