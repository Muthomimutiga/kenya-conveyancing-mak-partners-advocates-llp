#!/usr/bin/env node
/*
 * build-template.js
 * Rebuilds scripts/assets/artifact-template.html, the Conveyancing Tracker (build time only;
 * nothing at install runs this).
 *
 *   node scripts/artifact/build-template.js
 *   node scripts/artifact/build-template.js --shell <path/to/shell-template.html> --out <file>
 *
 * Same assembly as store/artifact-kit/build-artifact.js (shell + kit + view + meta), with one
 * difference: server routing is read from meta.json instead of the shell's fixed Airtable, Google
 * Calendar and Gmail trio. meta.servers maps each server key to its install token
 * ({"AT": "__AT_SERVER_UUID__"}) and meta.serverNames is the connector list for the meta block.
 * The Tracker reads only Airtable, so the built page carries no mail or calendar server tokens and
 * works the same for a firm on Microsoft 365 or on Google Workspace. The kit embedded is this
 * plugin's vendored copy, scripts/artifact/kit.js. The shared kit is not modified.
 *
 * A firm's own dashboard theme is not baked here: the client generator injects it from the firm's
 * inputs (artifact-theme/), so the template's page stays every firm's.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

function once(html, find, repl, what) {
  const n = html.split(find).length - 1;
  if (n !== 1) throw new Error(`build-template: expected exactly one ${what} in the shell, found ${n}. The shared shell changed; update this script.`);
  return html.replace(find, () => repl);
}

// Rewrites the shell's fixed server trio into the servers named in meta.
function routeServers(html, meta) {
  const servers = meta.servers || {};
  const keys = Object.keys(servers);
  if (!keys.length || !keys.includes('AT')) throw new Error('build-template: meta.servers must name at least AT');
  for (const k of keys) if (!/^[A-Z][A-Z0-9]*$/.test(k)) throw new Error('build-template: bad server key ' + k);
  const names = meta.serverNames || ['Airtable'];
  html = once(html, '"mcpServerNames": [ "Airtable", "Google Calendar", "Gmail" ]',
    '"mcpServerNames": [ ' + names.map(n => JSON.stringify(n)).join(', ') + ' ]', 'mcpServerNames list');
  html = once(html, "const AT='__AT_SERVER_UUID__', GCAL='__GCAL_SERVER_UUID__', GMAIL='__GMAIL_SERVER_UUID__';",
    'const ' + keys.map(k => `${k}='${servers[k]}'`).join(', ') + ';', 'server constants line');
  html = once(html, 'await K.runQueries(V.queries, { cowork: window.cowork, uuids: { AT, GCAL, GMAIL } })',
    `await (V.runQueries || K.runQueries)(V.queries, { cowork: window.cowork, uuids: { ${keys.join(', ')} }, K })`, 'runQueries call');
  html = once(html, 'cowork: window.cowork, AT, GCAL, GMAIL, doWrite: K.doWrite',
    `cowork: window.cowork, ${keys.join(', ')}, doWrite: K.doWrite`, 'actions ctx');
  return html;
}

function build({ shellPath, kitPath, viewPath, metaPath }) {
  let html = fs.readFileSync(shellPath, 'utf8');
  const kit = fs.readFileSync(kitPath, 'utf8');
  const view = fs.readFileSync(viewPath, 'utf8');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  html = once(html, '<script id="kit-js">/* __KIT_JS__ */</script>', `<script id="kit-js">\n${kit}\n</script>`, 'kit slot');
  html = once(html, '<script id="view-js">/* __VIEW_JS__ */</script>', `<script id="view-js">\n${view}\n</script>`, 'view slot');
  html = html.split('__ARTIFACT_NAME__').join(meta.name)
    .split('__ARTIFACT_DESC__').join(meta.description)
    .split('__ARTIFACT_TOOLS__').join(meta.tools.map(t => JSON.stringify(t)).join(', '))
    .split('__ARTIFACT_TITLE__').join(meta.title);
  return routeServers(html, meta);
}

if (require.main === module) {
  const shellPath = path.resolve(arg('--shell', path.join(HERE, '..', '..', '..', '..', 'artifact-kit', 'shell', 'shell-template.html')));
  const outPath = path.resolve(arg('--out', path.join(HERE, '..', 'assets', 'artifact-template.html')));
  if (!fs.existsSync(shellPath)) { console.error('ERROR: shared shell not found at', shellPath, '(pass --shell)'); process.exit(1); }
  const html = build({ shellPath, kitPath: path.join(HERE, 'kit.js'), viewPath: path.join(HERE, 'view.js'), metaPath: path.join(HERE, 'meta.json') });
  fs.writeFileSync(outPath, html);
  console.log('Built', outPath);
}

module.exports = { build, routeServers };
