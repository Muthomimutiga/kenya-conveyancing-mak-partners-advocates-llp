---
name: developer-sale-agreement
description: >
  MAK & Partners' developer (off-plan) conveyancing: intake, completion clock and the
  Agreement for Sale drawn from the firm's own project precedents (Royal Suburb 1, 2 and 3,
  Tsavo Divine, Tsavo Rising, Tsavo Skywalk). Use whenever the seller is a developer selling
  an apartment off-plan or in one of those projects, when /new-conveyance is told the seller
  is a developer, when /draft-conveyance-doc is asked for a developer sale agreement, and on
  natural-language requests such as "draft the Tsavo Rising sale agreement", "sale agreement
  for apartment 3A at Royal Suburb", or "off-plan purchase for a buyer at Skywalk". Not for a
  sale by an individual or an ordinary company vendor: that is the standard sale_agreement.
version: 1.0.0
last_verified: 2026-10-09
freshness_window: 180d
freshness_category: firm-precedents
verified_against: "MAK sale agreement precedents supplied by Ann Wayodi on 13 May 2026, transcribed verbatim into scripts/firm-extensions/clause-bodies/ (source documents in the marketplace repository under _mak_source_templates/)"
---

# Developer sale agreement (MAK)

This skill belongs to MAK's own build. It adds one document type, `developer_sale_agreement`,
and the off-plan intake and completion logic that goes with it. Everything else in a
developer matter (searches, consents, the LRA forms, letters, the engagement letter, the fee
note) runs through the ordinary commands and the conveyance-document-drafter skill.

The project facts (vendor company and registration number, title number, development, bank
accounts, stage costs, completion lag, dispute-resolution variant, execution mode) live in
`${CLAUDE_PLUGIN_ROOT}/scripts/firm-extensions/developer-projects.json`, keyed by project
slug. The clause text of each project is MAK's precedent, verbatim, in
`scripts/firm-extensions/clause-bodies/<slug>.js`. The drafting rules for each project are in
`scripts/firm-extensions/drafting-rules/`. You supply only the matter's own facts.

| Slug | Project | Completion clock |
|---|---|---|
| `royal_suburb_1` | Royal Suburb (Phase 1) | anticipated practical completion date + 90 business days |
| `royal_suburb_2` | Royal Suburb Phase 2 | practical completion date + 60 business days |
| `royal_suburb_3` | Royal Suburb Phase Three | anticipated practical completion date + 90 business days |
| `tsavo_divine` | Tsavo Divine Executive Apartments | anticipated practical completion date + 90 business days |
| `tsavo_rising` | Tsavo Rising | anticipated practical completion date + 180 business days |
| `tsavo_skywalk` | Tsavo Skywalk Executive Apartments | agreement signing date + 90 business days |

Read the registry rather than this table when they differ: the registry is what the generator uses.

## 1. Intake (inside /new-conveyance)

When the seller is a developer selling off-plan:

1. **Identify the project** with AskUserQuestion, never a typed number. Read the registry. With
   four or fewer projects, offer each `display_name` in one popup; with more, ask the family
   first (Royal Suburb, Tsavo), then the project, so no popup has more than four options.
   Store the JSON key (for example `tsavo_rising`) as `project_slug`, not the display name.
2. **Capture the completion anchor** in one popup. The anchor type is fixed by the project's
   `completion.anchor`; ask only for the date:
   - `agreement_signing_date`: "Sale agreement signing date?" Options: Today; Enter date.
   - `practical_completion_date`: "Practical completion date (building certified complete)?"
   - `anticipated_practical_completion_date`: "Current anticipated practical completion date
     (APCD) for this unit?" Require a typed date. Do not offer the stored value: the registry
     value is often empty or stale, and a stale APCD silently moves every later milestone.
3. On the Conveyance, set the **Project** field to the slug. If the Conveyances table has no
   Project field, add one (single line text) before creating the record.

## 2. Completion date and milestones (replaces the Day 90 default)

**Completion Date = anchor date + the project's `lag_business_days`**, counting Monday to
Friday only (public holidays are not adjusted for; treat it as a working target). If it lands
in the past or before the instructions date, stop and re-confirm the anchor.

Milestones run on two clocks. Never count all nine forward from the instructions date.

| Milestone | Target |
|---|---|
| 1 Instructions and Sale Agreement | instructions date |
| 2 Official Search | instructions date + 5 business days |
| 3 LCB / NLC Consent | instructions date + 10 business days |
| 4 Rates Clearance | instructions date + 10 business days |
| 5 Rent Clearance (leasehold) | instructions date + 10 business days |
| 6 Stamp Duty | Completion Date - 30 business days |
| 7 Transfer Documents | Completion Date - 20 business days |
| 8 Registration | Completion Date - 12 business days |
| 9 Completion | Completion Date |

For a ready unit (Tsavo Skywalk) the two clusters sit together. For an off-plan unit (Tsavo
Rising) the back cluster sits months away, near practical completion: stamp duty scheduled 45
days after instructions on an off-plan matter is the mistake this prevents. On a short cycle,
keep the back cluster in order with minimum gaps rather than collapsing it: Stamp Duty (M6) at
least Milestone 5 + 1 business day; Transfer (M7) at least M6 + 5; Registration (M8) at least
M7 + 5; Completion (M9) at least M8 + 10. Where "Completion Date minus offset" would put two
milestones on the same day or out of order, these minimum gaps govern. The official
search taken at Milestone 2 will lapse long before completion on an off-plan matter: note on
the Milestone 2 record that a fresh search is needed close to completion. Record the basis in
the Conveyance's Notes: "Completion basis: [anchor type] [anchor date] + [lag] business days
([project display name])."

## 2b. No engagement letter on a developer-project matter

MAK already acts for the developer under a standing engagement covering every unit in a
registered project, so a new engagement letter on a developer-project matter would contradict
the engagement in force. In /new-conveyance, skip the engagement letter for such a matter: do
not ask for its figures, write no Documents row for it, and add to the Conveyance's Notes:
"Engagement letter not issued, matter falls under the standing engagement for [project display
name]." Say the same in the final summary. The matter gets the Developer Sale Agreement and the
Fee Note (the fee note bills this client for this unit and still runs). The generator enforces
the same rule: an engagement letter run with a registered `project_slug` writes no file and
prints "Engagement letter skipped: ...". That is the expected outcome, not an error.

## 3. Drafting the agreement

**Resolve from Airtable first.** Conveyance `Buyer` gives `purchaser_name`; `Purchase Price
(Kshs)` gives `purchase_price_figures`; `Deposit Paid (Kshs)` gives `deposit_figures`; balance
is price less deposit; `Project` gives `project_slug`; the linked Party with Role = Buyer gives
`purchaser_id`, `purchaser_email`, `purchaser_phone`. Compute the amounts in words.

**Collect the rest** with AskUserQuestion, at most four questions a popup, grouped Purchaser /
Apartment / Price / Plan: `apartment_number`, `apartment_floor`, `balance_installments_count`,
`balance_start_month`, and anything Airtable did not have. Compute `balance_monthly_amount` as
balance divided by instalments, rounded. Confirm deposit + balance equals the price, and
monthly amount times instalments is close to the balance, before generating.

Required, or the generator refuses and names what is missing: `project_slug`, `purchaser_name`,
`purchaser_id`, `purchaser_email`, `purchaser_phone`, `apartment_number`, `apartment_floor`,
`purchase_price_words`, `purchase_price_figures`, `deposit_words`, `deposit_figures`,
`balance_words`, `balance_figures`, `balance_installments_count`, `balance_monthly_amount`,
`balance_start_month`. Optional: `date`, `alt_contact_name`, `alt_contact_email`,
`alt_contact_phone`, and `apcd_override` (for an APCD-anchored project, the APCD confirmed at
intake, so the agreement and the milestone schedule state the same completion date).

Never supply `developer_name`, `vendor_reg_no`, `property_lr_no`, `payment_plan`,
`vendor_advocate_firm` or `vendor_advocate_address`: they come from the registry, and
overriding them would contradict MAK's precedent for that project.

Write `/tmp/conveyancing-doc-data.json`:

```json
{
  "doc_type": "developer_sale_agreement",
  "project_slug": "tsavo_rising",
  "date": "9th October 2026",
  "purchaser_name": "BUYER FULL NAME IN CAPS",
  "purchaser_id": "12345678",
  "purchaser_email": "buyer@example.com",
  "purchaser_phone": "+254 7XX XXX XXX",
  "apartment_number": "3A",
  "apartment_floor": "3rd",
  "purchase_price_words": "Nine Million Two Hundred Thousand",
  "purchase_price_figures": "9,200,000",
  "deposit_words": "Nine Hundred and Twenty Thousand",
  "deposit_figures": "920,000",
  "balance_words": "Eight Million Two Hundred and Eighty Thousand",
  "balance_figures": "8,280,000",
  "balance_installments_count": 12,
  "balance_monthly_amount": "690,000",
  "balance_start_month": "November 2026"
}
```

Then generate exactly as /draft-conveyance-doc does for every other document:

```
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[filename].docx
```

Render and read the document before presenting it. If the generator refuses, it says why:
an unknown or missing `project_slug` (check it against the registry keys exactly), or missing
Schedule of Particulars fields (collect them; never invent placeholder values).

## Boundaries

- The agreement is MAK's precedent for that project. Do not paraphrase, add or drop clauses
  in chat; a change to the precedent is a change to `clause-bodies/<slug>.js`, made from MAK's
  source document and recorded.
- A developer project MAK has not yet supplied a precedent for is refused, not improvised from
  another project. Ask the associate for MAK's precedent and escalate to Robin Advisory Group.
- The advocate who acts reviews the generated agreement before it leaves the firm. The
  generator checks completeness and arithmetic, not the commercial terms.
