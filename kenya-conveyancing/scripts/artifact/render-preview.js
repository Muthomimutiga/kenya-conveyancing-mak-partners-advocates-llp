// render-preview.js — local preview of the kit-built Conveyancing Tracker.
// Resolves all install tokens with demo values, then injects a fake
// window.cowork.callMcpTool so the shell's runQueries path executes against
// sample data (no CoWork, no live MCP). Writes preview.html.
// Run: node scripts/artifact/render-preview.js
// Then open scripts/artifact/preview.html in a browser.
const fs   = require('fs');
const path = require('path');
const { applyIds } = require('./apply-ids.js');

const builtPath = path.join(__dirname, '..', 'assets', 'artifact-template.html');
let html = fs.readFileSync(builtPath, 'utf8');

// Demo token values — field IDs use short readable keys so the mock router
// can distinguish conveyances from milestones by tableId.
const demo = {
  '__FIRM_NAME__':           'MAK & Partners Advocates LLP',
  '__BRIEF_TZ__':            'Africa/Nairobi',
  '__AT_SERVER_UUID__':      'demoAT',
  '__GCAL_SERVER_UUID__':    '__GCAL_UUID_ABSENT__',
  '__GMAIL_SERVER_UUID__':   '__GMAIL_UUID_ABSENT__',
  '__CONV_BASE_ID__':        'demoConvBase',
  '__CONV_CONVEYANCES_TBL__':'tblConveyances',
  '__CONV_MILESTONES_TBL__': 'tblMilestones',
  // Conveyance field IDs
  '__CONV_F_CVY_NAME__':     'name',
  '__CONV_F_CVY_BUYER__':    'buyer',
  '__CONV_F_CVY_SELLER__':   'seller',
  '__CONV_F_CVY_STATUS__':   'status',
  '__CONV_F_CVY_TENURE__':   'tenure',
  '__CONV_F_CVY_PRICE__':    'price',
  '__CONV_F_CVY_INSTR__':    'instrDate',
  '__CONV_F_CVY_TARGET__':   'targetComp',
  '__CONV_F_CVY_ACTUAL__':   'actualComp',
  '__CONV_F_CVY_TITLE__':    'titleNum',
  '__CONV_F_CVY_ASSIGNEE__': 'assignee',
  // Milestone field IDs
  '__CONV_F_MS_TYPE__':        'type',
  '__CONV_F_MS_TARGETDATE__':  'targetDate',
  '__CONV_F_MS_STATUS__':      'status',
  '__CONV_F_MS_COMPLETED__':   'completed',
  '__CONV_F_MS_CONVEYANCE__':  'conveyance',
  '__CONV_F_MS_NOTES__':       'notes',
  '__CONV_F_MS_SEARCHEXPIRY__':'searchExpiry',
};
html = applyIds(html, demo);

// Sample data — includes:
//   recC1: one overdue milestone (Consent to Transfer, target 2026-05-20)
//   recC2: official search expiring in ~5 days (expiry 2026-06-08)
//   recC3: clean active file, nothing urgent
//   recC4: Completed file (excluded from active view)
const CONVEYANCES = [
  { id:'recC1', cellValuesByFieldId:{ name:'Kasuku Road — Githurai 45', buyer:'Peter Njoroge Kamau', seller:'Lydia Wambui Njuguna', status:{name:'Active'}, tenure:{name:'Freehold'}, price:8500000, instrDate:'2026-03-10', targetComp:'2026-08-01', actualComp:null, titleNum:'LR No. 27948', assignee:{name:'Ken Ashimosi'} }},
  { id:'recC2', cellValuesByFieldId:{ name:'Lavington Green — Apt 4B', buyer:'Amara Holdings Ltd', seller:'David Omondi Ochieng', status:{name:'Active'}, tenure:{name:'Leasehold'}, price:22000000, instrDate:'2026-02-14', targetComp:'2026-07-15', actualComp:null, titleNum:'LR No. 8831/4', assignee:{name:'Ann Wayodi'} }},
  { id:'recC3', cellValuesByFieldId:{ name:'Ruiru — Plot 1156', buyer:'Faith Muthoni Kariuki', seller:'Kiambu County Government', status:{name:'Active'}, tenure:{name:'Freehold'}, price:3200000, instrDate:'2026-04-01', targetComp:'2026-09-01', actualComp:null, titleNum:'Ruiru/Block 4/1156', assignee:{name:'Ken Ashimosi'} }},
  { id:'recC4', cellValuesByFieldId:{ name:'Kilimani — Plot 88', buyer:'Jane Wangari Kamau', seller:'Marcus Dev Ltd', status:{name:'Completed'}, tenure:{name:'Freehold'}, price:15000000, instrDate:'2025-10-01', targetComp:'2026-04-01', actualComp:'2026-03-28', titleNum:'LR No. 4401', assignee:{name:'Ann Wayodi'} }},
];

const MILESTONES = [
  // recC1: M1-M3 done, M4 overdue (Consent, target 2026-05-20), M5-M9 pending
  { id:'msC1M1', cellValuesByFieldId:{ type:'Instructions Received', targetDate:'2026-03-12', status:{name:'Completed'}, completed:'2026-03-11', conveyance:[{id:'recC1'}], notes:'Certified copies of title received.', searchExpiry:null }},
  { id:'msC1M2', cellValuesByFieldId:{ type:'Draft Agreement',       targetDate:'2026-03-20', status:{name:'Completed'}, completed:'2026-03-19', conveyance:[{id:'recC1'}], notes:'SPA agreed and signed.', searchExpiry:null }},
  { id:'msC1M3', cellValuesByFieldId:{ type:'Official Search',       targetDate:'2026-03-28', status:{name:'Completed'}, completed:'2026-03-27', conveyance:[{id:'recC1'}], notes:'Search clear.', searchExpiry:null }},
  { id:'msC1M4', cellValuesByFieldId:{ type:'Consent to Transfer',   targetDate:'2026-05-20', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'Awaiting Land Control Board consent.', searchExpiry:null }},
  { id:'msC1M5', cellValuesByFieldId:{ type:'Stamp Duty Assessment', targetDate:'2026-06-15', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'', searchExpiry:null }},
  { id:'msC1M6', cellValuesByFieldId:{ type:'Stamp Duty Payment',    targetDate:'2026-06-22', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'', searchExpiry:null }},
  { id:'msC1M7', cellValuesByFieldId:{ type:'Registration',          targetDate:'2026-07-08', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'', searchExpiry:null }},
  { id:'msC1M8', cellValuesByFieldId:{ type:'Collection of Title',   targetDate:'2026-07-22', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'', searchExpiry:null }},
  { id:'msC1M9', cellValuesByFieldId:{ type:'Completion',            targetDate:'2026-08-01', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC1'}], notes:'', searchExpiry:null }},

  // recC2: M1-M4 done, M3 has official search expiry 2026-06-08 (~5 days), M5 In Progress
  { id:'msC2M1', cellValuesByFieldId:{ type:'Instructions Received', targetDate:'2026-02-16', status:{name:'Completed'}, completed:'2026-02-16', conveyance:[{id:'recC2'}], notes:'Full set of title docs received.', searchExpiry:null }},
  { id:'msC2M2', cellValuesByFieldId:{ type:'Draft Agreement',       targetDate:'2026-02-25', status:{name:'Completed'}, completed:'2026-02-24', conveyance:[{id:'recC2'}], notes:'', searchExpiry:null }},
  { id:'msC2M3', cellValuesByFieldId:{ type:'Official Search',       targetDate:'2026-03-05', status:{name:'Completed'}, completed:'2026-03-04', conveyance:[{id:'recC2'}], notes:'Search clear.', searchExpiry:'2026-06-08' }},
  { id:'msC2M4', cellValuesByFieldId:{ type:'Consent to Transfer',   targetDate:'2026-04-05', status:{name:'Completed'}, completed:'2026-04-04', conveyance:[{id:'recC2'}], notes:'LCB consent granted.', searchExpiry:null }},
  { id:'msC2M5', cellValuesByFieldId:{ type:'Stamp Duty Assessment', targetDate:'2026-06-10', status:{name:'In Progress'},completed:null,         conveyance:[{id:'recC2'}], notes:'KES 880,000 assessed.', searchExpiry:null }},
  { id:'msC2M6', cellValuesByFieldId:{ type:'Stamp Duty Payment',    targetDate:'2026-06-15', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC2'}], notes:'Client to remit funds.', searchExpiry:null }},
  { id:'msC2M7', cellValuesByFieldId:{ type:'Registration',          targetDate:'2026-06-30', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC2'}], notes:'', searchExpiry:null }},
  { id:'msC2M8', cellValuesByFieldId:{ type:'Collection of Title',   targetDate:'2026-07-10', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC2'}], notes:'', searchExpiry:null }},
  { id:'msC2M9', cellValuesByFieldId:{ type:'Completion',            targetDate:'2026-07-15', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC2'}], notes:'', searchExpiry:null }},

  // recC3: M1 done, M2 In Progress, nothing urgent
  { id:'msC3M1', cellValuesByFieldId:{ type:'Instructions Received', targetDate:'2026-05-01', status:{name:'Completed'}, completed:'2026-04-30', conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M2', cellValuesByFieldId:{ type:'Draft Agreement',       targetDate:'2026-06-20', status:{name:'In Progress'},completed:null,         conveyance:[{id:'recC3'}], notes:'Awaiting seller review.', searchExpiry:null }},
  { id:'msC3M3', cellValuesByFieldId:{ type:'Official Search',       targetDate:'2026-07-01', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M4', cellValuesByFieldId:{ type:'Consent to Transfer',   targetDate:'2026-07-15', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M5', cellValuesByFieldId:{ type:'Stamp Duty Assessment', targetDate:'2026-07-25', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M6', cellValuesByFieldId:{ type:'Stamp Duty Payment',    targetDate:'2026-08-01', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M7', cellValuesByFieldId:{ type:'Registration',          targetDate:'2026-08-15', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M8', cellValuesByFieldId:{ type:'Collection of Title',   targetDate:'2026-08-25', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
  { id:'msC3M9', cellValuesByFieldId:{ type:'Completion',            targetDate:'2026-09-01', status:{name:'Pending'},   completed:null,         conveyance:[{id:'recC3'}], notes:'', searchExpiry:null }},
];

// Fake CoWork: routes by tool name and AT tableId.
const mockScript = `<script>
window.cowork = { callMcpTool: async function(tool, args) {
  var CONV = ${JSON.stringify(CONVEYANCES)};
  var MS   = ${JSON.stringify(MILESTONES)};
  function at(records) { return { structuredContent: { records: records } }; }
  if (tool.includes('list_records_for_table')) {
    if (args && args.tableId === 'tblConveyances') return at(CONV);
    if (args && args.tableId === 'tblMilestones')  return at(MS);
  }
  return {};
} };
window.__ARTIFACT_MOCK__ = true;
<\/script>`;

html = html.replace('</head>', mockScript + '</head>');

const outPath = path.join(__dirname, 'preview.html');
fs.writeFileSync(outPath, html);
console.log('Wrote', outPath);
