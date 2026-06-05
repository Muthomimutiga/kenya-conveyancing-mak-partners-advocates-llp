---
name: airtable-conveyances
description: >
  Handles all reads and writes to the Kenya Conveyancing Manager Airtable base.
  Creates and updates Conveyance records, Milestone records, Party records, and
  Document records. Triggered by all five conveyancing commands.
version: 0.1.0
---

# Airtable — Kenya Conveyancing Manager

This skill manages the Airtable base that stores all conveyancing matter data.

Full Airtable schema: `references/airtable-setup.md`

---

## Base

**Base name:** Kenya Conveyancing Manager (separate from Kenya Litigation Manager)

Before any operation: use `search_bases` to find the base, then `list_tables_for_base` to get table and field IDs. Never guess IDs.

---

## Common Operations

### Create new Conveyance record

1. `search_bases` for "Kenya Conveyancing Manager"
2. `list_tables_for_base` to get Conveyances table ID and all field IDs
3. `create_records_for_table` with all fields from intake

Required fields at creation:
- Matter Name (format: "[Seller surname] / [Buyer surname] — LR [LR No.]")
- Buyer, Seller
- Property Description, Title Number
- Tenure (Freehold / Leasehold)
- Purchase Price, Deposit Paid
- Instructions Date
- Target Completion
- Current Milestone = "Instructions + Sale Agreement"
- Status = "Active"

### Create Milestone records (9 records per Conveyance)

Link each Milestone record to the Conveyance via the Conveyance link field. Set:
- Milestone Type (from single select)
- Target Date (calculated per milestone-logic.md)
- Status = "Pending" (or "Skipped" where applicable)
- Official Search Expiry: set only for Milestone 2 (Target Date + 30 days)

### Update Milestone on completion

`update_records_for_table`:
- Status → "Completed"
- Completed Date → actual date provided

Then update the Conveyance's Current Milestone field to the next milestone in sequence.

### Create Document record

`create_records_for_table` in Documents table:
- Document Name: "[Document Type] — [Matter Name]"
- Document Type (from single select)
- Link to Conveyance and Milestone
- Status: "Drafting" on creation; update to "Sent" or "Filed" after action
- Write with **typecast enabled** so a Document Type not yet in the single select (e.g. Engagement Letter, Fee Note) is created automatically instead of failing the write.

Called by `/draft-conveyance-doc` (each drafted document) and `/new-conveyance` (its three opening documents — Sale Agreement, Engagement Letter, Fee Note), so every document the system produces is recorded.

---

## Error Handling

- If a base or table is not found: tell Robin to check that the Kenya Conveyancing Manager base exists and has been shared with the Airtable API key.
- If a field ID is not found: re-run `list_tables_for_base` — do not guess field IDs.
- If a record update fails: report the error and the record ID so Robin can investigate directly.
