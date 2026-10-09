---
description: Open a new conveyance matter, build the nine-milestone schedule, and draft the sale agreement
---

# /new-conveyance

**Purpose:** Open a new conveyance matter. Creates the full 9-milestone schedule, calendar reminders (via the connected calendar connector), and drafts the Sale Agreement.

---

## Step 1, Intake

**How to ask (applies to this whole command).** When a step needs more than three answers, collect them with the **AskUserQuestion tool**, never as a wall of separate text prompts. A new matter has many fields and asking them one at a time is overwhelming. Group related fields into popups (the tool takes up to four questions per popup) and pull option choices from the Airtable schema wherever a field is a select. For a free-text field (a name, an ID, a price, a date), put it in the popup and let the user type the answer. Names on LRA instruments must match the title register exactly: a mismatch is grounds for rejection at the Land Registry after stamp duty is paid. Never skip a field and never proceed with a blank field.

**Facts that may be unknown at opening.** The other side's advocates, a party's postal address, email or phone, the land area and the lease commencement date may genuinely not be known yet. Each of those questions carries a "Not known yet" option. A "Not known yet" answer is passed as `null` (never the word "Unknown") and prints as a dotted rule for completion by hand. Every other field is required.

Collect the intake as the grouped AskUserQuestion popups below (up to four questions each). Ask a follow-up popup only where an answer calls for it.

**Popup 1, whom the firm acts for, and the buyer**
- Which side does the firm act for in this matter? Options: The buyer (purchaser); The seller (vendor). Set `acting_for` to `"purchaser"` or `"vendor"`. This decides which side of the agreement carries the firm's own name and address, who the engagement letter and fee note are addressed to, and whose side every undertaking speaks for. Never assume it.
- Buyer type. Options: Individual; Company / Developer. (Drives the execution block: a company executes under its common seal by its officers.)
- Buyer full name(s), exactly as they will appear on the Transfer. (Typed.)
- Buyer identity. For an individual: National ID / Passport number and KRA PIN. For a company: its registration number and KRA PIN. (Typed.)

**Popup 2, the buyer's contact details** (and officers, for a company)
- Buyer postal address: P.O. Box and town. Options: Not known yet; type it.
- Buyer email and phone. Options: Not known yet; type them.
- Only if the buyer is a company: the officers who will execute under seal, each with their title. Options: Director and Director/Secretary; Two Directors; type the names and titles. (Typed names, in full. With none named, the block prints the two titled signature lines for completion by hand.)

**Popup 3, the seller**
- Seller type. Options: Individual; Company.
- Seller full name(s), exactly as on the current title. (Typed.)
- Seller identity: National ID / Passport number and KRA PIN, or for a company its registration number and KRA PIN. (Typed.)
- Seller postal address, email and phone. Options: Not known yet; type them. (For a company seller, ask for its executing officers in a follow-up popup, as for a company buyer.)

**Popup 4, the property**
- Property LR No. / Title No. / Plot No. (Typed.)
- Physical location: estate, road, town. (Typed.)
- Land area, with its unit. Options: Acres; Hectares; Not known yet. Then type the figure exactly as the advocate gives it (for example "2" acres, or "0.0465" hectares) and, if given, the figure in words. State acres as acres: the generator prints the figure as given and adds the exact hectare conversion itself (1 acre = 0.404686 ha, four decimal places). Never convert or round it yourself.
- Is the title charged (a bank or lender holds a charge over it)? Options: Not charged; Charged. If Charged, a follow-up popup asks: the chargee's name, exactly as on the register (typed), and "Is the charge to be redeemed on completion?" Options: Yes, redeemed on completion; No, redeemed before completion.

**Popup 5, tenure and money**
- Tenure. Options: Freehold; Leasehold.
  - If Leasehold, a follow-up popup asks: the term the lease was granted for, in years (for example 99; this is the original term, not the years remaining); the date the term runs from (Options: Not known yet; type it); and the lessor (Options: the Government of Kenya; a County Government; type another, such as a developer's head lease).
  - If Freehold, also ask: "Is the land agricultural (outside a municipality / town)?" Options: No, urban / within a town; Yes, agricultural. Set `is_agricultural`. This decides whether Land Control Board consent (Milestone 3) is required; skipping it on agricultural land voids the sale, so never assume.
- Purchase price (Kshs.). (Typed.)
- Deposit. Options: No deposit; Enter amount. (Type the figure.)
- Target completion date. (Typed. If none is given yet, the default Day 90 completion from Step 2 applies until the advocate confirms one, matching the sale agreement's ninety-day completion.)

**Popup 6, representation and ownership**
- Fee earner handling this matter. Options: the firm's existing Fee Earner choices read from Airtable, plus type a new name to add. (Required: the Matter Allocation view reads this.)
- The other side's advocates (the seller's advocates when the firm acts for the buyer, and the buyer's when it acts for the seller). Options: Not known yet; Enter firm name, postal address and email. The firm's own side is never asked: it is the firm.

Use all answers in every subsequent step.

---

## Step 2, Logic

Once intake is received:

### 2a, Tenure-based skip conditions

- If Freehold: Milestone 5 (Rent Clearance) = SKIPPED
- If Freehold and the land is **agricultural** (outside a municipality / town, `is_agricultural = true` from intake): Milestone 3 = **Land Control Board consent REQUIRED**. Apply within SIX MONTHS of the Agreement (s.8(1) Land Control Act); a controlled transaction without LCB consent is **void for all purposes**. Never skip Milestone 3 for agricultural freehold.
- If Freehold and NON-agricultural (`is_agricultural = false`): Milestone 3 (Consent) = SKIPPED.
- If Leasehold: Milestone 3 = NLC / lessor consent (not LCB); Milestone 5 = Required

### 2b, Calculate milestone target dates from the Instructions Date (Day 0)

| Milestone | Target Window | Calendar Day |
|---|---|---|
| 1, Instructions + Sale Agreement | Day 0 | Day 0 |
| 2, Official Search | Day 7 to 14 | Day 7 |
| 3, LCB / NLC Consent | Day 14 to 30 | Day 14 |
| 4, Rates Clearance | Day 14 to 30 | Day 14 |
| 5, Rent Clearance (leasehold only) | Day 14 to 30 | Day 14 |
| 6, Stamp Duty | Day 45 to 60 | Day 45 |
| 7, Transfer Documents | Day 60 to 70 | Day 60 |
| 8, Registration | Day 70 to 80 | Day 70 |
| 9, Completion | Day 90 | Day 90 or the target completion date |

Where a target completion date is given in Step 1, it becomes Milestone 9's date in place of the Day 90 default. The default is ninety days because the sale agreement makes completion due within ninety days of its execution, and in this schedule the agreement is signed at Day 0. Milestones 6 (Stamp Duty), 7 (Transfer Documents) and 8 (Registration) keep their Day 45, 60 and 70 defaults unless the target completion date falls before Day 80, in which case they move earlier so they stay 35, 20 and 10 days before completion respectively. Where no target completion date is given, use the default Day-N schedule above.

**Official Search Expiry:** Day 7 (official search lodgement date) + 30 days.

---

## Step 3, Airtable

Use the `airtable-conveyances` skill.

1. Create 1 record in **Conveyances** table with all party + property details. Set:
   - **Buyer** and **Seller** = the names exactly as given. **Title Number**, **Tenure**, **Purchase Price (Kshs)** and **Deposit Paid (Kshs)** from the intake.
   - **Buyer Advocate Firm / Email** and **Seller Advocate Firm / Email**: on the side the firm acts for, the firm's own name and email; on the other side, what the intake gave, or leave blank when it was "Not known yet". Never write the word "Unknown".
   - **Property Description** = `[physical location]; [area as given, e.g. 2 acres]` (just the location when the area is not known yet).
   - **Fee Earner** = the advocate captured in Step 1. The Conveyances table has a "Fee Earner" single-select field. If the chosen advocate is not yet one of its options, add them as a new choice before writing (so the record saves and the Matter Allocation view stays clean, never write a fee earner that is not an option). If the field is somehow absent, create it (single select) first. This is what the tracker's Matter Allocation view reads to show who is working on what.
   - **Target Completion** = the Completion Date computed in Step 2b.
   - **Notes** = the matter facts block below, one fact per line, exactly in this format, so that every later command reads the facts instead of asking again. Leave a line out only where it does not apply; write `not known` where the intake said "Not known yet".

     ```
     Completion basis: target completion date set by advocate   (or: default Day 90 completion, no target completion date set)
     Acting for: Buyer   (or: Seller)
     Area: 2 acres   (figure and unit exactly as given; or: not known)
     Area in words: two
     Agricultural: Yes   (or: No; freehold only)
     Charge: Test Bank Kenya; redeemed on completion: Yes   (or: Charge: none)
     Lease: 99 years from 1st January 1970; lessor: the Government of Kenya   (leasehold only; "from not known" if the date was not given)
     Buyer signatories: ANNE DIRECTOR (Director); BEN DIRECTOR (Director/Secretary)   (company buyer only)
     Seller signatories: ...   (company seller only)
     ```
2. Create one record in the **Parties** table for each party, each linked to this Conveyance through its **Conveyance** field, so no later document has to re-ask a name, an ID or an address:

   | Party | Party Name | Role | ID / PIN | Email | Phone | Address |
   |---|---|---|---|---|---|---|
   | the buyer | as given | Buyer | `ID: 22222222; PIN: A000000001T`, or for a company `Company Reg. No.: PVT-TEST123; PIN: P000000001X` | as given | as given | P.O. Box and town, one per line |
   | the seller | as given | Seller | same format | as given | as given | as given |
   | the chargee (only if charged) | the chargee's name | Mortgagee | blank | blank | blank | blank |

   Leave a cell blank where the intake said "Not known yet". Read each record back and confirm it is linked to the Conveyance. The `Company Reg. No.:` prefix is how later commands know a party is a company, so use it exactly.
3. Create 9 records in **Milestones** table linked to the Conveyance (one per milestone). Set each **Target Date** from Step 2b. Set Status = "Pending" for active milestones and "Skipped" for any skipped milestones. Set Official Search Expiry on Milestone 2.

---

## Step 4, Calendar reminders

These are statutory deadlines that carry negligence exposure if missed, so diary every active milestone.

**Pre-flight:** confirm a calendar connector is connected in CoWork (it exposes a create-event tool such as `create_event`). If none is connected, do NOT silently skip and do NOT claim reminders were created: tell the user "No calendar is connected, so here are the nine deadline dates to add to your diary," output the dated list, and continue.

**Only create events for milestones that are NOT skipped.** Do not create an event for any milestone whose Status was set to "Skipped" in Step 3.

For each active (non-skipped) milestone, create a calendar event via the connected calendar connector's create-event tool:
- Title (summary): `[Matter Name], Milestone [#]: [Milestone Type]`
- Start: the target date from Step 2 at 07:00, timezone Africa/Nairobi
- Reminders: a popup 7 days before and 1 day before (e.g. `overrideReminders: [{method:'popup', minutes:10080}, {method:'popup', minutes:1440}]`)
- Save the returned event ID back to the Milestone record (Calendar Event ID). If a call errors, quote it, list that milestone's date for manual entry, and carry on.

**On Microsoft 365** the tool is `outlook_create_event`. Pass the time zone `Africa/Nairobi` explicitly and end the event at 07:30. Outlook keeps ONE reminder per event (`reminderMinutesBeforeStart`): use 10080 (7 days before) for milestones and say once that each carries a single 7-day reminder. The tool appears only once the firm has turned on connector write actions, and even then a call can be refused if the firm's Microsoft 365 (Entra) admin has not consented to the write scopes.

**A write refused for permissions** (for example the connection holds `Calendars.Read` but not `Calendars.ReadWrite`, or the reply is "access denied"): do not try the remaining milestones. Give the full dated list once and say "Your firm's administrator needs to re-approve the calendar connector for write access." Do not walk the advocate through the admin console themselves.

Create 1 additional reminder:
- Title: `[Matter Name], OFFICIAL SEARCH EXPIRES`
- Start: the Official Search Expiry date at 07:00
- Reminders: popups 7 days, 3 days, and 1 day before.

**Which calendar:** the firm is on Microsoft 365, so the command writes to each person's own Outlook calendar through the Microsoft 365 connector. There is no plugin-bundled calendar server, so it never silently writes to a dead endpoint.

---

## Step 5, Draft Opening Documents

Generate the opening documents for this matter: Sale Agreement, Engagement Letter, and Fee Note.

**Sign in first (who signs the opening documents, once for all of them).** Letters and engagement letters carry the signing advocate's own name and P.105 number, read from the firm directory, the **Team Members** table of the conveyancing base, never from memory and never from another advocate's record. Sign in for every document, even ones that do not name the advocate; the generator uses the block only where a document is signed.

1. **Sign in.** Create one record in the **Sign-ins** table of the conveyancing base: `Task` = `new-conveyance: [document type]`, `Document Type` = `[document type]`. Airtable stamps it with the account that created it.
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

The generator refuses to write a signed document without this block or with a P.105 in the wrong form, and it never falls back to the firm partner's details. If it prints `REFUSED:`, do not retry with the same data: read the reason, which names its own fix, and pass it to the user (see the table at the end of 5c).

**5a, Sale Agreement**

Convert all amounts to both figures and words. The balance = purchase price minus deposit; with no deposit, the balance is the purchase price and the two deposit fields are `null`. Every value comes from the Step 1 answers; a "Not known yet" answer is `null`, never the word "Unknown" and never an empty string standing for a fact.

**The two advocates' fields follow `acting_for`.** The generator prints the firm's own name and address on the side it acts for, from the firm configuration, so leave that side's two fields `null`. Fill only the other side's advocates, from Popup 6, or `null` if not known yet. Never put the firm's name on the other side.

**Parties.** For an individual: name, `_id`, `_po_box`, `_town`, `_is_company: false`. For a company: name, `_reg_no` (its registration number), `_is_company: true`, `_po_box`, `_town`, and `_directors`, the officers who execute under seal as `{ "name", "title" }` (title `Director`, `Director/Secretary` or `Secretary`), or `[]` if none were named. A company registration number goes in `_reg_no`, never in `_id`.

Write to `/tmp/conveyancing-doc-data.json`:
```json
{
  "doc_type": "sale_agreement",
  "date": "[today in format: 22nd March 2026]",
  "acting_for": "[purchaser or vendor, from Popup 1]",
  "vendor_name": "[SELLER FULL NAME IN CAPS]",
  "vendor_is_company": [true / false],
  "vendor_id": "[Seller ID number, individual only, else null]",
  "vendor_reg_no": "[Seller company registration number, company only, else null]",
  "vendor_directors": [],
  "vendor_po_box": "[Seller P.O. Box, e.g. 1-00100, or null]",
  "vendor_town": "[Seller town, or null]",
  "vendor_capacity": null,
  "purchaser_name": "[BUYER FULL NAME IN CAPS]",
  "purchaser_is_company": [true / false],
  "purchaser_id": "[Buyer ID number, individual only, else null]",
  "purchaser_reg_no": "[Buyer company registration number, company only, else null]",
  "purchaser_directors": [{ "name": "[OFFICER NAME]", "title": "Director" }, { "name": "[OFFICER NAME]", "title": "Director/Secretary" }],
  "purchaser_po_box": "[Buyer P.O. Box, or null]",
  "purchaser_town": "[Buyer town, or null]",
  "property_lr_no": "[LR No. / Title No. exactly as stated]",
  "property_location": "[Physical location from intake]",
  "property_area_figures": "[area figure exactly as given, e.g. 2, or null]",
  "property_area_words": "[area in words, e.g. two, or null]",
  "property_area_unit": "[acres or hectares, as given, or null]",
  "tenure": "[freehold or leasehold]",
  "is_leasehold": [true if tenure is leasehold, else false; never hard-code it],
  "lease_term_years": "[leasehold: the term granted, e.g. 99; null if freehold]",
  "lease_start_date": "[leasehold: the date the term runs from, e.g. 1st January 1970, or null if not known]",
  "lessor": "[leasehold: who granted the lease, e.g. the Government of Kenya; null if freehold]",
  "purchase_price_words": "[amount in words]",
  "purchase_price_figures": "[amount in figures with commas]",
  "deposit_words": "[deposit in words, or null if no deposit]",
  "deposit_figures": "[deposit in figures, or null if no deposit]",
  "balance_words": "[balance in words]",
  "balance_figures": "[balance in figures]",
  "completion_date": "[target completion date in format: 20th June 2026]",
  "vendor_advocate_firm": "[null if acting_for is vendor; else the seller's advocates from Popup 6, or null]",
  "vendor_advocate_address": "[null if acting_for is vendor; else their postal address, or null]",
  "purchaser_advocate_firm": "[null if acting_for is purchaser; else the buyer's advocates from Popup 6, or null]",
  "purchaser_advocate_address": "[null if acting_for is purchaser; else their postal address, or null]",
  "is_agricultural": [true / false, from the Step 1 agricultural question; never hard-code],
  "is_charged": [true / false, from Popup 4; never hard-code],
  "chargee_name": "[the chargee exactly as on the register, or null if not charged]",
  "charge_redeemed_on_completion": [true / false, from Popup 4; null if not charged],
  "include_spousal_consent": true
}
```

For individual parties, drop `_directors` (or leave it `[]`) and `_reg_no`. Add the `advocate` block from the sign-in step. The generator prints the discharge of charge as a completion document naming the chargee, prints the area as given with its hectare conversion, and refuses a leasehold with no `lease_term_years` or `lessor`, a `tenure` that contradicts `is_leasehold`, a chargee on a title marked not charged, or the firm's own name on the other side. Each refusal names the field; go back to the advocate for it.

Filename: `[seller-slug]-[buyer-slug]-sale-agreement-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[sale-agreement-filename].docx
```

**5b, Engagement Letter**

**What this produces.** The firm's letter of engagement: the eleven-clause letter (Terms of Engagement through Acceptance of Terms) on the firm's letterhead, signed by the firm partner, with the advocate running this command named in the Communication clause as the assisting advocate. It carries no fee table and no bank details; the fee note (5c) does that. The same letter is available on its own through `/draft-engagement-letter`, which also takes a custom background, scope and fee wording.

**The client is the side the firm acts for.** Pass `acting_for` and set `client_name` to that party (the buyer when acting for the purchaser, the seller when acting for the vendor), with `client_address_lines` from their postal address. The standard background and scope describe a purchase. When the firm acts for the seller, ask the advocate for the scope of the firm's work on the sale and pass it as `scope` (one item per entry) with a `background` sentence describing the sale; the generator refuses a vendor-side letter without them rather than engage the seller on purchase terms.

**Ask the fee earner for the legal fee for this matter.** The firm sets its own fee (its charging method / the Advocates' Remuneration Order as the firm applies it). Do NOT invent or compute a fee from a scale the plugin does not hold; the plugin has no ARO scale embedded. Once the fee earner gives the figure, compute VAT at 16% of it and add the firm's disbursements (the generator hard-fails if VAT is not 16% of the fee). The letter states the fee as "Kshs. [legal_fees] (exclusive of VAT and disbursements)"; the VAT and disbursement figures feed the fee note. Write to `/tmp/conveyancing-doc-data.json` (add the `advocate` block from the sign-in step, exactly as in 5a):

```json
{
  "doc_type": "engagement_letter",
  "date": "[today in format: 22nd March 2026]",
  "ref": "[firm ref, e.g. CONV/2026/001]",
  "salutation": "Dear Sir/Madam,",
  "acting_for": "[purchaser or vendor]",
  "client_name": "[the client: the buyer if acting for the purchaser, the seller if acting for the vendor]",
  "client_address_lines": ["[P.O. Box]", "[TOWN]"],
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

For a vendor-side letter add `"background": ["[one sentence describing the sale]"]` and `"scope": ["[item]", "[item]"]` as the advocate gives them.

Filename: `[seller-slug]-[buyer-slug]-engagement-letter-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[engagement-letter-filename].docx
```

**5c, Fee Note**

Runs on every matter. Use the same fee amounts as the Engagement Letter, and address it to the same client.

**Before writing the fee note, read the firm's account from the directory.** Read the **Firm Settings** table of the conveyancing base and put its rows into the data file as the `firm_bank` block below, every value copied exactly (keep leading zeros in the account number). If `bank_account_no` is blank or the table does not exist, stop and say: "The firm's bank account is not recorded yet, so a fee note would not tell the client where to pay. Run `/setup-conveyancing` and answer step 4g, then try again." Do not type an account number from memory, from an old document, or from anything a client sent. An account number on a fee note moves money. The account never comes from `scripts/firm-config.json`: the plugin directory is read only at the client.

`fee_note_total` must equal legal fees + VAT + office disbursements + statutory disbursements; the generator refuses a total that is not the sum of its lines, and prints every amount with thousands separators.

Write to `/tmp/conveyancing-doc-data.json` (add the `advocate` block from the sign-in step, exactly as in 5a):

```json
{
  "doc_type": "fee_note",
  "date": "[today in format: 22nd March 2026]",
  "ref": "[firm ref, e.g. CONV/2026/001]",
  "client_name": "[the client, as in 5b]",
  "client_address_lines": ["[P.O. Box]", "[TOWN]"],
  "property_lr_no": "[LR No.]",
  "legal_fees": [same as engagement letter],
  "legal_fees_vat": [same as engagement letter],
  "disbursements_office": [office expenses portion],
  "disbursements_statutory": [statutory fees portion],
  "fee_note_total": [sum of all four],
  "firm_bank": {
    "bank_account_name": "[Firm Settings: bank_account_name]",
    "bank_name": "[Firm Settings: bank_name]",
    "bank_account_no": "[Firm Settings: bank_account_no]",
    "bank_branch": "[Firm Settings: bank_branch]"
  }
}
```

Leave `client_address_lines` as `[]` when the client's postal address is not known yet.

Filename: `[seller-slug]-[buyer-slug]-fee-note-[YYYY-MM-DD].docx`

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/conveyancing-doc-data.json /sessions/${SESSION_ID}/mnt/outputs/[fee-note-filename].docx
```

If the generator prints `REFUSED:`, do not retry with the same data. Each refusal names its own fix:

| The refusal says | What to do |
|---|---|
| the `advocate` block is missing, or the P.105 is in the wrong form | the signing identity did not come from the directory: run `/setup-conveyancing`, then sign in again |
| the firm has no bank account on file | the `firm_bank` block is missing or `bank_account_no` is blank: read Firm Settings and pass it; if Firm Settings has no account, the fix is `/setup-conveyancing` step 4g |
| a field is missing or contradicts another (`lease_term_years`, `lessor`, `is_leasehold`, `is_charged`, `acting_for`, `balance_words`, `fee_note_total`, `scope`) | go back to the advocate for that fact; never supply it yourself |

Any other error: read it, fix the JSON, and retry.

Run the **Format Verification** check from the `conveyance-document-drafter` skill on all three documents before closing this step.

**5d, Record the documents in Airtable**

Using the `airtable-conveyances` skill, create one record in the **Documents** table for each document actually generated, so every document the system produces has a row from day one (the same step `/draft-conveyance-doc` performs at its Step 4):

| Document | Document Type | Linked to | Status |
|---|---|---|---|
| Sale Agreement | Sale Agreement | this Conveyance + Milestone 1 (Instructions + Sale Agreement) | Drafting |
| Engagement Letter | Engagement Letter | this Conveyance | Drafting |
| Fee Note | Fee Note | this Conveyance | Drafting |

For each record: set **Document Name** = `[Document Type], [Matter Name]`, link the **Conveyance** (and the **Milestone** where shown), and **Status** = "Drafting". Write with **typecast enabled** so that "Engagement Letter" and "Fee Note" are created as Document Type options automatically if they do not exist yet (never let a write fail on a missing select option). When the firm later uploads a signed copy to its document store, paste its URL into the document's **Document Link** field; the `.docx` itself stays a CoWork download, Airtable holds the record and the link.

Present the download link for every document generated.

---

## Step 6, Output Summary

```
NEW CONVEYANCE OPENED

Matter: [Seller name] / [Buyer name] - [LR No.]
Purchase Price: Kshs. [AMOUNT]
Deposit Paid: Kshs. [AMOUNT]
Balance Due: Kshs. [AMOUNT]
Target Completion: [DATE]
Completion Basis: [e.g. "target completion date set by advocate", or "default Day 90 completion, no target completion date set"]
Tenure: [Freehold / Leasehold]
Fee Earner: [advocate handling the matter]

MILESTONE SCHEDULE
1. Instructions + Sale Agreement     [DATE] (today)
2. Official Search                   [DATE] (expires [EXPIRY DATE])
3. [LCB Consent / NLC Consent / SKIPPED]  [DATE]
4. Rates Clearance                   [DATE]
5. [Rent Clearance / SKIPPED, freehold]  [DATE]
6. Stamp Duty                        [DATE]
7. Transfer Documents                [DATE]
8. Registration                      [DATE]
9. Completion                        [DATE]

Calendar: [X active milestone events, exclude skipped] + 1 search expiry alert created (or listed for manual entry if no calendar is connected)
Airtable: Conveyance record (matter facts in Notes) + [N] Parties records + 9 Milestone records + 3 Document records created
Sale Agreement: [filename].docx
Engagement Letter: [filename].docx
Fee Note: [filename].docx
```

Present the download link for every document generated.

With the AskUserQuestion tool, ask: "Any changes to these documents?" Options: All good, proceed; Yes, I will specify. If they choose to specify, ask what to update and regenerate.
