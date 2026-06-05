// view.test.js — exercises the conveyancing view's pure `shape` logic.
// Feeds sample conveyances + milestones through the kit's real helpers and
// asserts overdue detection, official-search expiry countdown, and
// current-milestone bucketing. Run with: node --test view.test.js
const test = require('node:test');
const assert = require('node:assert');
const V = require('./view.js');
const K = require('./kit.js');

const TODAY    = '2026-06-03';
const TOMORROW = '2026-06-04';
const TZ       = 'Africa/Nairobi';

// Conveyancing field-id tokens — must match the C/M maps in view.js.
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

// helpers to build test records
function cvy(id, name, statusName, targetComp, extra) {
  return { id, cellValuesByFieldId: Object.assign({
    [C.name]: name,
    [C.buyer]: 'Buyer A', [C.seller]: 'Seller B',
    [C.status]: { name: statusName },
    [C.tenure]: { name: 'Freehold' }, [C.price]: 5000000,
    [C.instrDate]: '2026-04-01', [C.targetComp]: targetComp,
    [C.actualComp]: null, [C.titleNum]: 'LR/1234',
  }, extra || {}) };
}
function ms(id, type, statusName, targetDate, completedDate, cvyId, searchExpiry, notes) {
  return { id, cellValuesByFieldId: {
    [M.type]:        type,
    [M.status]:      { name: statusName },
    [M.targetDate]:  targetDate || null,
    [M.completed]:   completedDate || null,
    [M.conveyance]:  cvyId ? [{ id: cvyId }] : [],
    [M.searchExpiry]:searchExpiry || null,
    [M.notes]:       notes || '',
  } };
}

// Sample dataset
// - recC1: active, overdue milestone (M4 target 2026-05-20, Pending)
// - recC2: active, official search expiring in ~5 days (target 2026-06-08, searchExpiry 2026-06-08)
// - recC3: active, all clear this week
// - recC4: Completed (excluded from active view)

const conveyances = [
  cvy('recC1', 'Kasuku Road — Githurai 45', 'Active', '2026-08-01'),
  cvy('recC2', 'Lavington Green — Apt 4B', 'Active', '2026-07-15'),
  cvy('recC3', 'Ruiru — Plot 1156', 'Active', '2026-09-01'),
  cvy('recC4', 'Kilimani — Plot 88', 'Completed', '2026-04-01'),
];

const milestones = [
  // recC1: M1-M3 done, M4 overdue (target 2026-05-20 Pending)
  ms('msC1M1','Instructions Received','Completed','2026-04-03','2026-04-02','recC1',null,''),
  ms('msC1M2','Draft Agreement','Completed','2026-04-15','2026-04-14','recC1',null,''),
  ms('msC1M3','Official Search','Completed','2026-04-25','2026-04-24','recC1',null,'Search clear.'),
  ms('msC1M4','Consent to Transfer','Pending','2026-05-20',null,'recC1',null,'Awaiting LCB consent.'),
  ms('msC1M5','Stamp Duty Assessment','Pending','2026-06-15',null,'recC1',null,''),
  ms('msC1M6','Stamp Duty Payment','Pending','2026-06-20',null,'recC1',null,''),
  ms('msC1M7','Registration','Pending','2026-07-05',null,'recC1',null,''),
  ms('msC1M8','Collection of Title','Pending','2026-07-20',null,'recC1',null,''),
  ms('msC1M9','Completion','Pending','2026-08-01',null,'recC1',null,''),

  // recC2: M1-M4 done, M5 In Progress (stamp duty). Official search (M3) expiry in ~5 days: 2026-06-08
  ms('msC2M1','Instructions Received','Completed','2026-03-01','2026-02-28','recC2',null,''),
  ms('msC2M2','Draft Agreement','Completed','2026-03-10','2026-03-09','recC2',null,''),
  ms('msC2M3','Official Search','Completed','2026-03-20','2026-03-19','recC2','2026-06-08','Search clear.'),
  ms('msC2M4','Consent to Transfer','Completed','2026-04-05','2026-04-04','recC2',null,''),
  ms('msC2M5','Stamp Duty Assessment','In Progress','2026-06-10',null,'recC2',null,''),
  ms('msC2M6','Stamp Duty Payment','Pending','2026-06-15',null,'recC2',null,''),
  ms('msC2M7','Registration','Pending','2026-06-30',null,'recC2',null,''),
  ms('msC2M8','Collection of Title','Pending','2026-07-10',null,'recC2',null,''),
  ms('msC2M9','Completion','Pending','2026-07-15',null,'recC2',null,''),

  // recC3: M1 done, M2 In Progress (no urgency this week)
  ms('msC3M1','Instructions Received','Completed','2026-05-01','2026-04-30','recC3',null,''),
  ms('msC3M2','Draft Agreement','In Progress','2026-06-20',null,'recC3',null,''),
  ms('msC3M3','Official Search','Pending','2026-07-01',null,'recC3',null,''),
  ms('msC3M4','Consent to Transfer','Pending','2026-07-15',null,'recC3',null,''),
  ms('msC3M5','Stamp Duty Assessment','Pending','2026-07-25',null,'recC3',null,''),
  ms('msC3M6','Stamp Duty Payment','Pending','2026-08-01',null,'recC3',null,''),
  ms('msC3M7','Registration','Pending','2026-08-15',null,'recC3',null,''),
  ms('msC3M8','Collection of Title','Pending','2026-08-25',null,'recC3',null,''),
  ms('msC3M9','Completion','Pending','2026-09-01',null,'recC3',null,''),

  // recC4: Completed conveyance — should be excluded from active
  ms('msC4M1','Instructions Received','Completed','2026-01-10','2026-01-09','recC4',null,''),
];

function build() {
  const raw = {
    conveyances: { records: conveyances },
    milestones:  { records: milestones },
  };
  const ctx = { today: TODAY, tomorrow: TOMORROW, tz: TZ, K };
  return V.shape(raw, ctx);
}

test('shape surfaces only active conveyances', () => {
  const s = build();
  assert.equal(s.active.length, 3, '3 active conveyances (Completed excluded)');
  assert.ok(!s.active.some(c => c.conv.cellValuesByFieldId[C.name] === 'Kilimani — Plot 88'), 'Completed excluded');
});

test('shape detects overdue milestones (target < today, status not Completed/Skipped)', () => {
  const s = build();
  // msC1M4 target 2026-05-20 Pending = overdue
  assert.ok(s.overdueMilestones.length >= 1, 'at least one overdue milestone');
  const names = s.overdueMilestones.map(m => m.ms.cellValuesByFieldId[M.type]);
  assert.ok(names.includes('Consent to Transfer'), 'Consent to Transfer overdue on recC1');
});

test('shape detects official-search expiry within 10 days', () => {
  const s = build();
  // msC2M3 searchExpiry 2026-06-08 = 5 days from TODAY (2026-06-03)
  assert.ok(s.searchExpiring.length >= 1, 'at least one official search expiring');
  const expiries = s.searchExpiring.map(e => e.expiryDate);
  assert.ok(expiries.includes('2026-06-08'), 'expiry date 2026-06-08 surfaced');
});

test('shape computes daysUntilExpiry correctly for the expiring search', () => {
  const s = build();
  const item = s.searchExpiring.find(e => e.expiryDate === '2026-06-08');
  assert.ok(item, 'found the expiring item');
  assert.equal(item.daysUntilExpiry, 5, '5 days until expiry');
});

test('shape populates current milestone index per active conveyance', () => {
  const s = build();
  // recC1: M1-M3 done, M4 is current (index 3)
  const c1 = s.active.find(c => c.conv.id === 'recC1');
  assert.ok(c1, 'recC1 found');
  assert.equal(c1.curIdx, 3, 'current milestone index is 3 (M4, 0-based)');
  assert.equal(c1.msList[c1.curIdx].cellValuesByFieldId[M.type], 'Consent to Transfer', 'current milestone name correct');
});

test('shape computes progress percentage correctly', () => {
  const s = build();
  // recC1: 3 done out of 9 = 33%
  const c1 = s.active.find(c => c.conv.id === 'recC1');
  assert.equal(c1.pct, 33, '33% progress on recC1');
  // recC2: 4 done out of 9 = 44%
  const c2 = s.active.find(c => c.conv.id === 'recC2');
  assert.equal(c2.pct, 44, '44% progress on recC2');
});

test('shape surfaces due-this-week milestones (7-day window)', () => {
  const s = build();
  // msC2M5 target 2026-06-10 = 7 days from 2026-06-03 -> within window
  // msC1M5 target 2026-06-15 = 12 days -> outside
  const targets = s.dueThisWeek.map(d => d.ms.cellValuesByFieldId[M.targetDate]);
  assert.ok(targets.includes('2026-06-10'), 'msC2M5 (2026-06-10) is due this week');
  assert.ok(!targets.includes('2026-06-15'), 'msC1M5 (2026-06-15) is outside 7-day window');
});

test('shape hasAirtable is true when conveyances parsed', () => {
  const s = build();
  assert.equal(s.hasAirtable, true);
});

test('shape normalizes the fee-earner assignee (single-select object or plain string)', () => {
  const raw = {
    conveyances: { records: [
      cvy('recA', 'Tsavo Skywalk — Apt 1', 'Active', '2026-09-01', { [C.assignee]: { name: 'Ken Ashimosi' } }),
      cvy('recB', 'Royal Suburb 2 — Apt 2', 'Active', '2026-09-01', { [C.assignee]: 'Ann Wayodi' }),
      cvy('recC', 'Tsavo Rising — Apt 3', 'Active', '2026-09-01'),
    ] },
    milestones: { records: [] },
  };
  const s = V.shape(raw, { today: TODAY, tomorrow: TOMORROW, tz: TZ, K });
  const a = s.active.find(c => c.conv.id === 'recA');
  const b = s.active.find(c => c.conv.id === 'recB');
  const c = s.active.find(c => c.conv.id === 'recC');
  assert.equal(a.assignee, 'Ken Ashimosi', 'single-select assignee read via .name');
  assert.equal(b.assignee, 'Ann Wayodi', 'plain-string assignee passes through');
  assert.equal(c.assignee, '', 'missing assignee normalizes to empty string');
});

test('shape hasAirtable is false when raw is missing', () => {
  const raw = { conveyances: null, milestones: null };
  const ctx = { today: TODAY, tomorrow: TOMORROW, tz: TZ, K };
  const s = V.shape(raw, ctx);
  assert.equal(s.hasAirtable, false);
});

// Security regression guard: the milestone tooltip must never round-trip
// Airtable text through dataset -> innerHTML (double-decode XSS). It must
// build the tooltip with textContent / DOM nodes instead.
test('XSS guard: tooltip uses textContent, never innerHTML', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'view.js'), 'utf8');
  assert.ok(!src.includes('tip.innerHTML'), 'tooltip must not assign tip.innerHTML');
  assert.ok(src.includes('_n.textContent = ms.dataset.tipNotes'), 'tooltip notes set via textContent');
});
