---
name: airtable-conveyances
description: >
  Handles all reads and writes to the Kenya Conveyancing Manager Airtable base.
  Creates and updates Conveyance records, Milestone records, Party records,
  Document records, Team Members and Sign-ins. Triggered by every conveyancing
  command that reads or persists matter data: /new-conveyance,
  /draft-conveyance-doc, /draft-letter, /draft-engagement-letter,
  /complete-milestone, /conveyance-status, /send-client-update and
  /setup-conveyancing.
version: 0.3.0
last_verified: 2026-09-23
freshness_window: 365d
freshness_category: stable
verified_against: "The Kenya Conveyancing Manager base schema in references/airtable-setup.md (a base layout, not law); Airtable MCP tool names as at 2026-09-23"
---

# Airtable: Kenya Conveyancing Manager

Audience: the firm's conveyancing team, reached through the five conveyancing commands; this skill is the persistence layer, not directly user-facing. Work shape: bounded-transactional reads and writes that persist what the calling command decides, never a legal or scheduling judgment of its own.

This skill manages the Airtable base that stores all conveyancing matter data.

Full Airtable schema: `references/airtable-setup.md`

**Delegation threshold.** The calling command decides what a record should say; this
skill decides only how to write it. It never supplies a value the caller did not give,
never infers a milestone date, a tenure, or a party, and never completes a record to make
a write succeed.

**Confidence bands.**

- High: the base, the table and every field ID have been read back this session with
  `search_bases` and `list_tables_for_base`, and the caller supplied every required
  field. Write it.
- Medium: a field ID, a single-select option, or a linked record is ambiguous, or the
  caller's value does not match an existing option. Surface exactly which one and ask
  before writing. Typecast will create a new single-select option silently, so a value
  that is not already in the list is a medium-confidence write, not a high one.
- Low: the caller's value conflicts with what is already in the record, a required field
  is missing, or the base does not look like the Kenya Conveyancing Manager base. Do not
  write. Name the conflict and hand back to the advocate.

Never write at uniform confidence, and never write a partial record to keep a command
moving.

**Accountability.** Every write persists a fact an advocate is answerable for. The
advocate or the calling command confirms the content before it is written; this skill
does not treat its own reconstruction of a record as confirmation, and it reports back
what it actually wrote, by record id, so the advocate can check it.

---

## Base

**Base name:** Kenya Conveyancing Manager (separate from Kenya Litigation Manager)

Before any operation: use `search_bases` to find the base, then `list_tables_for_base` to get table and field IDs. Never guess IDs.

---

## Confidentiality and Data Handling

This base holds privileged client matter data and party personal data (names, ID/PIN, email, phone, address) under advocate-client confidentiality (Evidence Act, Cap 80, sections 134 to 137) and the Data Protection Act 2019. Write only to the firm's own Kenya Conveyancing Manager base through the firm's own token scoped to `data.records:read` and `data.records:write` on that base. Do not copy party data anywhere outside the base and do not widen the token scope.

---

## Common Operations

### Create new Conveyance record

1. `search_bases` for "Kenya Conveyancing Manager"
2. `list_tables_for_base` to get Conveyances table ID and all field IDs
3. `create_records_for_table` with all fields from intake

Required fields at creation:
- Matter Name (format: "[Seller surname] / [Buyer surname] - LR [LR No.]")
- Buyer, Seller
- Property Description, Title Number
- Tenure (Freehold / Leasehold)
- Purchase Price, Deposit Paid
- Instructions Date
- Target Completion
- Current Milestone = "Instructions" (the SHORT option name; the long Milestone Type names are not valid options on this field)
- Status = "Active"

### Matter facts and Parties (written by /new-conveyance, read by every later command)

- **Conveyance Notes** carries the matter facts block (Acting for, Area, Agricultural, Charge, Lease, signatories), one fact per line, in the exact format set out in `/new-conveyance` Step 3. Read it before asking the advocate anything.
- **Parties** holds one record per buyer, seller and chargee, linked to the Conveyance. Role is Buyer, Seller or Mortgagee. ID / PIN reads `ID: ...; PIN: ...`, or for a company `Company Reg. No.: ...; PIN: ...`; that prefix is how a company is recognised. Address holds the P.O. Box and town.
- When a document needs a party fact, read Parties first, then the Notes block, and ask only for what is still missing. Write what the advocate supplies back to the same record so it is not asked again.

### Create Milestone records (9 records per Conveyance)

Link each Milestone record to the Conveyance via the Conveyance link field. Set:
- Milestone Type (from single select)
- Target Date (calculated per milestone-logic.md)
- Status = "Pending" (or "Skipped" where applicable)
- Official Search Expiry: set only for Milestone 2. At intake it is provisional (Target Date + 30 days); when Milestone 2 is completed it is reset to Completed Date + 30 days, which is the date that matters.

### Update Milestone on completion

`update_records_for_table`:
- Status → "Completed"
- Completed Date → actual date provided

Then update the Conveyance's Current Milestone field to the next milestone in sequence.

### Create Document record

`create_records_for_table` in Documents table:
- Document Name: "[Document Type] - [Matter Name]"
- Document Type (from single select)
- Link to Conveyance and Milestone
- Status: "Drafting" on creation; update to "Sent" or "Filed" after action
- Write with **typecast enabled** so a Document Type not yet in the single select (for example, one the firm has not yet added to the choice list; the setup guide already seeds Engagement Letter and Fee Note) is created automatically instead of failing the write. Typecast also means a mistyped Document Type silently creates a new option, so validate the string before writing.

Called by `/draft-conveyance-doc` (each drafted document) and `/new-conveyance` (its opening documents: Sale Agreement, Engagement Letter, Fee Note), so every document the system produces is recorded. Create a row only for a document that was actually generated.

---

## Example

Input from `/new-conveyance` after intake: seller "John Kamau", buyer "Mary Wanjiru", LR No. 209/1234, Freehold, non-agricultural, purchase price Kshs. 8,000,000, deposit Kshs. 800,000, instructions date 1 July 2026, fee earner Amina Otieno.

Expected writes:
- 1 **Conveyance** record: Matter Name "Kamau / Wanjiru - LR 209/1234", Buyer "Mary Wanjiru", Seller "John Kamau", Tenure "Freehold", Purchase Price 8,000,000, Deposit Paid 800,000, Current Milestone "Instructions + Sale Agreement", Status "Active".
- 9 **Milestone** records linked to the Conveyance, one per milestone. Milestone 3 (Consent) and Milestone 5 (Rent Clearance) are set to Status "Skipped" (freehold, non-agricultural); the remaining seven are set to "Pending" with their calculated Target Dates.
- 3 **Document** records once the opening documents are drafted: "Sale Agreement - Kamau / Wanjiru - LR 209/1234" (linked to Milestone 1), "Engagement Letter - Kamau / Wanjiru - LR 209/1234", and "Fee Note - Kamau / Wanjiru - LR 209/1234" (both linked to the Conveyance only), each with Status "Drafting".

---

## What This Skill Does NOT Do

- Does not calculate milestone dates or apply tenure-based skip conditions. That logic lives in the `conveyancing-cycle` skill; this skill only writes the dates and statuses it is given.
- Does not draft or format documents. That is `conveyance-document-drafter` and the commands that call it.
- Does not make legal determinations, including tenure, consent type, or agricultural status. It writes only the values the calling command supplies.
- Does not touch the Kenya Litigation Manager base. The two matter databases are separate.

---

## Escalation

Stop and route to the advocate when: the base, a table or a field cannot be found after
a fresh `list_tables_for_base`; a required field the caller did not supply is needed to
write a record; a value conflicts with what the record already holds; a write would
create a single-select option the firm has not defined; the matter the caller names does
not exist or more than one matches; or the token is rejected or refuses a scope. Say what
was attempted, what came back, and which record id it concerned. Never guess an id,
never widen the token scope, and never write around the failure.

---

## Ownership and Review

Owner: Robin Advisory Group (plugin.json). Re-review when the Airtable base schema
changes, when the Airtable MCP tool names change, and in any case within the freshness
window declared in the frontmatter.

---

## Error Handling

- If a base or table is not found: tell the user to check that the Kenya Conveyancing Manager base exists and has been shared with the Airtable API key.
- If a field ID is not found: re-run `list_tables_for_base`; do not guess field IDs.
- If a record update fails: report the error and the record ID so the user can investigate directly.
- If a required field is missing from the caller: halt and report which field is missing; never write a partial Conveyance, Milestone, Party, or Document record silently.
