(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ArtifactKit = api;
})(function () {
  'use strict';
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function nairobiDate(d, tz) { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Africa/Nairobi' }).format(typeof d === 'string' ? new Date(d) : d); }
  function addDays(ymd, n) { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().split('T')[0]; }
  function daysDiff(from, to) { return Math.round((new Date(to) - new Date(from)) / 86400000); }
  function fmtTime(iso, tz) { if (!iso) return ''; return new Intl.DateTimeFormat('en-KE', { timeZone: tz || 'Africa/Nairobi', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)); }
  function fmtDate(ymd, tz) { if (!ymd) return ''; return new Intl.DateTimeFormat('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz || 'Africa/Nairobi' }).format(new Date(ymd + 'T12:00:00Z')); }
  function fmtDateTime(iso, tz) { if (!iso) return ''; return new Intl.DateTimeFormat('en-KE', { timeZone: tz || 'Africa/Nairobi', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)); }
  function relTime(iso, tz) { if (!iso) return ''; const d = new Date(iso), now = new Date(); const h = (now - d) / 3600000; if (h < 1) return Math.max(1, Math.floor(h * 60)) + 'm ago'; if (h < 24) return fmtTime(iso, tz); if (h < 48) return 'Yesterday'; const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return M[d.getMonth()] + ' ' + d.getDate(); }
  function _parse(r) { if (!r || r.isError) return null; if (r.structuredContent) return r.structuredContent; if (r.content && r.content.length) { const t = r.content.find(c => c.type === 'text'); if (t) { try { return JSON.parse(t.text); } catch (e) {} } } return r; }
  function parseAT(r) { const d = _parse(r); return d && d.records ? d : null; }
  function parseCal(r) { const d = _parse(r) || {}; return d.events || d.items || []; }
  function parseGmail(r) { const d = _parse(r) || {}; return d.threads || []; }
  function splitFirmAmpersand(name) { return esc(name).replace(/&amp;/g, '<span class="amp">&amp;</span>'); }
  function sourceHealth(raw) { let obj = {}; try { obj = JSON.parse(raw || '{}'); } catch (e) { obj = {}; } const up = [], down = []; for (const k of Object.keys(obj)) (obj[k] ? up : down).push(k); return { up, down }; }
  function selectEdition(rows, { today, F }) { const sorted = [...(rows || [])].sort((a, b) => (b.cellValuesByFieldId[F.date] || '').localeCompare(a.cellValuesByFieldId[F.date] || '')); if (!sorted.length) return { note: null, stale: false, status: null, composedAt: null, editionNo: null, health: null }; const todayRow = sorted.find(r => r.cellValuesByFieldId[F.date] === today); const row = todayRow || sorted[0]; const c = row.cellValuesByFieldId; return { note: c[F.note] || null, stale: !todayRow, status: c[F.status] ? (c[F.status].name || c[F.status]) : null, composedAt: c[F.composedAt] || null, editionNo: c[F.editionNo] != null ? c[F.editionNo] : null, health: c[F.health] || null }; }
  async function runQueries(queries, { cowork, uuids }) {
    const out = {};
    const results = await Promise.all(queries.map(q => {
      const tool = `mcp__${uuids[q.server]}__${q.tool}`;
      const args = q.server === 'AT' ? Object.assign({ baseId: q.baseId }, q.args) : (q.args || {});
      return cowork.callMcpTool(tool, args).then(r => ({ q, r })).catch(() => ({ q, r: null }));
    }));
    for (const { q, r } of results) {
      out[q.id] = q.server === 'AT' ? parseAT(r) : q.server === 'GCAL' ? parseCal(r) : parseGmail(r);
    }
    return out;
  }
  async function doWrite(cowork, tool, args) { try { const r = await cowork.callMcpTool(tool, args); return !(r && r.isError); } catch (e) { return false; } }
  function buildBanner({ stale, health }) { const h = health ? sourceHealth(health) : { down: [] }; const m = []; if (stale) m.push("Today's edition has not run yet. Showing the most recent Leader."); if (h.down.length) m.push('Enrichment unavailable: ' + h.down.join(', ') + '.'); return m.length ? `<div class="degraded">${esc(m.join(' '))}</div>` : ''; }
  return { esc, nairobiDate, addDays, daysDiff, fmtTime, fmtDate, fmtDateTime, relTime, parseAT, parseCal, parseGmail, splitFirmAmpersand, sourceHealth, selectEdition, runQueries, doWrite, buildBanner };
});
