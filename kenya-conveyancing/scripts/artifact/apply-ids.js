// Values setup writes when an optional integration is not connected. They look
// like tokens but are intentional, so the leftover-token check must ignore them.
const ABSENT_SENTINELS = new Set(['__GMAIL_UUID_ABSENT__', '__GCAL_UUID_ABSENT__']);

function applyIds(template, map) {
  let out = template;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  const leftover = (out.match(/__[A-Z0-9_]+__/g) || []).find((t) => ![...ABSENT_SENTINELS].some((s) => t.includes(s)));
  if (leftover) throw new Error('unmapped token: ' + leftover);
  return out;
}

if (require.main === module) {
  const fs = require('fs');
  const [, , tmplPath, mapPath, outPath] = process.argv;
  const template = fs.readFileSync(tmplPath, 'utf8');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  fs.writeFileSync(outPath, applyIds(template, map));
  console.log('Wrote', outPath);
}

module.exports = { applyIds };
