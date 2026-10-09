---
description: Draft any conveyancing document for a matter, informed by its current milestone
---

# /draft-conveyance-doc

**Purpose:** Draft any conveyancing document for a specific matter, informed by the current milestone.

This workflow is also invoked by natural-language requests. If an advocate says "draft an LRA 63", "draft a transfer", "draft a letter of engagement", "draft a client update", "draft an undertaking", or "draft a conveyancing letter", route the request here even when /draft-conveyance-doc was not typed. Identify the document type, then follow the same matter lookup, required-field, generator, and render checks below.

---

## Step 1, Identify Matter

Identify the matter by its number, not by listing every file (listing does not scale once the firm has volume, and it reads as clumsy).

Ask: "Which matter? Type its LR / Title number (for example Nairobi/Block 1/123):"

Query Airtable for the Active Conveyance whose **Title Number** matches what was typed (match on the number, ignoring spacing and case). Confirm the matter name back before proceeding. If nothing matches, say so and ask again. If a few close matches come back, show only those few and let the user pick.

---

## Step 2, Document Menu

Offer the documents with the **AskUserQuestion tool**, not a typed number. Present the documents available at the matter's current milestone (from the table below) as options. If there are more than four, put the milestone's own documents in the first popup plus an "Any-stage document" option that opens a second popup with the rest. Always leave a path to the any-stage documents (client update, chase notice).

Document options by milestone:
- Milestone 1, Instructions: Sale Agreement; Engagement Letter; Fee Note; Letter acknowledging instructions
- Milestone 2, Official Search: Official Search application letter (with LRA 84 instruction note)
- Milestone 3, Consent: LCB consent application letter (agricultural land); NLC/Commissioner of Lands consent application letter (leasehold)
- Milestone 4, Rates Clearance: Rates clearance application letter (to County Government)
- Milestone 5, Rent Clearance: Rent clearance application letter (to NLC)
- Milestone 6, Stamp Duty: Stamp duty guidance note to client
- Milestone 7, Transfer Documents: LRA 33 Transfer (freehold); LRA 63 Transfer of Lease (leasehold); Requisitions on Title; Reply to Requisitions on Title; LRA 58 Discharge of Charge (if property is charged)
- Milestone 8, Registration: Registration covering letter
- Milestone 9, Completion: Completion Notice; Undertaking Letter
- Any stage: Client update letter; Reminder / chase notice to counterpart advocates
- Any stage: **Any LRA form** (the whole Ministry of Lands library, 70 forms, see 3d)

Whichever popup is showing, always carry the **Any LRA form** option on it. The milestone lists above are the forms a conveyance needs most often, not the forms the plugin can draft: cautions, restrictions, powers of attorney, charges, leases, partitions, replacement titles and the rest of the library are reached through that option. If the advocate names a form the menu does not show ("draft an LRA 67", "I need the caution form"), go straight to 3d without asking them to pick from the menu first.

---

## Step 3, Draft

**Read the matter before asking for anything.** Every fact `/new-conveyance` captured is on the matter record, and asking the advocate again gives a second chance to type an ID differently from the register. So, before any question:

1. Read the Conveyance record: **Buyer**, **Seller**, **Title Number**, **Tenure**, **Purchase Price (Kshs)**, **Deposit Paid (Kshs)**, **Target Completion**, the four advocate fields, **Property Description**, and **Notes**.
2. Read the **matter facts** lines in Notes, written by `/new-conveyance` Step 3 in a fixed `Key: value` format: `Acting for` (Buyer or Seller, which gives `acting_for` as `purchaser` or `vendor`), `Area` and `Area in words` (figure and unit, which give `property_area_figures`, `property_area_unit` and `property_area_words`), `Agricultural`, `Charge` (the chargee and whether it is redeemed on completion, which give `is_charged`, `chargee_name` and `charge_redeemed_on_completion`), `Lease` (term, commencement date and lessor), and `Buyer signatories` / `Seller signatories` (a company's executing officers). `not known` means the fact was not known at opening: pass `null` so it prints as a dotted blank, or ask for it now if this document cannot go out without it.
3. Read the linked **Parties** records: **Party Name**, **Role** (Buyer, Seller, Mortgagee), **ID / PIN**, **Email**, **Phone** and **Address**. `ID: ...; PIN: ...` is an individual (`_id`, and `pin` in the transfer arrays); `Company Reg. No.: ...; PIN: ...` is a company (`_reg_no`, `_is_company: true`, and the company arrays for LRA forms). The Mortgagee row is the chargee for an LRA 58. The Address lines give the P.O. Box and town, and `recipient_lines` / `client_address_lines`.

Ask the advocate only for what those three reads do not hold, and say in one line what was taken from the record ("From the matter: seller PETER TESTSELLER, ID 11111111; buyer MARY TESTBUYER, ID 22222222; charged to Test Bank Kenya."). A matter opened before the Parties table was written has no Parties rows: ask for the missing facts once, then write the Parties rows and the Notes lines in the `/new-conveyance` Step 3 format so the next document does not ask again.

**Sign in first (who signs this document).** Letters and engagement letters carry the signing advocate's own name and P.105 number, read from the firm directory, the **Team Members** table of the conveyancing base, never from memory and never from another advocate's record. Sign in for every document, even ones that do not name the advocate; the generator uses the block only where a document is signed.

1. **Sign in.** Create one record in the **Sign-ins** table of the conveyancing base: `Task` = `draft-conveyance-doc: [document type]`, `Document Type` = `[document type]`. Airtable stamps it with the account that created it.
2. **Read the stamp.** The create call returns only the fields you wrote, so read the record back with `list_records_for_table` using its record id and `fieldIds` = [`Signed In By`]. Its value is a person object; take its **email**.
3. **Find the person.** In **Team Members**, find the record whose **Airtable Login** equals that email (case-insensitive); if none, the record whose **Email** equals it. If neither exists, stop and say: "You are not in the firm directory yet. Run /setup-conveyancing once, then try again." Do not guess, and never use another advocate's record.
4. **Say who is signing, in one line, and continue without waiting:** "Signing as [Name], Advocate ([P.105 Number])." If the user names someone else at any point ("sign as Ann"), look that person up in Team Members instead, repeat the line for them, and use their record. That is how a paralegal or secretary drafts for an advocate.
5. **Link the sign-in.** Update the Sign-in record so **Signed As** links to the chosen Team Members record.
6. **Put the identity into the data file** as this block, every value copied exactly from the Team Members record:

```json
"advocate": {
  "record_id": "[Team Members record id, rec...]",
  "signin_id": "[Sign-in record id, rec...]",
  "name": "[Name]",
  "p105_no": "[P.105 Number]",
  "practice_no": "[LSK Practice Number]",
  "practice_year": [Practice Year],
  "email": "[Email]"
}
```

The generator refuses to write a signed document without this block or with a P.105 in the wrong form, and it never falls back to the firm partner's details. If it prints `REFUSED:`, do not retry: read the reason and pass it to the user. The fix is almost always `/setup-conveyancing`.

### 3a, doc_type mapping

- Sale Agreement → `sale_agreement`
- Application letters (Official Search, Rates Clearance, Rent Clearance, LCB Consent, NLC Consent, Registration covering letter, Completion Notice, Requisitions on Title, Reply to Requisitions, client update, reminder/chase) → `conveyance_letter`
- Undertaking Letter → `undertaking_letter`
- LRA 33 Transfer (freehold) → `lra_33`
- LRA 63 Transfer of Lease (leasehold) → `lra_63`
- LRA 58 Discharge of Charge → `lra_58`
- LRA 84 Official Search Application (form) → `lra_84`
- LRA 9 General Application → `lra_9` (drafted by the plugin; print on plain paper)
- Any LRA form in the library → its `form_id` from `_index.json` (for example LRA 67 Caution → `lra_67`). See 3d.
- Engagement Letter → `engagement_letter`
- Fee Note → `fee_note`

### 3b, Required fields checklist (confirm ALL before writing any JSON)

**sale_agreement, REQUIRED FIELDS**
- [ ] doc_type: "sale_agreement"
- [ ] date
- [ ] acting_for ("purchaser" or "vendor", from the Notes `Acting for` line): the firm's own name and address print on that side only, from the firm configuration; leave that side's advocate fields null
- [ ] vendor_name; vendor_id for an individual, or vendor_reg_no, vendor_is_company: true and vendor_directors for a company
- [ ] purchaser_name; purchaser_id for an individual, or purchaser_reg_no, purchaser_is_company: true and purchaser_directors for a company
- [ ] vendor_po_box, vendor_town, purchaser_po_box, purchaser_town (from Parties Address; null prints a dotted blank)
- [ ] property_lr_no, property_location
- [ ] property_area_figures, property_area_words, property_area_unit (from the Notes `Area` lines; null prints a dotted blank)
- [ ] tenure ("freehold" or "leasehold") and is_leasehold set from it (the generator refuses a contradiction)
- [ ] leasehold only: lease_term_years (the term granted, not the years remaining), lease_start_date (null prints a dotted blank), lessor
- [ ] purchase_price_words, purchase_price_figures
- [ ] deposit_words, deposit_figures (both null if no deposit is paid; the agreement then says so)
- [ ] balance_words, balance_figures
- [ ] completion_date
- [ ] the other side's advocate firm and address (null if not known: never the word "Unknown")
- [ ] is_agricultural (boolean)
- [ ] is_charged (boolean), chargee_name and charge_redeemed_on_completion (from the Notes `Charge` line and the Mortgagee party)
- [ ] include_spousal_consent (boolean; ignored for a company vendor, which has no spouse)

**conveyance_letter, REQUIRED FIELDS**
- [ ] doc_type: "conveyance_letter"
- [ ] date, ref
- [ ] recipient_lines (array, name, address line, TOWN, minimum 3 entries)
- [ ] salutation
- [ ] subject (RE: IN CAPS)
- [ ] paragraphs (array, minimum 2)
- [ ] closing
- [ ] vendor_name, purchaser_name, property_lr_no, property_location

**undertaking_letter, REQUIRED FIELDS**
- [ ] doc_type: "undertaking_letter"
- [ ] date, ref
- [ ] recipient_lines (array, minimum 3 entries)
- [ ] salutation
- [ ] subject (RE: IN CAPS)
- [ ] vendor_name, purchaser_name
- [ ] property_lr_no
- [ ] purchase_price_words, purchase_price_figures
- [ ] paragraphs (array, minimum 2, terms of the undertaking)
- [ ] long_stop_date (the date the undertaking lapses, e.g. "31st December 2026")
- [ ] closing
- [ ] acting_for ("purchaser" or "vendor", from the Notes `Acting for` line): the recital states the side the firm acts for, and `signing_for` may not contradict it

An undertaking is the advocate's personal guarantee. The generator refuses to write one with no terms in it, and refuses one with no expiry date, because an open-ended undertaking binds the firm indefinitely. Ask the advocate for the long stop date; do not invent one.

**undertaking_request, REQUIRED FIELDS**
- [ ] doc_type: "undertaking_request"
- [ ] date, ref
- [ ] recipient_lines (array, minimum 3 entries)
- [ ] salutation
- [ ] subject (RE: IN CAPS)
- [ ] vendor_name, purchaser_name
- [ ] property_lr_no
- [ ] balance_words, balance_figures
- [ ] paragraphs (array, the terms being ASKED OF the other side, each beginning "THAT ")
- [ ] closing
- [ ] acting_for ("purchaser" or "vendor"): a purchaser-side request asks the other side to hold the completion documents against the balance; a vendor-side request asks them to undertake to pay the balance against the completion documents

This is the mirror of the undertaking letter: the firm asks the other side for their undertaking rather than giving its own. Write each term as the other side's promise, not the firm's. The generator prints its own lead-in and the standard closing terms (force until released, their indemnity, time of the essence, Kenyan law); `paragraphs` supplies only the terms particular to this matter, and the letter is refused if it names none.

**PARTY TYPE RULE, applies to lra_33, lra_63, lra_58**

Before writing any JSON for a statutory form, determine whether each party is an individual or a company. The execution block structure is structurally different:
- Individual: "SIGNED as a deed" + name/ID/PIN + witness attestation
- Company: "Sealed with the Common Seal of [Company Name]" + Director/Secretary signature table + company seal box

Rules:
- If ALL parties are individuals: use flat `vendor_name`/`purchaser_name` fields.
- If ANY party is a company: use `transferors`/`transferees` arrays with `company_name` and `is_company: true`. Flat fields cannot trigger the company execution block.
- Do not mix flat fields and arrays: if you use arrays for one party, use arrays for both.
- For LRA 58: `chargee_name` flat field already triggers company execution for the chargee (it maps to `company_name` internally). Only use `chargors` array if the chargor is itself a company.

**lra_33 (freehold transfer), REQUIRED FIELDS**
- [ ] doc_type: "lra_33"
- [ ] date
- [ ] property_lr_no, property_location
- [ ] purchase_price_words, purchase_price_figures
- [ ] nature_of_interest (default: "ABSOLUTE")
- [ ] INDIVIDUAL parties: vendor_name, vendor_id, purchaser_name, purchaser_id
- [ ] COMPANY party/ies: transferors array and/or transferees array (see Party Type Rule above)
- [ ] If company: each object needs company_name, is_company: true, reg_no
- [ ] If company with attorney authority: attorneys array, poa_nos array, rdn_nos array (all optional)

**lra_63 (leasehold transfer), REQUIRED FIELDS**
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

**lra_58 (discharge of charge), REQUIRED FIELDS**
- [ ] doc_type: "lra_58"
- [ ] date
- [ ] property_lr_no
- [ ] chargee_name (financial institution, triggers company execution block automatically)
- [ ] chargee_reg_no (company registration number of the lender)
- [ ] chargor_name (individual borrower) OR chargors array if chargor is a company
- [ ] chargor_id (individual ID), omit if using chargors array
- [ ] chargor_pin (individual KRA PIN), omit if using chargors array
- [ ] date_of_charge
- [ ] charge_entry_no
- [ ] amount_secured

**lra_84 (official search), REQUIRED FIELDS**
- [ ] doc_type: "lra_84"
- [ ] date
- [ ] property_lr_no (also used as title_number)
- [ ] applicant_name (from firm details)
- [ ] applicant_id (firm P105 number)
- [ ] applicant_pin (firm KRA PIN if applicable)
- [ ] search_scope ("a" for all entries, default)


**engagement_letter, REQUIRED FIELDS**
- [ ] doc_type: "engagement_letter"
- [ ] date, ref
- [ ] salutation (e.g. "Dear Ms. Otieno,")
- [ ] purchaser_name (or client_name, buyer / client being engaged)
- [ ] vendor_name
- [ ] property_lr_no, property_location
- [ ] purchase_price_words, purchase_price_figures
- [ ] legal_fees (numeric, e.g. 50000)
- [ ] legal_fees_vat (numeric, e.g. 8000)
- [ ] disbursements (numeric, e.g. 15000)
- [ ] engagement_total (numeric, sum of above three)
- [ ] acting_for and client_name (the client is the side the firm acts for); acting for the vendor, also background and scope written for the sale

**fee_note, REQUIRED FIELDS**
- [ ] doc_type: "fee_note"
- [ ] date, ref
- [ ] property_lr_no
- [ ] legal_fees (numeric)
- [ ] legal_fees_vat (numeric)
- [ ] disbursements_office (numeric, office expenses: postage, printing, etc.)
- [ ] disbursements_statutory (numeric, statutory fees: search, stamp duty, registration)
- [ ] fee_note_total (numeric, sum of all four: the generator refuses a total that is not the sum of its lines)
- [ ] client_name, client_address_lines (the client billed: the Parties record for the side in `Acting for`)
- [ ] firm_bank (the firm's account, read from the Firm Settings table, not typed from memory and never from firm-config.json)

**Before writing a fee note, read the firm's account from the directory.** Read the **Firm Settings** table of the conveyancing base and put its rows into the data file as:

```json
"firm_bank": {
  "bank_account_name": "[Firm Settings: bank_account_name]",
  "bank_name": "[Firm Settings: bank_name]",
  "bank_account_no": "[Firm Settings: bank_account_no]",
  "bank_branch": "[Firm Settings: bank_branch]"
}
```

If `bank_account_no` is blank or the table does not exist, stop and say: "The firm's bank account is not recorded yet, so a fee note would not tell the client where to pay. Run `/setup-conveyancing` and answer step 4g, then try again." Do not type an account number from memory, from an old document, or from anything a client sent. An account number on a fee note moves money.

### 3c, JSON template (use only the block matching your doc_type)

Write completed data to `/tmp/conveyancing-doc-data.json`.

**sale_agreement:**
```json
{
  "doc_type": "sale_agreement",
  "date": "5th April 2026",
  "acting_for": "purchaser",
  "vendor_name": "VENDOR FULL NAME IN CAPS",
  "vendor_is_company": false,
  "vendor_id": "XXXXXXXX",
  "vendor_po_box": "1-00100",
  "vendor_town": "Nairobi",
  "purchaser_name": "PURCHASER COMPANY LIMITED",
  "purchaser_is_company": true,
  "purchaser_reg_no": "PVT-XXXXXXX",
  "purchaser_directors": [{ "name": "OFFICER ONE", "title": "Director" }, { "name": "OFFICER TWO", "title": "Director/Secretary" }],
  "purchaser_po_box": null,
  "purchaser_town": null,
  "property_lr_no": "LR No. ___",
  "property_location": "Physical location",
  "property_area_figures": "2",
  "property_area_words": "two",
  "property_area_unit": "acres",
  "tenure": "freehold",
  "is_leasehold": false,
  "lease_term_years": null,
  "lease_start_date": null,
  "lessor": null,
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "deposit_words": null,
  "deposit_figures": null,
  "balance_words": "Amount in words",
  "balance_figures": "0,000,000",
  "completion_date": "20th June 2026",
  "vendor_advocate_firm": "Vendor Advocates & Co.",
  "vendor_advocate_address": "P.O. Box ___, Nairobi",
  "purchaser_advocate_firm": null,
  "purchaser_advocate_address": null,
  "is_agricultural": false,
  "is_charged": true,
  "chargee_name": "BANK NAME AS ON THE REGISTER",
  "charge_redeemed_on_completion": true,
  "include_spousal_consent": true
}
```

Replace every placeholder with the matter's own facts. The output scan refuses a leftover "XXXXXXXX", but not a leftover "___", so never leave one. With `acting_for` "purchaser" the purchaser's advocate fields stay null and the firm prints there. An individual party takes `_id` and no `_reg_no` / `_directors`.

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
  "acting_for": "purchaser",
  "recipient_lines": ["Vendor Advocates Name", "P.O. Box ___", "NAIROBI"],
  "salutation": "Dear Counsel,",
  "subject": "RE: SALE OF LR NO. ___, UNDERTAKING",
  "vendor_name": "Vendor Name",
  "purchaser_name": "Purchaser Name",
  "property_lr_no": "LR No. ___",
  "purchase_price_words": "Amount in words",
  "purchase_price_figures": "0,000,000",
  "paragraphs": ["THAT we hold the balance of the purchase price in our client account.", "THAT we shall release it to you against the executed transfer, the original title and the discharge."],
  "long_stop_date": "31st December 2026",
  "closing": "Yours faithfully,"
}
```

**lra_33, both parties individuals:**
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

**lra_33, company transferor and/or company transferee (use arrays):**
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

**lra_63, both parties individuals:**
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

**lra_63, company assignor and/or company assignee (use arrays):**
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

**lra_58, company chargee, individual chargor (standard):**
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

**lra_58, company chargor (use chargors array):**
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
  "ref": "[firm ref, e.g. CONV/2026/001]",
  "salutation": "Dear Sir/Madam,",
  "acting_for": "purchaser",
  "client_name": "PURCHASER FULL NAME",
  "client_address_lines": ["P.O. Box ___", "NAIROBI"],
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
  "ref": "[firm ref, e.g. CONV/2026/001]",
  "property_lr_no": "LR No. ___",
  "legal_fees": 50000,
  "legal_fees_vat": 8000,
  "disbursements_office": 5000,
  "disbursements_statutory": 10000,
  "fee_note_total": 73000,
  "client_name": "CLIENT FULL NAME",
  "client_address_lines": ["P.O. Box ___", "NAIROBI"],
  "firm_bank": {
    "bank_account_name": "[Firm Settings: bank_account_name]",
    "bank_name": "[Firm Settings: bank_name]",
    "bank_account_no": "[Firm Settings: bank_account_no]",
    "bank_branch": "[Firm Settings: bank_branch]"
  }
}
```

### 3d, Any LRA form from the library

The plugin drafts 70 Ministry of Lands forms: 66 from the schema library in
`${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/`, and LRA 33, LRA 63, LRA 58 and LRA 84,
which have their own builders. Those four are already named on the menu; take this path
for any of the other 66. Every word these forms print is the Ministry's own text, so
nothing here is typed from memory.

**1. Read the index.** `${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/_index.json`. Its
`forms` array is everything the plugin drafts, each entry carrying `form_id`,
`form_number`, `doc_title`, `regulation`, `category`, `party_mode`, `when_used`, the
**names** of the form's `custom_fields`, and `pairs_with_lra9`. Its `excluded` array is everything the
plugin refuses, each with its `reason`. Read the file before answering; do not recall a
form number, a title or a field.

The index is a catalogue, not the form. Three things it does not carry, and each of them
is needed to draw the form correctly, so **open the schema file**
`${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/<form_id>.json` as soon as the form is
resolved:

- the fields' **labels and prompts**, under `custom_fields`: `{name, label, prompt,
  required}`. The index publishes the names alone.
- **`party_roles`**, the form's own names for its two sides. Every schema carries it and
  no index entry does. See 6c.
- the form's text, which is where the **base fields** it uses are visible. See 6b.

LRA 33, LRA 63, LRA 58 and LRA 84 have builders rather than schemas, so they have no
schema file and no `custom_fields`: their required fields are the checklists in 3b.

**2. Resolve the form.**

- The advocate gave a number ("LRA 67", "form 42"): take that entry.
- The advocate described the need ("I need to lodge a caution", "the bank is releasing
  the charge", "we are noting a spouse on the title"): take every entry whose
  `doc_title` or `when_used` matches. If exactly one matches, say which one and why, in
  one line, and carry on. If more than one matches, put them to the advocate with the
  **AskUserQuestion tool**, one option per form, labelled with the form number and
  headed by its `when_used` sentence.
- **Never guess between two forms. Show both.** A caution is not a restriction, a
  transfer is not a transfer of lease, and a discharge is not a partial discharge. The
  wrong instrument lodged is the wrong instrument registered.
- Nothing matches: say so, say what was searched, and ask the advocate for the form
  number. Do not offer the closest thing as though it were the thing.

**3. A registrar-issued form is refused by name.** If the number is in `excluded`, say
so and give the entry's own `reason`:

> "LRA 68 (NOTICE OF CAUTION) is issued by the Land Registrar, not drafted by an
> advocate. The plugin does not generate it."

Then offer the nearest entry in `forms`, and wait to be asked before drafting it: for a
notice of caution, the caution itself (LRA 67); for a certificate of official search
(LRA 85), the LRA 84 application that asks for it; for an order removing a caution, the
application to remove it. The 25 refused forms are registers, certificates, notices and
orders the registry issues. Drafting one would be producing a registrar's document.

**4. Collect the facts, do not invent them.** Pull the matter's parties and property
from Airtable as at the top of Step 3. Then read `custom_fields` out of the form's own
schema file and ask each one by its `prompt`, **four per popup** with the AskUserQuestion
tool, working down the list until every field has an answer. The prompts are written for
the person answering; use their words, and use the `label` as the option heading. A field
marked `"required": false` may be left out; every other one must be answered. A required
field left blank stops the run before anything is written, and the generator names the
field:

```
REFUSED: [lra_67] custom field "interest_claimed" (Interest claimed) is required.
```

That is the design, not a fault. Go back and ask; never fill a registry blank with a
plausible guess.

**5. Sign in** exactly as at the top of Step 3, and carry the `advocate` block in the
data file even where the form carries no advocate signature. The generator refuses any
signed document without it and never falls back to the firm partner. The DRAWN BY
presentation clause the forms carry is firm level, never an advocate.

**6. Write the data file** to `/tmp/conveyancing-doc-data.json`.

A form's facts come from two places, and only one of them refuses. A declared custom
field that is missing stops the run and names itself. A **base field** that is missing
does not: the generator prints the blank and exits zero, and a registry instrument goes
out with a hole in it where a fact belongs. So collect both before writing anything.

**6a. The base fields.** Eleven names need no declaration in a schema, which means they
are **not** in `custom_fields` and nothing will ever name them for you
(`scripts/form-schemas/README.md`, "Base fields, which need no declaration"):

`vendor_name`, `vendor_id`, `purchaser_name`, `purchaser_id`, `property_lr_no`,
`property_location`, `purchase_price_words`, `purchase_price_figures`, `date`,
`declaration_text`, `sworn_at`.

**6b. Work out which of them this form uses.** Open the resolved schema file and read it
for two things:

- every `{{name}}` anywhere in it: in `body_text`, `detail_rows`, `head_lines`,
  `pre_title_lines`, `title_line`, `filing_box`, `foot_notes`, `execution` and `annex`
  alike;
- every `value_field` that is not one of the four party columns (`transferorNames`,
  `transferorIDs`, `transfereeNames`, `transfereeIDs`).

Any name that comes back and is **not** in `custom_fields` is a base field this form
needs. Ask for it exactly as you would ask for a declared field, and carry it in the data
file. The consideration is the common case: LRA 35, LRA 36, LRA 48, LRA 49, LRA 52,
LRA 57, LRA 60 and LRA 61 take the price through `purchase_price_words` and
`purchase_price_figures` and declare neither, so a data file that carries only the
declared fields prints `Consideration  Kenya Shillings  (Kshs. /=)` and says nothing
about it.

Two base fields can hide from that scan, because the engine can consume them directly
rather than through a placeholder. Neither is caught by reading the schema's text, so
check the schema's shape instead:

- **`declaration_text`**, the deponent's own grounds, one numbered paragraph per line.
  Needed whenever the schema's `execution.mode` is `declaration` **or** it carries an
  `annex`, unless `custom_fields` already declares it. That is seven forms: LRA 15,
  LRA 16 and LRA 47 swear on their own face; LRA 10, LRA 14, LRA 19 and LRA 67 annex a
  declaration. Only LRA 47 shows it as a placeholder and only LRA 67 declares it, so on
  the other five nothing at all will ask you for it. Ask the advocate for the grounds:
  they are the substance of the declaration and cannot be inferred from a matter record.
  Without it, LRA 47 prints its opening line and its closing line with nothing between
  them.
- **`sworn_at`**, the place of swearing in the jurat. Needed when `execution.mode` is
  `declaration`, unless declared: LRA 15 and LRA 47 need it and neither names it
  (LRA 16 declares it). An annexed declaration prints a ruled blank for the place
  instead, for the commissioner to fill in, so LRA 10, LRA 14, LRA 19 and LRA 67 do not
  need it.

**6c. The parties, by the form's own roles.** Do not assume the form's two parties are
the conveyance's vendor and purchaser. On a caution the first party is the client
cautioner and the second is the seller as registered proprietor; on a charge neither
party need be on the matter record at all; on a consent the party consenting is the
chargee or the company, not the buyer.

Read `party_roles` out of the resolved schema (it is in every schema and in no index
entry). The **`transferor` role is the first party** and goes in `vendor_name` /
`vendor_id`; the `transferee` role is the second and goes in `purchaser_name` /
`purchaser_id`. A `single_party` form carries only the `transferor` pair. Say the roles
back in one line before writing ("First party, Chargee: Equity Bank Kenya Limited.
Second party, Proprietor(s): John Doe.") and ask the advocate when the matter record does
not hold the person that role calls for. Getting LRA 32 or LRA 88 the wrong way round
produces a consent in which the wrong party consents, and it will look perfectly normal.

Either party a company: use the `transferors` / `transferees` arrays instead, each entry
`{ "company_name": "...", "is_company": true, "reg_no": "..." }` for a company and
`{ "name": "...", "id_no": "...", "pin": "..." }` for an individual, under the Party Type
Rule in 3b. Do not mix the flat fields with the arrays.

**6d. The rest of the file.**

- `doc_type` set to the entry's `form_id`, lower case with an underscore (`lra_67`, not
  `LRA 67`). An unknown `doc_type` is refused with a pointer back to `_index.json`.
- Every declared custom field, keyed by its `name`.
- The `advocate` block from step 5.

Then generate with the bundle and run the Format Verification check, as in 3e. A library
form carries no letterhead and carries a page number in its footer, which is how a
registry form is filed. Read the generated document before you present it: a run that
exits zero has proved only that nothing declared was missing, not that the form is
complete. A blank where a fact belongs is the failure this step exists to prevent.

**7. Offer the LRA 9.** When the entry's `pairs_with_lra9` is true, ask:

> "Every instrument lodged for registration goes in under an LRA 9. Draft the LRA 9 for
> this lodgement now?"

On yes, write a second data file with `doc_type` `lra_9` and generate it the same way.
LRA 9 is a `single_party` form and its party is the **Presentor**, so the first party is
the firm or person lodging, not the transferor. It requires four fields:
`instruments_presented` (this instrument, in its order of priority),
`enclosed_documents` (what goes in with it), `presentor_name` (in block capitals) and
`presentor_postal_address`. `presentor_tel_no`, `presentor_email` and
`special_instructions` are optional. Take them from the schema's own prompts, as in 6.

---

### 3e, Generate, present and verify (every document type)

Determine the output filename: `[matter-slug]-[doc-type]-[YYYY-MM-DD].docx`

Run the generation script (self-contained, no install needed):
```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[filename].docx
```

If the generator prints `REFUSED:`, do not retry with the same data. Each refusal names its
own fix:

| The refusal says | What to do |
|---|---|
| the `advocate` block is missing, or the P.105 is in the wrong form | the signing identity did not come from the directory: run `/setup-conveyancing`, then sign in again |
| `custom field "X" (Label) is required` | go back to the advocate and ask for that fact by the field's prompt; do not supply it yourself |
| `unknown doc_type "X"` | the `doc_type` is not a form the plugin drafts: read `scripts/form-schemas/_index.json` and use the right `form_id`, or say the form is refused and why |
| the firm has no bank account on file | the data file has no `firm_bank` block, or its `bank_account_no` is blank: read the **Firm Settings** table and pass it as in 3b. If Firm Settings itself has no `bank_account_no`, the fix is `/setup-conveyancing` step 4g, which records it for the whole firm. Never edit `scripts/firm-config.json`: the plugin directory is read only at the client |
| a sale agreement, undertaking or engagement letter fact is missing or contradicts another (`acting_for`, `lease_term_years`, `lessor`, `is_leasehold`, `is_charged`, `balance_words`, `scope`), or a fee note total is not the sum of its lines | read the matter record again (Step 3), then ask the advocate for that fact; never supply it yourself |

Read the reason out to the user in their own terms and fix the cause. Any other error:
read it, fix the JSON data, and retry.

Present the download link.

With the AskUserQuestion tool, ask: "Any changes to this document?" Options: All good; Yes, I will specify. If they choose to specify, ask what to change and regenerate.

Then run the **Format Verification** check from the `conveyance-document-drafter` skill before closing the step.

---

## Step 4, Record

After drafting, create a record in the Airtable Documents table:
- Document Name: [Document Type], [Matter Name]
- Document Type: [from single select]
- Linked Conveyance and Milestone
- Status: "Drafting"
