# /new-conveyance

**Purpose:** Open a new conveyance matter. Creates the full 9-milestone schedule, calendar reminders (via the connected calendar connector), and drafts the Sale Agreement.

---

## Step 1 — Intake

**How to ask (applies to this whole command).** When a step needs more than three answers, collect them with the **AskUserQuestion tool**, never as a wall of separate text prompts. A new matter has many fields and asking them one at a time is overwhelming. Group related fields into popups (the tool takes up to four questions per popup) and pull option choices from the Airtable schema wherever a field is a select. For a free-text field (a name, an ID, a price, a date), put it in the popup and let the user type the answer. Names on LRA instruments must match the title register exactly: a mismatch is grounds for rejection at the Land Registry after stamp duty is paid. Never skip a field and never proceed with a blank field.

Collect the intake as four grouped AskUserQuestion popups:

**Popup 1 — the buyer (purchaser)**
- Buyer type. Options: Individual; Company / Developer. (Drives the execution block.)
- Buyer full name(s), exactly as they will appear on the Transfer. (Typed.)
- Buyer National ID / Passport number and KRA PIN. (Typed.)

**Popup 2 — the seller (vendor) and the property**
- Seller type. Options: Individual or company sale; Developer selling off-plan. (Sets whether Step 1b runs.)
- Seller full name(s), exactly as on the current title. (Typed. For a developer this is the project company, set from the registry in Step 1b.)
- Property LR No. / Title No. / Plot No. (Typed.)
- Physical location: estate, road, town. (Typed.)

**Popup 3 — tenure and money**
- Tenure. Options: Freehold; Leasehold. (If Leasehold, a short follow-up popup asks the lease years remaining.)
- If the answer is Freehold, also ask: "Is the land agricultural (outside a municipality / town)?" Options: No, urban / within a town; Yes, agricultural. Set `is_agricultural`. This decides whether Land Control Board consent (Milestone 3) is required; skipping it on agricultural land voids the sale, so never assume.
- Purchase price (Kshs.). (Typed.)
- Deposit already paid. Options: None yet; Enter amount. (Type the figure.)
- Target completion date. (Typed. For a developer matter this is recomputed from the project profile in Step 2, so a rough date is fine here.)

**Popup 4 — representation and ownership**
- Fee earner handling this matter. Options: the firm's existing Fee Earner choices read from Airtable, plus type a new name to add. (Required: the Matter Allocation view reads this.)
- Buyer's advocate. Options: Unknown; Enter firm and email.
- Seller's advocate. Options: Unknown; Enter firm and email.

**Step 1b — developer project (only if the seller is a developer selling off-plan)**

Identify the project with AskUserQuestion, not a typed number. Read `scripts/developer-projects.json`. If four or fewer projects exist, present each `display_name` as an option in one popup. If more than four, first ask the development family (for example Royal Suburb, Tsavo) as options, then the specific project in a follow-up popup, so no popup exceeds four options.

Map the chosen project to its JSON KEY (the slug, for example `royal_suburb_1`, `tsavo_skywalk`), not the display name. Store it as `project_slug` and use it in Step 2, Step 3, and Step 5a.

Then capture the completion anchor with one AskUserQuestion popup. Read the project's `completion` block (`anchor` and `lag_business_days`). The anchor type is fixed by the project, so ask only for the date:

| `completion.anchor` | Popup question | Options |
|---|---|---|
| `agreement_signing_date` | Sale agreement signing date? | Today; Enter date |
| `practical_completion_date` | Practical completion date (building certified complete)? | Enter date |
| `anticipated_practical_completion_date` | Current anticipated practical completion date (APCD) for this unit? (require a typed date) | Enter the current APCD. Do NOT offer "use the stored value": the registry value is often empty or stale, and a null/stale APCD silently poisons the back-cluster schedule. Always capture the live date. |

Store the answer as `anchor_date` and `lag_business_days` as `lag_bd` for Step 2. Never assume a flat 90 days for a developer matter; read the profile.

If the seller is an individual, set `project_slug = null`, `anchor_date = null`, `lag_bd = null`, and skip Step 1b. The Target completion date from Popup 3 is the Completion Date.

Use all answers in every subsequent step.

---

## Step 2 — Logic

Once intake is received:

### 2a — Tenure-based skip conditions

- If Freehold: Milestone 5 (Rent Clearance) = SKIPPED
- If Freehold and the land is **agricultural** (outside a municipality / town, `is_agricultural = true` from intake): Milestone 3 = **Land Control Board consent REQUIRED**. Apply within SIX MONTHS of the Agreement (s.8(1) Land Control Act); a controlled transaction without LCB consent is **void for all purposes**. Never skip Milestone 3 for agricultural freehold.
- If Freehold and NON-agricultural (`is_agricultural = false`): Milestone 3 (Consent) = SKIPPED.
- If Leasehold: Milestone 3 = NLC / lessor consent (not LCB); Milestone 5 = Required

### 2b — Resolve the Completion Date

The completion date is **not** a flat 90 days. How it is computed depends on the matter type.

**Developer / off-plan matter** (`project_slug` set): you captured `anchor_date` and `lag_bd` in Step 1.

> **Completion Date = `anchor_date` + `lag_bd` business days.**

Count business days as Monday–Friday only; skip Saturdays and Sundays. (Public holidays are not adjusted for — treat the result as a working target.)

**Individual / standard sale** (`project_slug = null`): Completion Date = the Target completion date the user gave in Step 1.

If the Completion Date lands in the past, or earlier than the Instructions Date, stop and ask the user to re-confirm the anchor date / APCD before continuing.

### 2c — Calculate milestone target dates (two clusters)

Conveyancing milestones run on two clocks. Compute each cluster from its own anchor — never count all nine forward from Day 0.

**Front cluster — anchored to the Instructions Date (Day 0).** These confirm title and start clearances early, and run the same way no matter how far off completion is:

| Milestone | Target |
|---|---|
| 1 — Instructions + Sale Agreement | Instructions Date |
| 2 — Official Search | Instructions Date + 5 business days |
| 3 — LCB / NLC Consent | Instructions Date + 10 business days |
| 4 — Rates Clearance | Instructions Date + 10 business days |
| 5 — Rent Clearance (leasehold) | Instructions Date + 10 business days |

**Back cluster — anchored to the Completion Date.** Stamp duty, transfer, and registration cannot happen until the unit is ready and paid for, so they hang off completion, not instructions:

| Milestone | Target |
|---|---|
| 6 — Stamp Duty | Completion Date − 30 business days |
| 7 — Transfer Documents | Completion Date − 20 business days |
| 8 — Registration | Completion Date − 12 business days |
| 9 — Completion | Completion Date |

**Why two clusters:** for a ready-built unit (e.g. Tsavo Skywalk, signing + 90 BD) the clusters sit close together and this collapses to the classic ~90-day cycle. For an off-plan unit (e.g. Tsavo Rising, APCD + 180 BD) the front cluster runs now while the back cluster sits months out near practical completion — the gap between them is the construction wait. If you ever schedule stamp duty 45 days after instructions on an off-plan matter, you have made the mistake this logic exists to prevent.

**Ordering guard:** if a computed back-cluster date falls on or before Milestone 5's date (a very short cycle), clamp it to Milestone 5 + 1 business day so milestones stay in sequence.

**Official Search Expiry** = Milestone 2 date + 30 calendar days. For off-plan matters the early search will lapse long before completion; note in the Milestone 2 record that a fresh official search is needed close to completion.

**Target Completion** on the Conveyance record = the Completion Date from 2b (= Milestone 9).

### 2d — Determine sale agreement type
- If seller is a company or developer (off-plan project): `doc_type = "developer_sale_agreement"` AND `project_slug` is the slug captured in Step 1's sub-step (e.g. `royal_suburb_1`, `tsavo_skywalk`). The project_slug MUST be set for any developer matter; if missing, return to Step 1 and capture it.
- If seller is an individual: `doc_type = "sale_agreement"` AND `project_slug = null`.
- If the answer from intake is ambiguous or unclear: ask before proceeding — "Is this a standard individual-to-individual sale, or is the seller a developer/company selling off-plan?"

---

## Step 3 — Airtable

Use the `airtable-conveyances` skill.

1. Create 1 record in **Conveyances** table with all party + property details. Set:
   - **Fee Earner** = the advocate captured in Step 1. The Conveyances table has a "Fee Earner" single-select field. If the chosen advocate is not yet one of its options, add them as a new choice before writing (so the record saves and the Matter Allocation view stays clean — never write a fee earner that is not an option). If the field is somehow absent, create it (single select) first. This is what the tracker's Matter Allocation view reads to show who is working on what.
   - **Target Completion** = the Completion Date computed in Step 2b.
   - **Notes** = the completion basis, so the team can see how the date was derived. Developer matter: "Completion basis: [anchor type] [anchor_date] + [lag_bd] business days ([project display name])." Individual sale: "Completion basis: target completion date set by advocate."
   - For developer matters, also set the **Project** field on the Conveyance to the slug value (e.g. `royal_suburb_1`, `tsavo_skywalk`) so subsequent runs of `/draft-conveyance-doc` can read it without re-prompting. If the Conveyances table has no **Project** field, add one (single line text) before creating the record. (The /tmp data JSON keeps the key `project_slug`; the Airtable column is named `Project`.)
2. Create 9 records in **Milestones** table linked to the Conveyance (one per milestone). Set each **Target Date** from Step 2c. Set Status = "Pending" for active milestones and "Skipped" for any skipped milestones. Set Official Search Expiry on Milestone 2.

---

## Step 4 — Calendar reminders

These are statutory deadlines that carry negligence exposure if missed, so diary every active milestone.

**Pre-flight:** confirm a calendar connector is connected in CoWork (it exposes a create-event tool such as `create_event`). If none is connected, do NOT silently skip and do NOT claim reminders were created: tell the user "No calendar is connected, so here are the nine deadline dates to add to your diary," output the dated list, and continue.

**Only create events for milestones that are NOT skipped.** Do not create an event for any milestone whose Status was set to "Skipped" in Step 3.

For each active (non-skipped) milestone, create a calendar event via the connected calendar connector's create-event tool:
- Title (summary): `[Matter Name] — Milestone [#]: [Milestone Type]`
- Start: the target date from Step 2 at 07:00, timezone Africa/Nairobi
- Reminders: a popup 7 days before and 1 day before (e.g. `overrideReminders: [{method:'popup', minutes:10080}, {method:'popup', minutes:1440}]`)
- Save the returned event ID back to the Milestone record (Calendar Event ID).

Create 1 additional reminder:
- Title: `[Matter Name] — OFFICIAL SEARCH EXPIRES`
- Start: the Official Search Expiry date at 07:00
- Reminders: popups 7 days, 3 days, and 1 day before.

**Which calendar:** the command uses whichever calendar connector the firm connects in CoWork. If MAK runs on Microsoft 365, connect a Microsoft/Outlook calendar connector; on Google Workspace the Google Calendar connector is used. There is no plugin-bundled calendar server, so it never silently writes to a dead endpoint.

---

## Step 5 — Draft Opening Documents

Generate three documents for this matter: Sale Agreement (or Developer Sale Agreement), Engagement Letter, and Fee Note.

**5a — Sale Agreement**

Based on the determination from Step 2, use either `doc_type: "sale_agreement"` (individual vendor) or `doc_type: "developer_sale_agreement"` (company/developer vendor).

Convert all amounts to both figures and words. The balance = purchase price minus deposit.

**Standard sale agreement (individual vendor):**

Write to `/tmp/conveyancing-doc-data.json`:
```json
{
  "doc_type": "sale_agreement",
  "date": "[today in format: 22nd March 2026]",
  "vendor_name": "[SELLER FULL NAME IN CAPS]",
  "vendor_po_box": "[derive from advocate address or leave blank]",
  "vendor_town": "[derive or leave blank]",
  "vendor_id": "[Seller ID number]",
  "vendor_capacity": null,
  "purchaser_name": "[BUYER FULL NAME IN CAPS]",
  "purchaser_po_box": "[derive or leave blank]",
  "purchaser_town": "[derive or leave blank]",
  "purchaser_id": "[Buyer ID number]",
  "property_lr_no": "[LR No. / Title No. exactly as stated]",
  "property_location": "[Physical location from intake]",
  "property_area_figures": null,
  "property_area_words": null,
  "tenure": "[freehold or leasehold]",
  "lease_term_years": "[years remaining — null if freehold]",
  "lease_start_date": null,
  "purchase_price_words": "[amount in words]",
  "purchase_price_figures": "[amount in figures with commas]",
  "deposit_words": "[deposit in words — or null if 0]",
  "deposit_figures": "[deposit in figures — or null if 0]",
  "balance_words": "[balance in words]",
  "balance_figures": "[balance in figures]",
  "completion_date": "[target completion date in format: 20th June 2026]",
  "vendor_advocate_firm": "[Seller advocate firm or 'MAK Partners and Advocates LLP']",
  "vendor_advocate_address": "[Seller advocate address or firm address]",
  "purchaser_advocate_firm": "[Buyer advocate firm or 'Unknown']",
  "purchaser_advocate_address": "[Buyer advocate address or '']",
  "is_leasehold": false,
  "is_agricultural": [true / false — from the Step 1 agricultural question; never hardcode],
  "is_charged": false,
  "vendor_is_company": false,
  "purchaser_is_company": false,
  "include_spousal_consent": true
}
```

**Developer sale agreement (company/developer vendor):**

The project-aware builder reads vendor company, title number, banks, stage costs, completion lag, dispute resolution variant and execution mode from `scripts/developer-projects.json` (keyed by `project_slug`). You only supply the matter-specific fields below — never the project-specific facts.

Write to `/tmp/conveyancing-doc-data.json`:
```json
{
  "doc_type": "developer_sale_agreement",
  "project_slug": "[slug captured in Step 1 — e.g. royal_suburb_1, royal_suburb_2, royal_suburb_3, tsavo_divine, tsavo_rising, tsavo_skywalk]",
  "apcd_override": "[for an APCD-anchored project, the anchor_date / APCD confirmed in Step 1b — pass it so the Agreement body AND the milestone schedule state the SAME completion date; omit for signing-anchored projects like Tsavo Skywalk]",
  "date": "[today in format: 22nd March 2026]",
  "purchaser_name": "[BUYER FULL NAME IN CAPS]",
  "purchaser_id": "[Buyer ID number]",
  "purchaser_email": "[Buyer email]",
  "purchaser_phone": "[Buyer phone]",
  "apartment_number": "[e.g. 3A]",
  "apartment_floor": "[e.g. 3rd]",
  "purchase_price_words": "[amount in words]",
  "purchase_price_figures": "[amount in figures with commas]",
  "deposit_words": "[deposit in words — or null if 0]",
  "deposit_figures": "[deposit in figures — or null if 0]",
  "balance_words": "[balance in words]",
  "balance_figures": "[balance in figures]",
  "balance_installments_count": "[number of monthly instalments, e.g. 12]",
  "balance_monthly_amount": "[monthly amount in figures]",
  "balance_start_month": "[first month of instalments, e.g. June 2026]",
  "alt_contact_name": "[Buyer alternative contact, or empty]",
  "alt_contact_email": "[Buyer alternative contact email, or empty]",
  "alt_contact_phone": "[Buyer alternative contact phone, or empty]"
}
```

DO NOT supply `developer_name`, `vendor_reg_no`, `apartment_description`, `development_description`, `property_lr_no`, `payment_plan`, `vendor_advocate_*` for developer matters — these come from the registry and overriding them would create inconsistency with the official MAK template for that project.

If the seller is a developer but `project_slug` is missing, abort and return to Step 1. If you encounter `Error: Unknown developer project slug:` from the generator, verify `project_slug` matches a key in `scripts/developer-projects.json`.

Filename: `[seller-slug]-[buyer-slug]-sale-agreement-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && ([ -d node_modules ] || npm install) && node generate-conveyancing-document.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[sale-agreement-filename].docx
```

**5b — Engagement Letter**

**Ask the fee earner for the legal fee for this matter.** The firm sets its own fee (its charging method / the Advocates' Remuneration Order as the firm applies it). Do NOT invent or compute a fee from a scale the plugin does not hold; the plugin has no ARO scale embedded. Once the fee earner gives the figure, compute VAT at 16% of it and add the firm's disbursements (the generator hard-fails if VAT is not 16% of the fee). Write to `/tmp/conveyancing-doc-data.json`:

```json
{
  "doc_type": "engagement_letter",
  "date": "[today in format: 22nd March 2026]",
  "ref": "MAK/CONV/2026/001",
  "salutation": "Dear Sir/Madam,",
  "purchaser_name": "[BUYER FULL NAME IN CAPS]",
  "vendor_name": "[SELLER FULL NAME IN CAPS]",
  "property_lr_no": "[LR No.]",
  "property_location": "[Physical location]",
  "purchase_price_words": "[amount in words]",
  "purchase_price_figures": "[amount in figures]",
  "legal_fees": [calculated numeric amount],
  "legal_fees_vat": [16% of legal_fees],
  "disbursements": [estimated disbursements],
  "engagement_total": [sum of all three]
}
```

Filename: `[seller-slug]-[buyer-slug]-engagement-letter-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && ([ -d node_modules ] || npm install) && node generate-conveyancing-document.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[engagement-letter-filename].docx
```

**5c — Fee Note**

Use the same fee amounts as the Engagement Letter. Write to `/tmp/conveyancing-doc-data.json`:

```json
{
  "doc_type": "fee_note",
  "date": "[today in format: 22nd March 2026]",
  "ref": "MAK/CONV/2026/001",
  "property_lr_no": "[LR No.]",
  "legal_fees": [same as engagement letter],
  "legal_fees_vat": [same as engagement letter],
  "disbursements_office": [office expenses portion],
  "disbursements_statutory": [statutory fees portion],
  "fee_note_total": [sum of all four]
}
```

Filename: `[seller-slug]-[buyer-slug]-fee-note-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && ([ -d node_modules ] || npm install) && node generate-conveyancing-document.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[fee-note-filename].docx
```

If any script fails, read the error and fix the JSON, then retry.

Run the **Format Verification** check from the `conveyance-document-drafter` skill on all three documents before closing this step.

**5d — Record the documents in Airtable**

Using the `airtable-conveyances` skill, create one record in the **Documents** table for each of the three documents just generated, so every document the system produces has a row from day one (the same step `/draft-conveyance-doc` performs at its Step 4):

| Document | Document Type | Linked to | Status |
|---|---|---|---|
| Sale Agreement / Developer Sale Agreement | Sale Agreement | this Conveyance + Milestone 1 (Instructions + Sale Agreement) | Drafting |
| Engagement Letter | Engagement Letter | this Conveyance | Drafting |
| Fee Note | Fee Note | this Conveyance | Drafting |

For each record: set **Document Name** = `[Document Type] — [Matter Name]`, link the **Conveyance** (and the **Milestone** where shown), and **Status** = "Drafting". Write with **typecast enabled** so that "Engagement Letter" and "Fee Note" are created as Document Type options automatically if they do not exist yet (never let a write fail on a missing select option). When the firm later uploads a signed copy to OneDrive/Drive, paste its URL into the document's **Document Link** field; the `.docx` itself stays a CoWork download, Airtable holds the record and the link.

Present all three download links.

---

## Step 6 — Output Summary

```
NEW CONVEYANCE OPENED

Matter: [Seller name] / [Buyer name] — [LR No.]
Purchase Price: Kshs. [AMOUNT]
Deposit Paid: Kshs. [AMOUNT]
Balance Due: Kshs. [AMOUNT]
Target Completion: [DATE]
Completion Basis: [e.g. APCD 30 Sep 2026 + 90 business days (Tsavo Divine) — or "individual sale, target set by advocate"]
Tenure: [Freehold / Leasehold]
Fee Earner: [advocate handling the matter]

MILESTONE SCHEDULE
1. Instructions + Sale Agreement     [DATE] (today)
2. Official Search                   [DATE] (expires [EXPIRY DATE])
3. [LCB Consent / NLC Consent / SKIPPED]  [DATE]
4. Rates Clearance                   [DATE]
5. [Rent Clearance / SKIPPED — freehold]  [DATE]
6. Stamp Duty                        [DATE]
7. Transfer Documents                [DATE]
8. Registration                      [DATE]
9. Completion                        [DATE]

Calendar: [X active milestone events — exclude skipped] + 1 search expiry alert created (or listed for manual entry if no calendar is connected)
Airtable: Conveyance record + 9 Milestone records + 3 Document records created
Sale Agreement: [filename].docx
Engagement Letter: [filename].docx
Fee Note: [filename].docx
```

Present all three download links.

With the AskUserQuestion tool, ask: "Any changes to the three documents?" Options: All good, proceed; Yes, I will specify. If they choose to specify, ask what to update and regenerate.
