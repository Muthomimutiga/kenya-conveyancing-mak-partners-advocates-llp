// MAK & Partners Advocates LLP: the firm's letter of engagement, a firm extension.
//
// The shared generator calls this for doc_type "engagement_letter" in place of its neutral default
// (see the template README, "Firm extensions"). The letterhead, margins and clause numbering are the
// template's; the wording is MAK's own, clause for clause from the firm's Letter of Engagement
// template of 11 Sep 2026, ported unchanged from mak-letter.js in the live MAK plugin (1.6.0).
'use strict';

const DEFAULT_ASSUMPTIONS = [
  'our scope of work is limited to the matters set out in Clause 4 above and any work undertaken by us outside the agreed scope will be charged at our hourly rates or we will agree to a fixed fee with you beforehand;',
  'the documents and information required to enable us to fulfil the scope of work will be provided in a timely manner and we will not be required to confirm their accuracy;',
  'we will receive diligent and timely co-operation from the Client;',
  'in our review of the documents, we will not be required to advise on any laws other than the laws of the Republic of Kenya;',
  'third parties will behave in a reasonable manner and will revert within a reasonable timeline. While this is our expectation and assumption, we cannot guarantee timelines and outcomes while dealing with Government Ministries, officials and authorities;',
  'there will be no protracted negotiations or unforeseen timing or other developments that require us to undertake work beyond what is presently envisaged.',
];

module.exports = function makEngagementLetter(gctx) {
  const { d, letter } = gctx;
  // Standing engagement (live 1.6.0 rule): MAK acts for the developer under a standing engagement
  // for every unit in a registered project, so a fresh engagement letter on a developer-project
  // matter would contradict the engagement in force. Nothing is written; this is the expected
  // outcome, not an error. Individual (non-developer) matters are unaffected.
  const fs = require('fs'), path = require('path');
  const registryPath = path.join(gctx.extensionsDir, 'developer-projects.json');
  const registry = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, 'utf8')) : {};
  const project = d.project_slug && (registry.projects || {})[d.project_slug];
  if (project) {
    const label = project.display_name || d.project_slug;
    console.log(`Engagement letter skipped: this matter falls under the standing engagement for ${label}. No document was written. Individual (non-developer) matters still get an engagement letter.`);
    process.exit(0);
  }
  const { Paragraph, AlignmentType, UnderlineType } = gctx.docx;
  const { firstPageSpacer, refLine, signOff, tw, P, gap, NUM } = letter;
  const ctx = { assistedBy: gctx.assistedBy };
  const size = ctx.size || 22; // 11pt, as the template
  const items = [firstPageSpacer()];
  const clause = (title) => new Paragraph({ children: [tw(title, size, { bold: true })], numbering: { reference: NUM.clauses, level: 0 }, spacing: { before: 200, after: 120 } });
  const body = (runs, opts = {}) => P(letter.asRuns(runs, size), { indent: { left: 360 }, spacing: { before: 0, after: 160 }, ...opts });
  let letterInstance = 0, romanInstance = 0;
  const letterList = (arr) => { letterInstance++; return arr.map((t) => new Paragraph({ children: [tw(t, size)], numbering: { reference: NUM.letters, level: 0, instance: letterInstance }, alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 100 } })); };
  const romanList = (arr) => { romanInstance++; return arr.map((t) => new Paragraph({ children: [tw(t, size)], numbering: { reference: NUM.roman, level: 0, instance: romanInstance }, alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 100 } })); };
  const pron = d.client_pronoun || 'their';
  const client = d.client_name || '';

  items.push(refLine(d.ref, d.your_ref, d.date, size));
  items.push(P([tw(client, size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
  (d.client_address_lines || []).forEach((line) => items.push(P([tw(line, size, { bold: true, underline: /^[A-Z .]+$/.test(line) ? { type: UnderlineType.SINGLE } : undefined })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } })));
  if (d.client_email) items.push(P([tw('Email: ' + d.client_email, size, { bold: true })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 } }));
  items.push(gap(200));
  items.push(P([tw(d.salutation || 'Dear Madam/Sir,', size, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 200 } }));
  items.push(P([tw('RE: LETTER OF ENGAGEMENT – ' + String(d.re_line || '').toUpperCase(), size, { bold: true })], { spacing: { before: 0, after: 200 } }));
  items.push(P([tw('The above matter refers. Please read through this letter carefully and then sign and return the enclosed copy of this letter to us.', size)]));
  items.push(P([tw('The terms of this engagement shall be as provided below:', size)]));

  items.push(clause('Terms of Engagement'));
  items.push(body([tw(client, size, { bold: true }), tw(' (', size, { bold: true }), tw('“the Client”', size, { bold: true }), tw(') hereby appoints ', size, { bold: true }), tw('MAK & Partners Advocates LLP', size, { bold: true }), tw(' (', size, { bold: true }), tw('“the Law Firm”', size, { bold: true }), tw(`) to act on ${pron} behalf in matters relating to the Scope of Work provided below and other related matters.`, size, { bold: true })]));

  items.push(clause('Commencement'));
  items.push(body('This Engagement Letter shall commence upon execution by the Client as provided under clause 11 below and shall terminate upon full payment of fees as agreed under Clause 5 below or terminate earlier in accordance with the terms of clause 7 below.'));
  items.push(body('Either party may terminate the Engagement Letter through issuance of a seven (7) day written notice to the other party to that effect. Terminations shall not affect completion of any outstanding assignment or payment of accrued fees including the minimum stipulated in Clause 5.'));

  items.push(clause('Background'));
  (d.background || []).forEach((t) => items.push(body(t)));

  items.push(clause('Scope of Work'));
  items.push(body('Based on the above background, we understand that our Scope of Work will be as follows:', { indent: { left: 0 } }));
  items.push(...letterList(d.scope || []));

  items.push(clause('Professional Fees and Disbursements'));
  items.push(body([tw(`Our professional fee for the above scope of work, shall be ${d.fee_text || 'Kshs. ____'} (exclusive of VAT and disbursements).` + ((d.fee_covers || []).length ? ' This fee will cover the following:' : ''), size, { bold: true })]));
  if ((d.fee_covers || []).length) items.push(...romanList(d.fee_covers));
  items.push(body('Where the Law Firm anticipates additional expenditure beyond the Scope of Work, the Law Firm undertakes to seek prior authorization to incur such additional costs from the Client, justifying the reasons thereof, and if approved, execute an addendum to this Letter of Engagement containing the particulars of the agreed expenditure. Any work undertaken outside the agreed Scope of Work shall be chargeable based on our hourly rates.'));
  items.push(body('The Law Firm shall issue the Client with such Fee Notes periodically, providing the breakdown of legal fees and disbursements accrued during the relevant period.'));
  items.push(body([tw(`It is the Law Firm's policy to request payment on account of fees and disbursements expected to be incurred when acting for clients. Upon acceptance of instructions, we may request payments on account of fees and/or disbursements to be incurred as the matter progresses.` + (d.deposit_text ? ` To this end, we shall request a deposit of ${d.deposit_text} to allow us to commence the above Scope of Work.` : ''), size, { bold: true })]));

  items.push(clause('Assumptions'));
  items.push(body('The fee set out above is subject to the following assumptions:', { indent: { left: 0 } }));
  items.push(...letterList((d.assumptions && d.assumptions.length) ? d.assumptions : DEFAULT_ASSUMPTIONS));

  items.push(clause('Termination'));
  items.push(body('Either party may terminate this Engagement by issuing seven (7) days written notice to the other party to that effect. Termination shall not affect the completion of any outstanding assignment or payment of any accrued fees. The Client shall remain liable for all charges incurred up to the date of termination.'));

  items.push(clause('Confidentiality'));
  items.push(body('The Law Firm and its personnel shall not at any time during or after the termination of this agreement or engagement use or disclose to any third parties any confidential information or information concerning the Client which the Law Firm or its staff may acquire in the course of this engagement or otherwise except with the Client’s written consent, and only to the persons who are authorized by the Client to receive such information.'));

  items.push(clause('Communication'));
  items.push(body('There shall be free flow of communication between the parties, and the Law Firm shall keep the Client informed of all pertinent developments in relation this matter.'));
  const rn = d.responsible_name || 'Ken Ashimosi', rt = d.responsible_title || 'Managing Partner', re = d.responsible_email || 'ken@makadvocates.com';
  const assisted = d.assisted_by || ctx.assistedBy;
  items.push(body(`For this engagement, ${rn}, ${rt} (${re}) will be responsible for the day-to-day conduct of the matter. ${rn.split(' ')[0]} will be assisted by ${assisted ? assisted + ' and ' : ''}other lawyers within the Law Firm.`));

  items.push(clause('Governing Law and Dispute Resolution'));
  items.push(body([tw('This letter of Engagement shall be governed by the Kenyan Law.', size, { bold: true })]));
  items.push(body('Any disputes shall be resolved through good faith negotiations. If the parties fail to reach an amicable settlement within fifteen (15) days of the dispute arising, the dispute shall be referred to arbitration under the Arbitration Act, 1995. The tribunal shall consist of a single arbitrator appointed by the Chairman for the time being of the Chartered Institute of Arbitrators, Kenya branch.'));

  items.push(clause('Acceptance of Terms'));
  items.push(body('Kindly confirm your acceptance of this letter of Engagement by signing duplicate copies of this letter and returning one counterpart to us as soon as is possible to enable us to proceed with the engagement.'));
  items.push(gap(240));
  items.push(...signOff({ signatoryName: (d.signatory_name || 'KEN ASHIMOSI').toUpperCase(), signatoryRole: d.signatory_title || 'Managing Partner' }, size).slice(2)); // no "Yours faithfully" on the template: starts at "For and on behalf of"
  items.push(gap(360));
  items.push(P([tw('ACCEPTANCE', size, { bold: true, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.LEFT, spacing: { before: 0, after: 200 } }));
  items.push(body(`I ${client.toUpperCase()} of Id No…………………. confirm I have read and understood the contents of the letter of engagement and accept the said terms`));
  items.push(body([tw('………………………………', size, { bold: true })]));
  items.push(body('Signature'));
  return items;
};
