# /draft-conveyance-doc

**Purpose:** Draft any conveyancing document for a specific matter, informed by the current milestone.

This workflow is also invoked by natural-language requests. If an associate
says “draft an LRA 63”, “draft a transfer”, “draft a letter of engagement”,
“draft a client update”, “draft an undertaking”, or “draft a conveyancing
letter”, route the request here even when `/draft-conveyance-doc` was not
typed. Identify the document type, then follow the same matter lookup,
required-field, generator, and render checks below.

---

## Step 1 — Identify Matter

Identify the matter by its number, not by listing every file (listing does not scale once the firm has volume, and it reads as clumsy).

Ask: "Which matter? Type its LR / Title number (for example Nairobi/Block 138/1333):"

Query Airtable for the Active Conveyance whose **Title Number** matches what was typed (match on the number, ignoring spacing and case). Confirm the matter name back before proceeding. If nothing matches, say so and ask again. If a few close matches come back, show only those few and let the user pick.

---

## Step 2 — Document Menu

Offer the documents with the **AskUserQuestion tool**, not a typed number. Present the documents available at the matter's current milestone (from the table below) as options. If there are more than four, put the milestone's own documents in the first popup plus an "Any-stage document" option that opens a second popup with the rest. Always leave a path to the any-stage documents (client update, chase notice).

Document options by milestone:
- Milestone 1 — Instructions: Sale Agreement (standard individual vendor); Developer Sale Agreement (off-plan / company vendor); Engagement Letter; Fee Note; Letter acknowledging instructions
- Milestone 2 — Official Search: Official Search application letter (with LRA 84 instruction note)
- Milestone 3 — Consent: LCB consent application letter (agricultural land); NLC/Commissioner of Lands consent application letter (leasehold)
- Milestone 4 — Rates Clearance: Rates clearance application letter (to County Government)
- Milestone 5 — Rent Clearance: Rent clearance application letter (to NLC)
- Milestone 6 — Stamp Duty: Stamp duty guidance note to client
- Milestone 7 — Transfer Documents: LRA 33 Transfer (freehold); LRA 63 Transfer of Lease (leasehold); Requisitions on Title; Reply to Requisitions on Title; LRA 58 Discharge of Charge (if property is charged)
- Milestone 8 — Registration: Registration covering letter
- Milestone 9 — Completion: Completion Notice; Undertaking Letter
- Any stage: Client update letter; Reminder / chase notice to counterpart advocates

---

## Step 3 — Draft

Pull all party and property details from Airtable for the matter.

### 3a — doc_type mapping

- Sale Agreement → `sale_agreement`
- Application letters (Official Search, Rates Clearance, Rent Clearance, LCB Consent, NLC Consent, Registration covering letter, Completion Notice, Requisitions on Title, Reply to Requisitions, client update, reminder/chase) → `conveyance_letter`
- Undertaking Letter → `undertaking_letter`
- LRA 33 Transfer (freehold) → `lra_33`
- LRA 63 Transfer of Lease (leasehold) → `lra_63`
- LRA 58 Discharge of Charge → `lra_58`
- LRA 84 Official Search Application (form) → `lra_84`
- LRA 9 General Application → Government form only — populate fields and present as text; print on official form
- Engagement Letter → `engagement_letter`
- Fee Note → `fee_note`
- Developer Sale Agreement (off-plan) → `developer_sale_agreement`

### 3b — Required fields checklist (confirm ALL before writing any JSON)

**sale_agreement — REQUIRED FIELDS**
- [ ] doc_type: "sale_agreement"
- [ ] date
- [ ] vendor_name, vendor_id
- [ ] purchaser_name, purchaser_id
- [ ] property_lr_no, property_location
- [ ] tenure ("freehold" or "leasehold")
- [ ] lease_term_years (null if freehold)
- [ ] purchase_price_words, purchase_price_figures
- [ ] deposit_words, deposit_figures (null if no deposit paid)
- [ ] balance_words, balance_figures
- [ ] completion_date
- [ ] vendor_advocate_firm, vendor_advocate_address
- [ ] purchaser_advocate_firm, purchaser_advocate_address
- [ ] is_leasehold (boolean)
- [ ] is_agricultural (boolean)
- [ ] is_charged (boolean)
- [ ] vendor_is_company, purchaser_is_company (boolean)
- [ ] include_spousal_consent (boolean)

**developer_sale_agreement — REQUIRED FIELDS**

The project-aware builder reads vendor company, title number, banks, stage costs, completion lag, dispute resolution variant and execution mode from `scripts/developer-projects.json` (keyed by `project_slug`). Only supply matter-specific fields.

The generator HARD-FAILS if any of the 15 Schedule-of-Particulars fields below are missing — Sections I-V of the Schedule would otherwise render as `[*]` and produce a half-blank contract that looks superficially complete. Collect every field before writing the JSON; do not call the generator with a partial payload "to see what happens."

**Step A — Resolve from Airtable first.** Pull the Conveyance record AND its linked Parties. Map only from fields that exist on the base:
- Airtable `Buyer`                 → `purchaser_name`
- Airtable `Purchase Price (Kshs)` → `purchase_price_figures`; compute `purchase_price_words`
- Airtable `Deposit Paid (Kshs)`   → `deposit_figures`; compute `deposit_words`
- (computed)                       → `balance_figures` = price − deposit; compute `balance_words`
- Airtable `Project`               → `project_slug`
- Linked **Parties** record where Role = Buyer: `ID / PIN` → `purchaser_id`; `Email` → `purchaser_email`; `Phone` → `purchaser_phone`
- NOT stored on the Conveyance (collect in Step B): `apartment_number`, `apartment_floor`, `balance_installments_count`, `balance_start_month`. Once the instalment count is given, compute `balance_monthly_amount` = balance ÷ instalments, rounded.

**Step B — Identify any missing fields**, then collect them with the **AskUserQuestion tool**, grouped into popups of at most four questions (never one overwhelming list). Group by the sections below (Purchaser, Apartment, Price, Plan); pull option choices from the schema where a field is a select, and let the user type the free-text values. The block below is the field reference, not a literal text prompt (omit any line already resolved from Airtable):

Ask:
```
Schedule of Particulars — fill the fields not yet on file:

Purchaser (Section I):
  Full name (CAPS):        ___
  ID / Passport No:        ___
  Email:                   ___
  Mobile (+254...):        ___

Apartment (Section II):
  Apartment Number:        ___
  Floor (1st, 2nd, ...):   ___

Purchase Price (Section III):
  Figures (e.g. 9,200,000):     ___
  In words (e.g. Nine Million Two Hundred Thousand): ___

Payment Plan (Section V):
  Deposit figures:         ___
  Deposit in words:        ___
  Balance figures:         ___ (price minus deposit)
  Balance in words:        ___
  Number of monthly instalments:  ___
  Monthly amount (figures): ___
  Start month (e.g. July 2026):    ___
```

After collecting, re-confirm the totals add up (deposit + balance == purchase price; monthly × instalments ≈ balance) before invoking the generator.

**Field list — for reference:**

- [ ] doc_type: `"developer_sale_agreement"`
- [ ] project_slug (must match a key in `scripts/developer-projects.json`: `royal_suburb_1`, `royal_suburb_2`, `royal_suburb_3`, `tsavo_divine`, `tsavo_rising`, `tsavo_skywalk`). If missing on the matter, ABORT and re-intake via `/new-conveyance`.
- [ ] date (e.g. "22nd March 2026")
- [ ] purchaser_name, purchaser_id, purchaser_email, purchaser_phone
- [ ] apartment_number, apartment_floor
- [ ] purchase_price_words, purchase_price_figures
- [ ] deposit_words, deposit_figures
- [ ] balance_words, balance_figures
- [ ] balance_installments_count, balance_monthly_amount, balance_start_month
- [ ] alt_contact_name, alt_contact_email, alt_contact_phone (Section VII — optional)

DO NOT supply `developer_name`, `vendor_reg_no`, `apartment_description`, `development_description`, `property_lr_no`, `payment_plan`, `vendor_advocate_firm`, `vendor_advocate_address` for developer matters — these are sourced from the registry and overriding them would produce inconsistency with the official MAK template for that project.

**Error handling:**
- `Error: Unknown developer project slug:` → verify `project_slug` matches a key in `scripts/developer-projects.json` exactly.
- `Error: developer_sale_agreement is missing required fields` → re-run Step B above to collect every listed field before re-generating. Do not invent placeholder values.

**conveyance_letter — REQUIRED FIELDS**
- [ ] doc_type: "conveyance_letter"
- [ ] date, ref
- [ ] recipient_lines (array — name, address line, TOWN — minimum 3 entries)
- [ ] salutation
- [ ] subject (RE: IN CAPS)
- [ ] paragraphs (array, minimum 2)
- [ ] closing
- [ ] vendor_name, purchaser_name, property_lr_no, property_location

**undertaking_letter — REQUIRED FIELDS**
- [ ] doc_type: "undertaking_letter"
- [ ] date, ref
- [ ] recipient_lines (array — minimum 3 entries)
- [ ] salutation
- [ ] subject (RE: IN CAPS)
- [ ] vendor_name, purchaser_name
- [ ] property_lr_no
- [ ] purchase_price_words, purchase_price_figures
- [ ] paragraphs (array, minimum 2 — terms of the undertaking)
- [ ] closing

**PARTY TYPE RULE — applies to lra_33, lra_63, lra_58**

Before writing any JSON for a statutory form, determine whether each party is an individual or a company. The execution block structure is structurally different:
- Individual: "SIGNED as a deed" + name/ID/PIN + witness attestation
- Company: "Sealed with the Common Seal of [Company Name]" + Director/Secretary signature table + company seal box

Rules:
- If ALL parties are individuals: use flat `vendor_name`/`purchaser_name` fields.
- If ANY party is a company: use `transferors`/`transferees` arrays with `company_name` and `is_company: true`. Flat fields cannot trigger the company execution block.
- Do not mix flat fields and arrays: if you use arrays for one party, use arrays for both.
- For LRA 58: `chargee_name` flat field already triggers company execution for the chargee (it maps to `company_name` internally). Only use `chargors` array if the chargor is itself a company.

**lra_33 (freehold transfer) — REQUIRED FIELDS**
- [ ] doc_type: "lra_33"
- [ ] date
- [ ] property_lr_no, property_location
- [ ] purchase_price_words, purchase_price_figures
- [ ] nature_of_interest (default: "ABSOLUTE")
- [ ] INDIVIDUAL parties: vendor_name, vendor_id, purchaser_name, purchaser_id
- [ ] COMPANY party/ies: transferors array and/or transferees array (see Party Type Rule above)
- [ ] If company: each object needs company_name, is_company: true, reg_no
- [ ] If company with attorney authority: attorneys array, poa_nos array, rdn_nos array (all optional)

**lra_63 (leasehold transfer) — REQUIRED FIELDS**
- [ ] doc_type: "lra_63"
- [ ] date
- [ ] property_lr_no, property_location
- [ ] original_term (e.g. "99 years from 1st January 1970")
- [ ] unexpired_term (e.g. "44 years")
- [ ] annual_rent (e.g. "Kshs. 1,000")
- [ ] lease_term_years (unexpired residue)
- [ ] purchase_price_words, purchase_price_figures
- [ ] nature_of_interest (default: "LEASEHOLD")
- [ ] INDIVIDUAL parties: vendor_name, vendor_id, purchaser_name, purchaser_id
- [ ] COMPANY party/ies: transferors/transferees arrays (see Party Type Rule above)

**lra_58 (discharge of charge) — REQUIRED FIELDS**
- [ ] doc_type: "lra_58"
- [ ] date
- [ ] property_lr_no
- [ ] chargee_name (financial institution — triggers company execution block automatically)
- [ ] chargee_reg_no (company registration number of the lender)
- [ ] chargor_name (individual borrower) OR chargors array if chargor is a company
- [ ] chargor_id (individual ID) — omit if using chargors array
- [ ] chargor_pin (individual KRA PIN) — omit if using chargors array
- [ ] date_of_charge
- [ ] charge_entry_no
- [ ] amount_secured

**lra_84 (official search) — REQUIRED FIELDS**
- [ ] doc_type: "lra_84"
- [ ] date
- [ ] property_lr_no (also used as title_number)
- [ ] applicant_name (from firm details)
- [ ] applicant_id (firm P105 number)
- [ ] applicant_pin (firm KRA PIN if applicable)
- [ ] search_scope ("a" for all entries — default)


**engagement_letter — REQUIRED FIELDS**
- [ ] doc_type: "engagement_letter"
- [ ] date, ref
- [ ] salutation (e.g. "Dear Ms. Wayodi,")
- [ ] purchaser_name (or client_name — buyer / client being engaged)
- [ ] vendor_name
- [ ] property_lr_no, property_location
- [ ] purchase_price_words, purchase_price_figures
- [ ] legal_fees (numeric, e.g. 50000)
- [ ] legal_fees_vat (numeric, e.g. 8000)
- [ ] disbursements (numeric, e.g. 15000)
- [ ] engagement_total (numeric — sum of above three)

**fee_note — REQUIRED FIELDS**
- [ ] doc_type: "fee_note"
- [ ] date, ref
- [ ] property_lr_no
- [ ] legal_fees (numeric)
- [ ] legal_fees_vat (numeric)
- [ ] disbursements_office (numeric — office expenses: postage, printing, etc.)
- [ ] disbursements_statutory (numeric — statutory fees: search, stamp duty, registration)
- [ ] fee_note_total (numeric — sum of all four)

**developer_sale_agreement — REQUIRED FIELDS**
- [ ] doc_type: "developer_sale_agreement"
- [ ] date
- [ ] developer_name (company name — vendor) OR vendor_name
- [ ] vendor_reg_no (company registration number of developer)
- [ ] purchaser_name, purchaser_id
- [ ] purchaser_email, purchaser_phone
- [ ] apartment_description (e.g. "Apartment No. 3A on the 3rd Floor of Block B")
- [ ] development_description (e.g. "a residential apartment complex known as Sunrise Gardens located on LR No. 123/456")
- [ ] property_lr_no, property_location
- [ ] purchase_price_words, purchase_price_figures
- [ ] deposit_words, deposit_figures
- [ ] balance_words, balance_figures
- [ ] completion_date
- [ ] payment_plan (description of payment schedule)
- [ ] vendor_advocate_firm, vendor_advocate_address
- [ ] purchaser_advocate_firm, purchaser_advocate_address

### 3c — JSON template (use only the block matching your doc_type)

Write completed data to `/tmp/conveyancing-doc-data.json`.

**sale_agreement:**
```json
{
  "doc_type": "sale_agreement",
  "date": "5th April 2026",
  "vendor_name": "VENDOR FULL NAME IN CAPS",
  "vendor_id": "XXXXXXXX",
  "vendor_po_box": "",
  "vendor_town": "",
  "purchaser_name": "PURCHASER FULL NAME IN CAPS",
  "purchaser_id": "XXXXXXXX",
  "purchaser_po_box": "",
  "purchaser_town": "",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "property_area_words": null,
  "property_area_figures": null,
  "tenure": "freehold",
  "lease_term_years": null,
  "lease_start_date": null,
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "deposit_words": null,
  "deposit_figures": null,
  "balance_words": "Amount in words",
  "balance_figures": "0,000,000",
  "completion_date": "20th June 2026",
  "vendor_advocate_firm": "Vendor Advocates & Co.",
  "vendor_advocate_address": "P.O. Box ___, Nairobi",
  "purchaser_advocate_firm": "Purchaser Advocates & Co.",
  "purchaser_advocate_address": "P.O. Box ___, Nairobi",
  "is_leasehold": false,
  "is_agricultural": false,
  "is_charged": false,
  "vendor_is_company": false,
  "purchaser_is_company": false,
  "include_spousal_consent": true
}
```

**conveyance_letter:**
```json
{
  "doc_type": "conveyance_letter",
  "date": "5th April 2026",
  "ref": "MM/CONV/2026/001",
  "recipient_lines": ["Recipient Name", "Address Line", "NAIROBI"],
  "salutation": "Dear Sir/Madam,",
  "subject": "RE: SUBJECT IN CAPS",
  "paragraphs": ["Paragraph 1.", "Paragraph 2."],
  "closing": "Yours faithfully,",
  "vendor_name": "Vendor Name",
  "purchaser_name": "Purchaser Name",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location"
}
```

**undertaking_letter:**
```json
{
  "doc_type": "undertaking_letter",
  "date": "5th April 2026",
  "ref": "MM/CONV/2026/001",
  "recipient_lines": ["Vendor Advocates Name", "P.O. Box ___", "NAIROBI"],
  "salutation": "Dear Counsel,",
  "subject": "RE: SALE OF LR NO. ___ — UNDERTAKING",
  "vendor_name": "Vendor Name",
  "purchaser_name": "Purchaser Name",
  "property_lr_no": "LR No. ___",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "paragraphs": ["We act for the Purchaser...", "We hereby undertake..."],
  "closing": "Yours faithfully,"
}
```

**lra_33 — both parties individuals:**
```json
{
  "doc_type": "lra_33",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "vendor_name": "TRANSFEROR FULL NAME",
  "vendor_id": "XXXXXXXX",
  "purchaser_name": "TRANSFEREE FULL NAME",
  "purchaser_id": "XXXXXXXX",
  "nature_of_interest": "ABSOLUTE"
}
```

**lra_33 — company transferor and/or company transferee (use arrays):**
```json
{
  "doc_type": "lra_33",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "transferors": [
    { "company_name": "TRANSFEROR COMPANY LIMITED", "is_company": true, "reg_no": "CPR/..." }
  ],
  "transferees": [
    { "name": "TRANSFEREE FULL NAME", "id_no": "XXXXXXXX", "pin": "A000000000X" }
  ],
  "nature_of_interest": "ABSOLUTE"
}
```

Note: replace `transferors` or `transferees` with an individual object `{ "name": "...", "id_no": "...", "pin": "..." }` as appropriate. Both arrays required when using array form.

**lra_63 — both parties individuals:**
```json
{
  "doc_type": "lra_63",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "original_term": "__ years from __",
  "unexpired_term": "__ years",
  "annual_rent": "Kshs. ___",
  "lease_term_years": "__ years",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "vendor_name": "ASSIGNOR FULL NAME",
  "vendor_id": "XXXXXXXX",
  "purchaser_name": "ASSIGNEE FULL NAME",
  "purchaser_id": "XXXXXXXX",
  "nature_of_interest": "LEASEHOLD"
}
```

**lra_63 — company assignor and/or company assignee (use arrays):**
```json
{
  "doc_type": "lra_63",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "original_term": "__ years from __",
  "unexpired_term": "__ years",
  "annual_rent": "Kshs. ___",
  "lease_term_years": "__ years",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "transferors": [
    { "company_name": "ASSIGNOR COMPANY LIMITED", "is_company": true, "reg_no": "CPR/..." }
  ],
  "transferees": [
    { "name": "ASSIGNEE FULL NAME", "id_no": "XXXXXXXX", "pin": "A000000000X" }
  ],
  "nature_of_interest": "LEASEHOLD"
}
```

**lra_58 — company chargee, individual chargor (standard):**
```json
{
  "doc_type": "lra_58",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "chargee_name": "BANK / LENDER NAME",
  "chargee_id": "",
  "chargee_reg_no": "CPR/...",
  "chargor_name": "BORROWER FULL NAME",
  "chargor_id": "XXXXXXXX",
  "chargor_pin": "A000000000X",
  "date_of_charge": "__ day of __ 20__",
  "charge_entry_no": "___",
  "amount_secured": "Kshs. ___"
}
```

**lra_58 — company chargor (use chargors array):**
```json
{
  "doc_type": "lra_58",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "chargee_name": "BANK / LENDER NAME",
  "chargee_reg_no": "CPR/...",
  "chargors": [
    { "company_name": "BORROWER COMPANY LIMITED", "is_company": true, "reg_no": "CPR/..." }
  ],
  "date_of_charge": "__ day of __ 20__",
  "charge_entry_no": "___",
  "amount_secured": "Kshs. ___"
}
```

**lra_84:**
```json
{
  "doc_type": "lra_84",
  "date": "5th April 2026",
  "property_lr_no": "LR No. ___",
  "title_number": "LR No. ___",
  "applicant_name": "Firm name / applicant name",
  "applicant_id": "",
  "applicant_pin": "",
  "search_scope": "a"
}
```


**engagement_letter:**
```json
{
  "doc_type": "engagement_letter",
  "date": "7th May 2026",
  "ref": "MAK/CONV/2026/001",
  "salutation": "Dear Sir/Madam,",
  "purchaser_name": "PURCHASER FULL NAME",
  "vendor_name": "VENDOR FULL NAME",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "legal_fees": 50000,
  "legal_fees_vat": 8000,
  "disbursements": 15000,
  "engagement_total": 73000
}
```

**fee_note:**
```json
{
  "doc_type": "fee_note",
  "date": "7th May 2026",
  "ref": "MAK/CONV/2026/001",
  "property_lr_no": "LR No. ___",
  "legal_fees": 50000,
  "legal_fees_vat": 8000,
  "disbursements_office": 5000,
  "disbursements_statutory": 10000,
  "fee_note_total": 73000
}
```

**developer_sale_agreement:**
```json
{
  "doc_type": "developer_sale_agreement",
  "date": "7th May 2026",
  "developer_name": "DEVELOPER COMPANY LIMITED",
  "vendor_reg_no": "CPR/2020/...",
  "purchaser_name": "PURCHASER FULL NAME",
  "purchaser_id": "XXXXXXXX",
  "purchaser_email": "purchaser@email.com",
  "purchaser_phone": "+254 7XX XXX XXX",
  "apartment_description": "Apartment No. ___ on the ___ Floor of Block ___",
  "development_description": "a residential apartment complex known as ___ located on LR No. ___",
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "deposit_words": "Amount in words",
  "deposit_figures": "0,000,000",
  "balance_words": "Amount in words",
  "balance_figures": "0,000,000",
  "completion_date": "20th June 2026",
  "payment_plan": "20% deposit on signing; 80% balance on completion",
  "vendor_advocate_firm": "MAK Partners and Advocates LLP",
  "vendor_advocate_address": "P.O. Box ___, Nairobi",
  "purchaser_advocate_firm": "Purchaser Advocates",
  "purchaser_advocate_address": "P.O. Box ___, Nairobi"
}
```

Determine the output filename: `[matter-slug]-[doc-type]-[YYYY-MM-DD].docx`

Run the generation script (npm install runs automatically on first use):
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && ([ -d node_modules ] || npm install) && node generate-conveyancing-document.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[filename].docx
```

If the script fails, read the error and fix the JSON data, then retry.

Present the download link.

With the AskUserQuestion tool, ask: "Any changes to this document?" Options: All good; Yes, I will specify. If they choose to specify, ask what to change and regenerate.

Then run the **Format Verification** check from the `conveyance-document-drafter` skill before closing the step.

---

## Step 4 — Record

After drafting, create a record in the Airtable Documents table:
- Document Name: [Document Type] — [Matter Name]
- Document Type: [from single select]
- Linked Conveyance and Milestone
- Status: "Drafting"
