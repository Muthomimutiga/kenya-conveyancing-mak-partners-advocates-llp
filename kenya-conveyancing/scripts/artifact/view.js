// view.js — The Conveyancing Tracker domain view on the Live Artifact Kit.
// Ported from scripts/assets/tracker-template.html. The shell owns the
// masthead, banner, fetch and registration; this view owns only the domain
// section, its data shaping, its actions, and its matter-detail modal.
(function (factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ArtifactView = api;
})(function () {
  'use strict';

  /* ── conveyancing tokens (resolved at install by apply-ids) ─────── */
  const C = {
    name:      '__CONV_F_CVY_NAME__',
    buyer:     '__CONV_F_CVY_BUYER__',
    seller:    '__CONV_F_CVY_SELLER__',
    status:    '__CONV_F_CVY_STATUS__',
    tenure:    '__CONV_F_CVY_TENURE__',
    price:     '__CONV_F_CVY_PRICE__',
    instrDate: '__CONV_F_CVY_INSTR__',
    targetComp:'__CONV_F_CVY_TARGET__',
    actualComp:'__CONV_F_CVY_ACTUAL__',
    titleNum:  '__CONV_F_CVY_TITLE__',
    assignee:  '__CONV_F_CVY_ASSIGNEE__',
  };
  const M = {
    type:        '__CONV_F_MS_TYPE__',
    targetDate:  '__CONV_F_MS_TARGETDATE__',
    status:      '__CONV_F_MS_STATUS__',
    completed:   '__CONV_F_MS_COMPLETED__',
    conveyance:  '__CONV_F_MS_CONVEYANCE__',
    notes:       '__CONV_F_MS_NOTES__',
    searchExpiry:'__CONV_F_MS_SEARCHEXPIRY__',
  };
  const CONV_TBL = '__CONV_CONVEYANCES_TBL__';
  const MS_TBL   = '__CONV_MILESTONES_TBL__';

  /* ═════════ DOMAIN LOGIC (pure, tested in view.test.js) ═════════ */

  // Build a { conveyanceId -> milestone[] } map sorted by milestone order.
  // Milestones link to their conveyance via a linked-record field (array with {id}).
  function buildMsIndex(msRecords) {
    const byId = {};
    for (const ms of msRecords) {
      const links = ms.cellValuesByFieldId[M.conveyance];
      if (links && links.length) {
        const id = links[0].id;
        (byId[id] = byId[id] || []).push(ms);
      }
    }
    // Preserve Airtable insertion order (already sorted by milestone order in AT)
    return byId;
  }

  // Returns the 0-based index of the first non-Completed, non-Skipped milestone.
  function currentIdx(msList) {
    for (let i = 0; i < msList.length; i++) {
      const s = msList[i].cellValuesByFieldId[M.status];
      const name = s && s.name;
      if (name !== 'Completed' && name !== 'Skipped') return i;
    }
    return -1; // all done
  }

  function isTerminal(statusName) {
    return statusName === 'Completed' || statusName === 'Skipped';
  }

  function shape(raw, ctx) {
    const { today, tomorrow, tz, K } = ctx;
    const cvyData = raw.conveyances;
    const msData  = raw.milestones;
    if (!cvyData) return { active: [], overdueMilestones: [], searchExpiring: [], dueThisWeek: [], hasAirtable: false };

    const allConveyances = cvyData.records || [];
    const allMs = (msData && msData.records) || [];

    // index milestones by conveyance id
    const byId = buildMsIndex(allMs);

    // active conveyances only
    const active = allConveyances.filter(r => {
      const s = r.cellValuesByFieldId[C.status];
      return s && s.name === 'Active';
    }).map(conv => {
      const msList = byId[conv.id] || [];
      const curI = currentIdx(msList);
      const doneCount = msList.filter(m => m.cellValuesByFieldId[M.status] && m.cellValuesByFieldId[M.status].name === 'Completed').length;
      const skippedCount = msList.filter(m => m.cellValuesByFieldId[M.status] && m.cellValuesByFieldId[M.status].name === 'Skipped').length;
      const nonSkipped = msList.length - skippedCount;
      const pct = nonSkipped > 0 ? Math.round(doneCount / nonSkipped * 100) : 0;
      const targetComp = conv.cellValuesByFieldId[C.targetComp];
      const daysLeft = targetComp ? K.daysDiff(today, targetComp) : null;
      const aRaw = conv.cellValuesByFieldId[C.assignee];
      const assignee = aRaw == null ? '' : (typeof aRaw === 'object' ? (aRaw.name || '') : String(aRaw));
      return { conv, msList, curIdx: curI, doneCount, pct, daysLeft, assignee };
    });

    // overdue milestones: target < today and status is not Completed/Skipped
    const overdueMilestones = [];
    for (const ms of allMs) {
      const f = ms.cellValuesByFieldId;
      const st = f[M.status] && f[M.status].name;
      if (isTerminal(st)) continue;
      const td = f[M.targetDate];
      if (td && td < today) {
        // find the parent conveyance
        const links = f[M.conveyance];
        const cvyId = links && links.length ? links[0].id : null;
        const convRec = cvyId ? allConveyances.find(c => c.id === cvyId) : null;
        // only flag milestones on active conveyances
        if (!convRec || (convRec.cellValuesByFieldId[C.status] && convRec.cellValuesByFieldId[C.status].name !== 'Active')) continue;
        const daysLate = K.daysDiff(td, today);
        overdueMilestones.push({ ms, convRec, daysLate });
      }
    }
    overdueMilestones.sort((a, b) => (a.ms.cellValuesByFieldId[M.targetDate] || '').localeCompare(b.ms.cellValuesByFieldId[M.targetDate] || ''));

    // official search expiry: searchExpiry field present AND <=10 days from today
    const SEARCH_WARN_DAYS = 10;
    const searchExpiring = [];
    for (const ms of allMs) {
      const f = ms.cellValuesByFieldId;
      const expiry = f[M.searchExpiry];
      if (!expiry) continue;
      const daysUntil = K.daysDiff(today, expiry);
      if (daysUntil >= 0 && daysUntil <= SEARCH_WARN_DAYS) {
        const links = f[M.conveyance];
        const cvyId = links && links.length ? links[0].id : null;
        const convRec = cvyId ? allConveyances.find(c => c.id === cvyId) : null;
        if (!convRec || (convRec.cellValuesByFieldId[C.status] && convRec.cellValuesByFieldId[C.status].name !== 'Active')) continue;
        searchExpiring.push({ ms, convRec, expiryDate: expiry, daysUntilExpiry: daysUntil });
      }
    }
    searchExpiring.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    // due this week: target >= today AND target <= today+7, status not Completed/Skipped
    const weekEnd = K.addDays(today, 7);
    const dueThisWeek = [];
    for (const ms of allMs) {
      const f = ms.cellValuesByFieldId;
      const st = f[M.status] && f[M.status].name;
      if (isTerminal(st)) continue;
      const td = f[M.targetDate];
      if (!td || td < today || td > weekEnd) continue;
      const links = f[M.conveyance];
      const cvyId = links && links.length ? links[0].id : null;
      const convRec = cvyId ? allConveyances.find(c => c.id === cvyId) : null;
      if (!convRec || (convRec.cellValuesByFieldId[C.status] && convRec.cellValuesByFieldId[C.status].name !== 'Active')) continue;
      dueThisWeek.push({ ms, convRec });
    }
    dueThisWeek.sort((a, b) => (a.ms.cellValuesByFieldId[M.targetDate] || '').localeCompare(b.ms.cellValuesByFieldId[M.targetDate] || ''));

    return { active, overdueMilestones, searchExpiring, dueThisWeek, hasAirtable: true };
  }

  /* ═════════ PRESENTATION HELPERS ═════════ */

  const MONS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MFULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function fmtShort(ymd) {
    if (!ymd) return '';
    const d = new Date(ymd + 'T12:00:00Z');
    return `${d.getUTCDate()} ${MONS[d.getUTCMonth()]}`;
  }
  function fmtFull(ymd) {
    if (!ymd) return '';
    const d = new Date(ymd + 'T12:00:00Z');
    return `${d.getUTCDate()} ${MFULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  function fmtKsh(n) {
    if (!n) return '';
    return new Intl.NumberFormat('en-KE', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 }).format(n);
  }
  function fmtKshFull(n) {
    if (!n) return '';
    return 'KES ' + new Intl.NumberFormat('en-KE').format(n);
  }
  function titleCase(s) {
    return (s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ═════════ DOMAIN STYLES ═════════ */
  const DOMAIN_STYLES = `
  /* V5 rust accent, unified across the artifact */
  :root { --accent: #b06a37; --accent-soft: rgba(176, 106, 55, 0.12); }
  /* ═══ HERO ═══ */
  .hero { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 28px; align-items: center; padding: 16px 0 18px; border-bottom: 1px solid var(--rule); }
  .hero-greet { font-style: italic; font-size: 15px; color: var(--ink-soft); line-height: 1.5; }
  .hero-greet b { font-style: normal; font-weight: 600; color: var(--ink); }
  .hero-stats { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .hstat { text-align: left; min-width: 70px; padding: 8px 12px; border-radius: 5px; cursor: pointer; transition: background 200ms var(--ease), transform 200ms var(--ease); }
  .hstat:hover { background: var(--accent-soft); transform: translateY(-1px); }
  .hstat:hover .hstat-num { color: var(--accent); }
  .hstat:hover .hstat-num.alert { color: var(--alert); }
  .hstat:hover .hstat-num.ok { color: var(--ok); }
  .hstat:active { transform: translateY(0); }
  .hstat-num { display: block; font-size: 26px; font-weight: 300; line-height: 1; color: var(--ink); letter-spacing: -0.3px; transition: color 180ms ease; }
  .hstat-num.alert { color: var(--alert); }
  .hstat-num.ok    { color: var(--ok); }
  .hstat-label { display: block; font-family: var(--sans); font-size: 8.5px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--muted); margin-top: 6px; }

  /* ═══ ALERT ROWS ═══ */
  .alert-row { display: grid; grid-template-columns: 80px 1fr; gap: 14px; padding: 11px 12px; border-bottom: 1px solid var(--rule-soft); align-items: baseline; cursor: pointer; margin-left: -12px; margin-right: -12px; border-radius: 4px; transition: background 180ms var(--ease); }
  .alert-row:last-child { border-bottom: none; }
  .alert-row:hover { background: var(--accent-soft); }
  .alert-when { font-family: var(--sans); font-size: 10px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); transition: color 180ms ease; }
  .alert-when.red { color: var(--alert); }
  .alert-when.amber { color: var(--accent); }
  .alert-title { font-size: 14px; color: var(--ink); line-height: 1.35; }
  .alert-matter { font-style: italic; color: var(--muted); font-size: 12px; margin-left: 4px; }
  .alert-row:hover .alert-title { color: var(--accent); }

  /* ═══ TRANSACTION CARD ═══ */
  .txn-card { background: var(--paper-2); border: 1px solid var(--rule); padding: 22px 26px 24px; cursor: pointer; transition: border-color 220ms ease, box-shadow 220ms ease, transform 220ms var(--ease); margin-bottom: 22px; }
  .txn-card:last-child { margin-bottom: 0; }
  .txn-card:hover { border-color: var(--accent); box-shadow: 0 6px 28px -8px rgba(176,106,55,0.2); transform: translateY(-2px); }
  .txn-card:active { transform: translateY(0); }
  .txn-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; margin-bottom: 4px; }
  .txn-title-group { flex: 1; min-width: 0; }
  .txn-matter { font-size: 19px; font-weight: 400; color: var(--ink); letter-spacing: -0.3px; line-height: 1.2; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; transition: color 180ms ease; }
  .txn-card:hover .txn-matter { color: var(--accent); }
  .txn-parties { font-style: italic; font-size: 13px; color: var(--muted); margin-top: 6px; display: flex; align-items: center; flex-wrap: wrap; }
  .txn-parties b { font-style: normal; font-weight: 500; color: var(--ink-soft); }
  .txn-parties .arrow { font-style: normal; color: var(--muted-2); padding: 0 7px; }
  .txn-parties .sep { font-style: normal; color: var(--rule); padding: 0 10px; }
  .txn-meta { display: flex; align-items: center; flex-wrap: wrap; margin-top: 10px; }
  .txn-meta-item { font-family: var(--sans); font-size: 9.5px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 4px; margin-right: 20px; margin-bottom: 4px; }
  .txn-meta-item .val { color: var(--ink-soft); font-weight: 500; letter-spacing: 0.2px; text-transform: none; }
  .txn-meta-item .val.alert  { color: var(--alert); font-weight: 700; }
  .txn-meta-item .val.ok     { color: var(--ok); }
  .txn-meta-item .val.accent { color: var(--accent); font-weight: 700; }
  .txn-price { text-align: right; flex-shrink: 0; }
  .txn-price .currency { display: block; font-family: var(--sans); font-size: 9px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
  .txn-price .amount { font-size: 22px; font-weight: 300; color: var(--ink); letter-spacing: -0.4px; }

  /* ═══ BADGES ═══ */
  .badge { display: inline-block; font-family: var(--sans); font-size: 8px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 3px 8px; border-radius: 11px; border: 1px solid; line-height: 1; vertical-align: 2px; }
  .b-leasehold { color: var(--info); border-color: #c0cbea; background: #eef0fb; }
  .b-freehold  { color: var(--ok);   border-color: #b8dfc8; background: #eaf5ef; }
  .b-active    { color: var(--accent); border-color: #e6d68c; background: #fdf9e4; }

  /* ═══ TIMELINE ═══ */
  .tl-divider { border: none; border-top: 1px solid var(--rule); margin: 16px 0 14px; }
  .tl-label { font-family: var(--sans); font-size: 9px; font-weight: 800; letter-spacing: 2.4px; text-transform: uppercase; color: var(--muted); display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .tl-label::before { content: ''; display: block; height: 1px; width: 18px; background: var(--rule); }
  .tl-scroll { overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; }
  .tl { display: flex; align-items: flex-start; position: relative; min-width: max-content; padding: 36px 32px 6px; }
  .tl-line { position: absolute; top: 91px; height: 2px; z-index: 0; pointer-events: none; }

  /* ═══ MILESTONE NODE ═══ */
  .ms { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; flex: 0 0 auto; width: 108px; cursor: pointer; }
  .ms-date { height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; margin-bottom: 8px; font-family: var(--sans); font-size: 9px; font-weight: 600; letter-spacing: 0.4px; color: var(--muted); text-align: center; line-height: 1.3; }
  .ms-date .late-flag { font-size: 7.5px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 2px; }
  .ms-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--muted-2); background: var(--paper); position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: box-shadow 200ms var(--ease), transform 200ms var(--ease); }
  .ms:hover .ms-dot { transform: scale(1.35); box-shadow: 0 0 0 6px rgba(176,106,55,0.15); }
  .ms-dot.done { background: var(--ok); border-color: var(--ok); }
  .ms-dot.done::after { content: '✓'; color: #fff; font-size: 9px; font-weight: 800; font-family: var(--sans); line-height: 1; }
  .ms-dot.cur { background: var(--accent); border-color: var(--accent); width: 22px; height: 22px; margin-top: -2px; box-shadow: 0 0 0 5px rgba(176,106,55,0.18); }
  .ms-dot.cur-late { background: #fff3f3; border-color: var(--alert); border-width: 2.5px; width: 22px; height: 22px; margin-top: -2px; box-shadow: 0 0 0 5px rgba(184,48,48,0.12); }
  .ms-dot.cur-late::after { content: '!'; color: var(--alert); font-size: 11px; font-weight: 900; font-family: var(--sans); line-height: 1; }
  .ms-dot.overdue { background: #fdf5f5; border-color: #e0a8a8; }
  .ms-dot.overdue::after { content: '!'; color: #c06060; font-size: 10px; font-weight: 800; font-family: var(--sans); line-height: 1; }
  .ms-dot.skipped { background: var(--paper-3); border-color: var(--rule); border-style: dashed; }
  .ms-dot.skipped::after { content: '–'; color: var(--muted-2); font-size: 13px; font-family: var(--sans); line-height: 1; }
  .ms-label { font-family: var(--sans); font-size: 8px; font-weight: 700; letter-spacing: 0.3px; color: var(--muted); text-align: center; margin-top: 9px; line-height: 1.4; max-width: 96px; transition: color 180ms ease; }
  .ms:hover .ms-label { color: var(--ink-soft); }
  .ms-label.done     { color: var(--ok); }
  .ms-label.cur      { color: var(--accent); font-weight: 800; }
  .ms-label.cur-late { color: var(--alert); font-weight: 800; }
  .ms-label.overdue  { color: #c06060; }
  .ms-label.skipped  { color: var(--muted-2); text-decoration: line-through; }

  /* ═══ TOOLTIP (global fixed — escapes scroll overflow clipping) ═══ */
  #conv-tip {
    position: fixed; z-index: 9999; pointer-events: none;
    background: var(--ink); color: #f5efe3;
    border-radius: 5px; padding: 9px 13px;
    font-family: var(--sans); font-size: 11px; line-height: 1.5;
    white-space: normal; max-width: 200px;
    opacity: 0; transition: opacity 150ms var(--ease);
    box-shadow: 0 8px 24px -4px rgba(28,21,16,0.32);
    text-align: center; --tip-caret: 50%;
  }
  #conv-tip.show { opacity: 1; }
  #conv-tip::after { content: ''; position: absolute; top: 100%; left: var(--tip-caret); transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--ink); }

  /* ═══ PROGRESS BAR ═══ */
  .prog-wrap { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--rule-soft); }
  .prog-label { font-family: var(--sans); font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); flex-shrink: 0; }
  .prog-track { flex: 1; height: 3px; background: var(--rule); border-radius: 2px; overflow: hidden; }
  .prog-fill  { height: 100%; border-radius: 2px; background: var(--ok); transition: width 700ms var(--ease); }
  .prog-pct   { font-family: var(--sans); font-size: 9.5px; font-weight: 700; color: var(--muted); flex-shrink: 0; white-space: nowrap; }

  /* ═══ MODAL MILESTONE LIST ═══ */
  .modal-ms-list { margin-top: 16px; }
  .modal-ms-row { display: grid; grid-template-columns: 20px 1fr auto; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--rule-soft); align-items: center; }
  .modal-ms-row:last-child { border-bottom: none; }
  .modal-ms-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--muted-2); background: var(--paper); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .modal-ms-dot.done { background: var(--ok); border-color: var(--ok); }
  .modal-ms-dot.done::after { content: '✓'; color: #fff; font-size: 7px; font-weight: 800; }
  .modal-ms-dot.cur  { background: var(--accent); border-color: var(--accent); }
  .modal-ms-dot.late { background: #fff3f3; border-color: var(--alert); }
  .modal-ms-dot.late::after { content: '!'; color: var(--alert); font-size: 9px; font-weight: 900; }
  .modal-ms-name { font-family: var(--sans); font-size: 12px; color: var(--ink); font-weight: 500; }
  .modal-ms-name.done { color: var(--ok); }
  .modal-ms-name.late { color: var(--alert); }
  .modal-ms-name.cur  { color: var(--accent); font-weight: 700; }
  .modal-ms-date { font-family: var(--sans); font-size: 10px; color: var(--muted); text-align: right; white-space: nowrap; }
  .modal-ms-date.done { color: var(--ok); }
  .modal-ms-date.late { color: var(--alert); font-weight: 700; }

  /* ═══ V5 FEE-EARNER SWITCHER ═══ */
  #sec-allocation { --fe-rust:#b06a37; --fe-rust-soft:rgba(176,106,55,0.13); --fe-tan:#e7ddc9; --fe-ink:#2c2820; --fe-soft:#6c6555; --fe-mut:#b4ab97; --fe-rule:#e3d9c4; --fe-green:#3f6f3a; --fe-red:#9e3a2b; }
  .col-rail { max-width: 360px; }
  .fe-switch-head { display:flex; justify-content:space-between; align-items:baseline; padding-bottom:14px; border-bottom:1px solid var(--fe-rule); }
  .fe-switch-head .l { font-family:var(--sans); font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:var(--fe-soft); }
  .fe-switch-head .r { font-family:var(--sans); font-size:8.5px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:var(--fe-mut); }
  .fe-avatars { display:flex; gap:10px; flex-wrap:wrap; padding:18px 0 20px; }
  .fe-ava { position:relative; width:46px; height:46px; border-radius:50%; border:none; cursor:pointer; background:var(--fe-tan); display:flex; align-items:center; justify-content:center; padding:0; transition:transform 180ms var(--ease), box-shadow 180ms var(--ease), background 180ms ease; }
  .fe-ava:hover { transform:translateY(-2px); box-shadow:0 5px 16px -5px rgba(176,106,55,0.45); }
  .fe-ini { font-family:var(--sans); font-size:13px; font-weight:700; letter-spacing:0.5px; color:var(--fe-soft); }
  .fe-ava.on { background:var(--fe-rust); }
  .fe-ava.on .fe-ini { color:#fff; }
  .fe-dot { position:absolute; top:0; right:0; width:10px; height:10px; border-radius:50%; background:var(--fe-red); border:2px solid var(--paper); }
  .fe-panel { display:none; }
  .fe-panel.on { display:block; animation:feIn 280ms var(--ease); }
  @keyframes feIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:none; } }
  .fe-name { font-family:var(--serif); font-size:21px; font-weight:400; color:var(--fe-ink); display:flex; justify-content:space-between; align-items:baseline; gap:12px; letter-spacing:-0.2px; }
  .fe-sub { font-family:var(--serif); font-style:italic; font-size:12.5px; color:var(--fe-mut); font-weight:400; white-space:nowrap; }
  .fe-matters { margin:14px 0 4px; }
  .fe-matter { display:flex; gap:14px; align-items:flex-start; padding:12px 8px; border-bottom:1px solid var(--fe-rule); cursor:pointer; transition:background 160ms var(--ease); margin:0 -8px; border-radius:4px; }
  .fe-matter:hover { background:var(--fe-rust-soft); }
  .fe-days { flex:0 0 auto; width:42px; }
  .fe-days .n { display:block; font-family:var(--sans); font-size:19px; font-weight:700; color:var(--fe-ink); line-height:1; letter-spacing:-0.5px; }
  .fe-days.late .n { color:var(--fe-red); }
  .fe-days .l { display:block; font-family:var(--sans); font-size:7.5px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase; color:var(--fe-mut); margin-top:3px; }
  .fe-mbody { flex:1; min-width:0; border-left:1px solid var(--fe-rule); padding-left:15px; }
  .fe-mname { font-family:var(--serif); font-size:15.5px; color:var(--fe-ink); line-height:1.25; }
  .fe-mstage { font-family:var(--serif); font-style:italic; font-size:12px; color:var(--fe-mut); margin-top:4px; display:flex; align-items:center; gap:6px; }
  .fe-sdot { width:5px; height:5px; border-radius:50%; background:var(--fe-rust); flex-shrink:0; }
  .fe-sdot.late { background:var(--fe-red); }
  .fe-alerts-head { display:flex; justify-content:space-between; align-items:baseline; margin:26px 0 8px; font-family:var(--sans); font-size:10px; font-weight:800; letter-spacing:1.6px; text-transform:uppercase; color:var(--fe-soft); }
  .fe-items { font-size:8.5px; font-weight:700; letter-spacing:1.2px; color:var(--fe-mut); }
  .fe-ahead { font-family:var(--serif); font-size:15px; color:var(--fe-ink); margin:16px 0 4px; }
  .fe-alert { display:grid; grid-template-columns:56px 1fr; gap:12px; padding:9px 8px; margin:0 -8px; align-items:baseline; cursor:pointer; border-radius:4px; transition:background 160ms var(--ease); }
  .fe-alert:hover { background:var(--fe-rust-soft); }
  .fe-abadge { font-family:var(--sans); font-size:8.5px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; color:var(--fe-mut); white-space:nowrap; }
  .fe-abadge.red { color:var(--fe-red); }
  .fe-abadge.amber { color:var(--fe-rust); }
  .fe-abadge.green { color:var(--fe-green); }
  .fe-atext { font-size:13.5px; color:var(--fe-ink); line-height:1.35; }
  .fe-amatter { display:block; font-family:var(--serif); font-style:italic; font-size:11.5px; color:var(--fe-mut); margin-top:2px; }
  .fe-empty { font-family:var(--serif); font-style:italic; font-size:13px; color:var(--fe-mut); padding:10px 0; }

  /* ═══ TOOLTIP WIRE-UP (inline script injected with renderMiddle) ═══ */
  `;

  /* ═════════ MILESTONE NODE RENDERER ═════════ */

  function msNode(ms, isCurrent, today, K, esc) {
    const f = ms.cellValuesByFieldId;
    const st = f[M.status] && f[M.status].name || 'Pending';
    const td = f[M.targetDate];
    const cd = f[M.completed];
    const typ = f[M.type] || '';
    const notes = f[M.notes] || '';
    const late = td && td < today;

    let dotCls, lblCls, dateHtml, tipStat;

    if (st === 'Completed') {
      dotCls = 'done'; lblCls = 'done';
      dateHtml = `<span style="color:var(--ok)">${fmtShort(cd || td)}</span>`;
      tipStat  = 'Done ' + fmtShort(cd || td);
    } else if (st === 'Skipped') {
      dotCls = 'skipped'; lblCls = 'skipped';
      dateHtml = `<span style="font-style:italic;color:var(--muted-2);font-size:8.5px">Skipped</span>`;
      tipStat  = 'Skipped';
    } else if (isCurrent && late) {
      const n = K.daysDiff(td, today);
      dotCls = 'cur-late'; lblCls = 'cur-late';
      dateHtml = `<span style="color:var(--alert)">${fmtShort(td)}</span><span class="late-flag" style="color:var(--alert)">${n}d overdue</span>`;
      tipStat  = n + 'd overdue';
    } else if (isCurrent) {
      dotCls = 'cur'; lblCls = 'cur';
      dateHtml = td ? `<span style="color:var(--accent);font-weight:700">${fmtShort(td)}</span>` : '';
      tipStat  = 'Current · due ' + (td ? fmtShort(td) : 'TBD');
    } else if (st === 'Pending' && late) {
      const n = K.daysDiff(td, today);
      dotCls = 'overdue'; lblCls = 'overdue';
      dateHtml = `<span style="color:#c06060">${fmtShort(td)}</span><span class="late-flag" style="color:#c06060">${n}d late</span>`;
      tipStat  = n + 'd late';
    } else {
      dotCls = ''; lblCls = '';
      dateHtml = td ? `<span>${fmtShort(td)}</span>` : '';
      tipStat  = td ? 'Due ' + fmtShort(td) : 'Pending';
    }

    return `<div class="ms"
      data-ms-id="${esc(ms.id)}"
      data-tip-type="${esc(typ)}"
      data-tip-status="${esc(tipStat)}"
      data-tip-notes="${esc(notes)}">
      <div class="ms-date">${dateHtml}</div>
      <div class="ms-dot ${dotCls}"></div>
      <div class="ms-label ${lblCls}">${esc(typ)}</div>
    </div>`;
  }

  /* ═════════ RENDER MIDDLE ═════════ */

  function renderMiddle(s, ctx) {
    const { today, tz, K } = ctx;
    const esc = K.esc;

    const { active, overdueMilestones, searchExpiring, dueThisWeek } = s;

    // ── fee-earner switcher (V5): avatars filter matters + alerts to one earner
    const byEarner = {};
    for (const e of active) { const a = e.assignee || 'Unassigned'; (byEarner[a] = byEarner[a] || []).push(e); }
    const earnerNames = Object.keys(byEarner).sort();
    const _ini = (name) => { const p = (name || '').trim().split(/\s+/); return (((p[0] || '')[0] || '') + ((p[1] || '')[0] || '')).toUpperCase(); };
    const _asg = (cr) => { const raw = cr && cr.cellValuesByFieldId[C.assignee]; return raw == null ? 'Unassigned' : (typeof raw === 'object' ? (raw.name || 'Unassigned') : String(raw)); };
    const _alertsFor = (name) => ({
      overdue:  overdueMilestones.filter(x => _asg(x.convRec) === name),
      expiring: searchExpiring.filter(x => _asg(x.convRec) === name),
      due:      dueThisWeek.filter(x => _asg(x.convRec) === name),
    });
    let _avatars = '', _panels = '';
    earnerNames.forEach((name, i) => {
      const listE = byEarner[name].slice().sort((a, b) => (a.daysLeft == null ? 1e9 : a.daysLeft) - (b.daysLeft == null ? 1e9 : b.daysLeft));
      const al = _alertsFor(name);
      const alertCount = al.overdue.length + al.expiring.length + al.due.length;
      const on0 = i === 0;
      _avatars += `<button type="button" class="fe-ava ${on0 ? 'on' : ''}" data-earner="${i}" title="${esc(name)}"><span class="fe-ini">${esc(_ini(name))}</span>${alertCount ? '<span class="fe-dot"></span>' : ''}</button>`;
      let _rows = '';
      for (const e of listE) {
        const f = e.conv.cellValuesByFieldId;
        const nm = f[C.name] || 'Untitled';
        const dl = e.daysLeft;
        const curName = e.curIdx >= 0 ? (e.msList[e.curIdx].cellValuesByFieldId[M.type] || 'In progress') : 'Complete';
        const curTd = e.curIdx >= 0 ? e.msList[e.curIdx].cellValuesByFieldId[M.targetDate] : null;
        const curLate = curTd && curTd < today;
        _rows += `<div class="fe-matter" data-modal="matter" data-id="${esc(e.conv.id)}" role="button" tabindex="0"><div class="fe-days ${dl != null && dl < 0 ? 'late' : ''}"><span class="n">${dl == null ? '&mdash;' : Math.abs(dl)}</span><span class="l">${dl != null && dl < 0 ? 'days late' : 'days'}</span></div><div class="fe-mbody"><div class="fe-mname">${esc(nm)}</div><div class="fe-mstage"><span class="fe-sdot ${curLate ? 'late' : ''}"></span>${esc(curName)}</div></div></div>`;
      }
      const _dls = listE.map(e => e.daysLeft).filter(d => d != null);
      const _next = _dls.length ? Math.min.apply(null, _dls) : null;
      const _nextTxt = _next == null ? '' : (_next < 0 ? Math.abs(_next) + 'd overdue' : 'next in ' + _next + 'd');
      const _grp = (title, items, fn) => { if (!items.length) return ''; let h = `<div class="fe-ahead">${esc(title)}</div>`; for (const it of items) h += fn(it); return h; };
      let _alerts = '';
      _alerts += _grp('Overdue', al.overdue, (x) => { const t = x.ms.cellValuesByFieldId[M.type] || 'Milestone'; const mn = x.convRec ? (x.convRec.cellValuesByFieldId[C.name] || '') : ''; return `<div class="fe-alert" data-modal="matter" data-id="${esc(x.convRec ? x.convRec.id : '')}" role="button" tabindex="0"><div class="fe-abadge red">${x.daysLate}d late</div><div class="fe-atext">${esc(t)}<span class="fe-amatter">${esc(mn)}</span></div></div>`; });
      _alerts += _grp('Official Search Expiring', al.expiring, (x) => { const mn = x.convRec ? (x.convRec.cellValuesByFieldId[C.name] || '') : ''; const lbl = x.daysUntilExpiry === 0 ? 'Today' : x.daysUntilExpiry + 'd left'; return `<div class="fe-alert" data-modal="matter" data-id="${esc(x.convRec ? x.convRec.id : '')}" role="button" tabindex="0"><div class="fe-abadge ${x.daysUntilExpiry <= 3 ? 'red' : 'amber'}">${esc(lbl)}</div><div class="fe-atext">Official search expires ${fmtShort(x.expiryDate)}<span class="fe-amatter">${esc(mn)}</span></div></div>`; });
      _alerts += _grp('Due This Week', al.due, (x) => { const t = x.ms.cellValuesByFieldId[M.type] || 'Milestone'; const td = x.ms.cellValuesByFieldId[M.targetDate] || ''; const mn = x.convRec ? (x.convRec.cellValuesByFieldId[C.name] || '') : ''; return `<div class="fe-alert" data-modal="matter" data-id="${esc(x.convRec ? x.convRec.id : '')}" role="button" tabindex="0"><div class="fe-abadge green">${esc(fmtShort(td))}</div><div class="fe-atext">${esc(t)}<span class="fe-amatter">${esc(mn)}</span></div></div>`; });
      if (!_alerts) _alerts = `<div class="fe-empty">No alerts for ${esc((name.split(/\s+/)[0]) || name)}.</div>`;
      const _first = esc((name.split(/\s+/)[0] || name).toUpperCase());
      _panels += `<div class="fe-panel ${on0 ? 'on' : ''}" data-panel="${i}"><div class="fe-name">${esc(name)}<span class="fe-sub">${byEarner[name].length} matter${byEarner[name].length !== 1 ? 's' : ''}${_nextTxt ? ' &middot; ' + esc(_nextTxt) : ''}</span></div><div class="fe-matters">${_rows}</div><div class="fe-alerts-head">&mdash; Alerts &middot; ${_first}<span class="fe-items">${alertCount} item${alertCount !== 1 ? 's' : ''}</span></div><div class="fe-alerts">${_alerts}</div></div>`;
    });
    const allocSection = `<div class="sec" id="sec-allocation"><div class="fe-switch-head"><span class="l">Matter Allocation</span><span class="r">${earnerNames.length} fee earner${earnerNames.length !== 1 ? 's' : ''}</span></div><div class="fe-avatars">${_avatars}</div><div class="fe-panels">${_panels || '<div class="fe-empty">No active matters.</div>'}</div></div>`;
    const switchScript = `<script>(function(){var r=document.getElementById('sec-allocation');if(!r)return;r.addEventListener('click',function(e){var b=e.target.closest('.fe-ava');if(!b)return;var i=b.getAttribute('data-earner');r.querySelectorAll('.fe-ava').forEach(function(x){x.classList.toggle('on',x===b);});r.querySelectorAll('.fe-panel').forEach(function(p){p.classList.toggle('on',p.getAttribute('data-panel')===i);});});document.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var t=e.target;if(t&&t.getAttribute&&(t.getAttribute('role')==='button'||t.hasAttribute('data-modal')||t.hasAttribute('data-earner')||t.hasAttribute('data-scroll'))){e.preventDefault();t.click();}});})();<\/script>`;

    // hero stats
    const activeCount  = active.length;
    const overdueCount = overdueMilestones.length;
    const expCount     = searchExpiring.length;
    const dueCount     = dueThisWeek.length;

    // ── hero
    const hero = `
      <div class="hero">
        <div class="hero-greet">Here is the live status of the conveyancing pipeline.</div>
        <div class="hero-stats">
          <div class="hstat" data-scroll="sec-transactions" role="button" tabindex="0" title="Active files">
            <span class="hstat-num">${activeCount}</span><span class="hstat-label">Active Files</span>
          </div>
          <div class="hstat" data-scroll="sec-alerts" role="button" tabindex="0" title="Due this week">
            <span class="hstat-num">${dueCount}</span><span class="hstat-label">Due This Week</span>
          </div>
          <div class="hstat" data-scroll="sec-alerts" role="button" tabindex="0" title="Official searches expiring">
            <span class="hstat-num ${expCount ? 'alert' : 'ok'}">${expCount}</span><span class="hstat-label">Search Expiry</span>
          </div>
          <div class="hstat" data-scroll="sec-alerts" role="button" tabindex="0" title="${overdueCount ? 'Overdue milestones' : 'All milestones on track'}">
            <span class="hstat-num ${overdueCount ? 'alert' : 'ok'}">${overdueCount}</span><span class="hstat-label">Overdue</span>
          </div>
        </div>
      </div>`;

    // ── alerts section
    function alertRowHtml(label, labelCls, title, matterName, id) {
      return `<div class="alert-row" data-modal="matter" data-id="${esc(id)}" role="button" tabindex="0">
        <div class="alert-when ${labelCls}">${esc(label)}</div>
        <div class="alert-title">${esc(title)}<span class="alert-matter">${matterName ? ' · ' + esc(matterName) : ''}</span></div>
      </div>`;
    }

    let alertRows = '';
    if (overdueMilestones.length) {
      alertRows += `<div class="docket-group"><div class="docket-group-label alert">Overdue</div>`;
      for (const { ms, convRec, daysLate } of overdueMilestones) {
        const msType = ms.cellValuesByFieldId[M.type] || 'Milestone';
        const matterName = convRec ? (convRec.cellValuesByFieldId[C.name] || '') : '';
        alertRows += alertRowHtml(`${daysLate}d late`, 'red', msType, matterName, convRec ? convRec.id : '');
      }
      alertRows += `</div>`;
    }
    if (searchExpiring.length) {
      alertRows += `<div class="docket-group"><div class="docket-group-label alert">Official Search Expiring</div>`;
      for (const { ms, convRec, expiryDate, daysUntilExpiry } of searchExpiring) {
        const matterName = convRec ? (convRec.cellValuesByFieldId[C.name] || '') : '';
        const label = daysUntilExpiry === 0 ? 'Today' : `${daysUntilExpiry}d left`;
        alertRows += alertRowHtml(label, daysUntilExpiry <= 3 ? 'red' : 'amber', `Official search expires ${fmtShort(expiryDate)}`, matterName, convRec ? convRec.id : '');
      }
      alertRows += `</div>`;
    }
    if (dueThisWeek.length) {
      alertRows += `<div class="docket-group"><div class="docket-group-label today">Due This Week</div>`;
      for (const { ms, convRec } of dueThisWeek) {
        const msType = ms.cellValuesByFieldId[M.type] || 'Milestone';
        const td = ms.cellValuesByFieldId[M.targetDate] || '';
        const matterName = convRec ? (convRec.cellValuesByFieldId[C.name] || '') : '';
        alertRows += alertRowHtml(fmtShort(td), '', msType, matterName, convRec ? convRec.id : '');
      }
      alertRows += `</div>`;
    }
    if (!alertRows) alertRows = `<div class="empty-text">No urgent items this week. All files on track.</div>`;

    const alertsSection = `
      <div class="sec" id="sec-alerts">
        <div class="sec-head"><span class="l">Alerts</span><span class="r">${overdueCount ? overdueCount + ' overdue' : expCount ? expCount + ' search expir' + (expCount === 1 ? 'y' : 'ies') : 'All clear'}</span></div>
        <div class="docket-card">${alertRows}</div>
      </div>`;

    // ── transaction cards
    let cards = '';
    for (const { conv, msList, curIdx: curI, doneCount, pct, daysLeft, assignee } of active) {
      const f = conv.cellValuesByFieldId;
      const name       = f[C.name] || 'Untitled Matter';
      const buyer      = f[C.buyer] || '';
      const seller     = f[C.seller] || '';
      const tenure     = f[C.tenure] && f[C.tenure].name || '';
      const price      = f[C.price];
      const instrDate  = f[C.instrDate];
      const targetComp = f[C.targetComp];
      const titleNum   = f[C.titleNum] || '';
      const nonSkipped = msList.filter(m => m.cellValuesByFieldId[M.status] && m.cellValuesByFieldId[M.status].name !== 'Skipped').length;
      const curMsName  = curI >= 0 ? (msList[curI].cellValuesByFieldId[M.type] || 'In Progress') : (doneCount > 0 ? 'Completed' : 'Not started');
      const curMsLate  = curI >= 0 && msList[curI].cellValuesByFieldId[M.targetDate] && msList[curI].cellValuesByFieldId[M.targetDate] < today;

      const tenureBadge = tenure === 'Leasehold' ? '<span class="badge b-leasehold">Leasehold</span>'
                        : tenure === 'Freehold'  ? '<span class="badge b-freehold">Freehold</span>' : '';

      const n = msList.length;
      const fillPct = (n > 1 && doneCount > 0) ? Math.round(doneCount / (n - 1) * 100) : 0;
      const lineStyle = `left:86px;right:86px;background:linear-gradient(to right,var(--ok) ${fillPct}%,var(--rule) ${fillPct}%)`;

      const nodes = msList.map((ms, i) => msNode(ms, i === curI, today, K, esc)).join('');

      cards += `<div class="txn-card" data-modal="matter" data-id="${esc(conv.id)}" role="button" tabindex="0">
        <div class="txn-header">
          <div class="txn-title-group">
            <div class="txn-matter">${esc(name)} ${tenureBadge} <span class="badge b-active">Active</span></div>
            <div class="txn-parties">
              <b>${esc(titleCase(buyer))}</b><span class="arrow">&#8594;</span><b>${esc(titleCase(seller))}</b>${titleNum ? `<span class="sep">·</span><span>${esc(titleNum)}</span>` : ''}
            </div>
            <div class="txn-meta">
              ${instrDate ? `<div class="txn-meta-item">Instructions <span class="val">${fmtFull(instrDate)}</span></div>` : ''}
              ${targetComp ? `<div class="txn-meta-item">Target Completion <span class="val ${daysLeft !== null && daysLeft <= 21 ? 'alert' : ''}">${fmtFull(targetComp)}</span></div>` : ''}
              ${daysLeft !== null ? `<div class="txn-meta-item">Days Remaining <span class="val ${daysLeft < 0 ? 'alert' : daysLeft <= 21 ? 'alert' : 'ok'}">${Math.abs(daysLeft)}${daysLeft < 0 ? ' overdue' : ''}</span></div>` : ''}
              <div class="txn-meta-item">Now At <span class="val ${curMsLate ? 'alert' : 'accent'}">${esc(curMsName)}</span></div>
              ${assignee ? `<div class="txn-meta-item">Fee Earner <span class="val accent">${esc(assignee)}</span></div>` : ''}
            </div>
          </div>
          ${price ? `<div class="txn-price"><span class="currency">Purchase Price · Ksh</span><span class="amount">${esc(fmtKsh(price))}</span></div>` : ''}
        </div>
        <hr class="tl-divider">
        <div class="tl-label">Conveyancing Cycle</div>
        <div class="tl-scroll"><div class="tl">
          <div class="tl-line" style="${lineStyle}"></div>
          ${nodes || '<p style="font-style:italic;color:var(--muted-2);font-size:13px;padding:12px 0">No milestones logged yet.</p>'}
        </div></div>
        <div class="prog-wrap">
          <span class="prog-label">Progress</span>
          <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
          <span class="prog-pct">${pct}% &nbsp;·&nbsp; ${doneCount} of ${nonSkipped} milestones complete</span>
        </div>
      </div>`;
    }

    const txnRight = active.length ? `${active.length} file${active.length !== 1 ? 's' : ''}` : 'No active files';
    const txnsSection = `
      <div class="sec" id="sec-transactions">
        <div class="sec-head"><span class="l">Active Transactions</span><span class="r">${esc(txnRight)}</span></div>
        ${active.length ? `<div>${cards}</div>` : '<div class="empty-text">No active conveyancing files.</div>'}
      </div>`;

    // Tooltip element + wiring script (runs after content is in DOM)
    const tipEl = `<div id="conv-tip"></div>`;
    const tipScript = `<script>
(function(){
  var tip = document.getElementById('conv-tip');
  if(!tip) return;
  var _to;
  document.addEventListener('mouseover', function(e){
    var ms = e.target.closest('.ms');
    if(!ms) return;
    clearTimeout(_to);
    while (tip.firstChild) tip.removeChild(tip.firstChild);
    var _s = document.createElement('strong');
    _s.style.cssText = 'display:block;margin-bottom:3px';
    _s.textContent = ms.dataset.tipType || '';
    tip.appendChild(_s);
    tip.appendChild(document.createTextNode(ms.dataset.tipStatus || ''));
    if (ms.dataset.tipNotes) {
      var _n = document.createElement('span');
      _n.style.cssText = 'display:block;margin-top:4px;font-size:10px;opacity:0.65';
      _n.textContent = ms.dataset.tipNotes;
      tip.appendChild(_n);
    }
    var dot = ms.querySelector('.ms-dot');
    if(!dot) return;
    var r = dot.getBoundingClientRect();
    var tw = 200;
    var left = r.left + r.width/2 - tw/2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    tip.style.width = tw + 'px';
    tip.style.left  = left + 'px';
    tip.style.top   = r.top + 'px';
    tip.style.transform = 'translateY(-100%) translateY(-12px)';
    tip.classList.add('show');
    var actualLeft = parseFloat(tip.style.left);
    var dotCX = r.left + r.width/2;
    var pct = Math.round(((dotCX - actualLeft) / tw) * 100);
    tip.style.setProperty('--tip-caret', pct + '%');
  });
  document.addEventListener('mouseout', function(e){
    if(!e.target.closest('.ms')) return;
    _to = setTimeout(function(){ tip.classList.remove('show'); }, 80);
  });
})();
<\/script>`;

    return `
      <style>${DOMAIN_STYLES}</style>
      ${tipEl}
      ${hero}
      <div class="cols">
        <div class="col col-rail">
          ${allocSection}
        </div>
        <div class="col">
          ${txnsSection}
        </div>
      </div>
      ${tipScript}
      ${switchScript}`;
  }

  /* ═════════ MODALS ═════════ */

  const modals = {
    matter(id, ctx) {
      const { today, K, shaped } = ctx;
      const esc = K.esc;
      // find the conveyance in shaped.active by conv.id
      const entry = (shaped.active || []).find(e => e.conv.id === id);
      if (!entry) return '<div class="modal-eyebrow">Transaction Detail</div><div class="empty-text">Matter not found.</div>';

      const { conv, msList, curIdx: curI, doneCount, daysLeft } = entry;
      const f = conv.cellValuesByFieldId;
      const name       = f[C.name] || 'Untitled';
      const buyer      = f[C.buyer] || '';
      const seller     = f[C.seller] || '';
      const tenure     = f[C.tenure] && f[C.tenure].name || '';
      const price      = f[C.price];
      const instrDate  = f[C.instrDate];
      const targetComp = f[C.targetComp];
      const actualComp = f[C.actualComp];
      const titleNum   = f[C.titleNum] || '';

      const msRows = msList.map((ms, i) => {
        const mf = ms.cellValuesByFieldId;
        const st = mf[M.status] && mf[M.status].name || 'Pending';
        const typ = mf[M.type] || '';
        const td = mf[M.targetDate];
        const cd = mf[M.completed];
        const isCur = i === curI;
        const late = td && td < today && st !== 'Completed' && st !== 'Skipped';
        let dotCls = '', nameCls = '', dateCls = '', ds = '';
        if (st === 'Completed') {
          dotCls = 'done'; nameCls = 'done'; dateCls = 'done';
          ds = '✓ ' + fmtShort(cd || td);
        } else if (isCur && late) {
          dotCls = 'late'; nameCls = 'late'; dateCls = 'late';
          ds = fmtShort(td) + ' · ' + K.daysDiff(td, today) + 'd overdue';
        } else if (isCur) {
          dotCls = 'cur'; nameCls = 'cur';
          ds = td ? fmtShort(td) : 'In progress';
        } else if (late) {
          dotCls = 'late'; dateCls = 'late';
          ds = fmtShort(td) + ' · late';
        } else {
          ds = td ? fmtShort(td) : '';
        }
        return `<div class="modal-ms-row">
          <div class="modal-ms-dot ${dotCls}"></div>
          <div class="modal-ms-name ${nameCls}">${esc(typ)}</div>
          <div class="modal-ms-date ${dateCls}">${esc(ds)}</div>
        </div>`;
      }).join('');

      return `
        <div class="modal-eyebrow">Transaction Detail</div>
        <div class="modal-title">${esc(name)}</div>
        <div class="modal-subtitle">${esc(titleCase(buyer))} &#8594; ${esc(titleCase(seller))}</div>
        <dl class="modal-meta">
          ${titleNum ? `<dt>Title No.</dt><dd>${esc(titleNum)}</dd>` : ''}
          ${tenure ? `<dt>Tenure</dt><dd>${esc(tenure)}</dd>` : ''}
          ${price ? `<dt>Purchase Price</dt><dd>${esc(fmtKshFull(price))}</dd>` : ''}
          ${instrDate ? `<dt>Instructions</dt><dd>${esc(fmtFull(instrDate))}</dd>` : ''}
          ${targetComp ? `<dt>Target Completion</dt><dd>${esc(fmtFull(targetComp))}${daysLeft !== null ? ` <span style="color:${daysLeft < 0 ? 'var(--alert)' : 'var(--muted)'};font-size:10px">(${Math.abs(daysLeft)}d ${daysLeft < 0 ? 'overdue' : 'remaining'})</span>` : ''}</dd>` : ''}
          ${actualComp ? `<dt>Completed</dt><dd>${esc(fmtFull(actualComp))}</dd>` : ''}
          <dt>Progress</dt><dd>${doneCount} of ${msList.length} milestones complete</dd>
        </dl>
        <div class="modal-eyebrow" style="margin-top:18px">Milestones</div>
        <div class="modal-ms-list">${msRows || '<p style="font-style:italic;color:var(--muted-2);font-size:13px;padding:8px 0">No milestones logged yet.</p>'}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-modal-close>Close</button>
        </div>`;
    },
  };

  /* ═════════ ACTIONS ═════════ */
  // The conveyancing tracker is read-only in V1. Milestone status updates
  // are done directly in Airtable. Write-back actions can be added in V2.
  const actions = {};

  return {
    title: 'The Conveyancing Tracker',
    mcpTools: [
      'mcp____AT_SERVER_UUID____list_records_for_table',
    ],
    queries: [
      {
        id: 'conveyances', server: 'AT', baseId: '__CONV_BASE_ID__',
        tool: 'list_records_for_table',
        args: {
          tableId: '__CONV_CONVEYANCES_TBL__',
          fieldIds: [
            C.name, C.buyer, C.seller, C.status, C.tenure, C.price,
            C.instrDate, C.targetComp, C.actualComp, C.titleNum, C.assignee,
          ],
          pageSize: 8000,
        },
      },
      {
        id: 'milestones', server: 'AT', baseId: '__CONV_BASE_ID__',
        tool: 'list_records_for_table',
        args: {
          tableId: '__CONV_MILESTONES_TBL__',
          fieldIds: [
            M.type, M.targetDate, M.status, M.completed,
            M.conveyance, M.notes, M.searchExpiry,
          ],
          pageSize: 8000,
        },
      },
    ],
    shape,
    renderMiddle,
    actions,
    modals,
  };
});
