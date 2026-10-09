# Airtable Setup Guide: Kenya Conveyancing Manager

Follow these steps to create your Kenya Conveyancing Manager Airtable base from scratch.

## Step 1: Create a New Base

1. Go to airtable.com and sign in
2. Click **+ Create a base** → Start from scratch
3. Name it: **Kenya Conveyancing Manager**

## Step 2: Create Each Table

Delete the default "Table 1" and create the following tables in order.

---

### Table: Conveyances

| Field Name | Field Type | Options |
|---|---|---|
| Matter Name | Single line text | (primary field) Format: "[Seller surname] / [Buyer surname] - LR [LR No.]" |
| Buyer | Single line text | |
| Seller | Single line text | |
| Buyer Advocate Firm | Single line text | |
| Buyer Advocate Email | Email | |
| Seller Advocate Firm | Single line text | |
| Seller Advocate Email | Email | |
| Property Description | Single line text | |
| Title Number | Single line text | |
| Tenure | Single select | Freehold; Leasehold |
| Lease Term Remaining | Number | Years remaining |
| Purchase Price (Kshs) | Currency | |
| Deposit Paid (Kshs) | Currency | |
| Instructions Date | Date | DD/MM/YYYY |
| Target Completion | Date | DD/MM/YYYY |
| Actual Completion | Date | DD/MM/YYYY |
| Current Milestone | Single select | Instructions; Official Search; Consent; Rates Clearance; Rent Clearance; Stamp Duty; Transfer Docs; Registration; Completion (NOTE: these are the SHORT option names. Map milestone 1 → "Instructions", milestone 3 → "Consent", milestone 7 → "Transfer Docs" when writing this field. Do not write the long Milestone Type names here.) |
| Status | Single select | Active; Completed; Stalled; Cancelled |
| Fee Earner | Single select | The firm's fee earners (e.g. Advocate A; Advocate B). Drives the tracker's Matter Allocation view, who is working on what. Seed with your advocates' names. |
| Document Folder URL | URL | The firm's document store matter folder |
| Notes | Long text | |
| Milestones | Link to another record | → Milestones table |
| Parties | Link to another record | → Parties table |
| Documents | Link to another record | → Documents table |

---

### Table: Milestones

| Field Name | Field Type | Options |
|---|---|---|
| Milestone Ref | Single line text | (primary field) Format: "[Matter Name] - M[1-9]" |
| Conveyance | Link to another record | → Conveyances table |
| Milestone Type | Single select | Instructions + Sale Agreement; Official Search; LCB / NLC Consent; Rates Clearance; Rent Clearance; Stamp Duty; Transfer Documents; Registration; Completion |
| Target Date | Date | Include time: No |
| Completed Date | Date | Include time: No |
| Status | Single select | Pending; In Progress; Completed; Overdue; Skipped |
| Official Search Expiry | Date | Milestone 2 only: provisional Target Date + 30 days at intake, reset to Completed Date + 30 days when the search is done |
| Calendar Event ID | Single line text | |
| Notes | Long text | |
| Documents | Link to another record | → Documents table |

---

### Table: Parties

| Field Name | Field Type | Options |
|---|---|---|
| Party Name | Single line text | (primary field) |
| Conveyance | Link to another record | → Conveyances table |
| Role | Single select | Buyer; Seller; Mortgagee; Guarantor; Beneficiary |
| ID / PIN | Single line text | |
| Email | Email | |
| Phone | Phone number | |
| Address | Long text | |

---

### Table: Documents

| Field Name | Field Type | Options |
|---|---|---|
| Document Name | Single line text | (primary field) |
| Conveyance | Link to another record | → Conveyances table |
| Document Type | Single select | Sale Agreement; Engagement Letter; Fee Note; LRA 33 Transfer; LRA 63 Transfer of Lease; LRA 58 Discharge; Completion Notice; Undertaking Letter; Requisitions on Title; Consent Application; Rates Clearance; Official Search; Client Update; Other (the opening Engagement Letter and Fee Note are written by /new-conveyance with typecast, so they auto-create if missing) |
| Milestone | Link to another record | → Milestones table |
| Status | Single select | Drafting; Ready; Sent; Filed; Registered |
| Document Link | URL | The firm's document store link |
| Date Created | Date | |
| Date Sent / Filed | Date | |

---

### Table: Team Members

| Field Name | Field Type | Options |
|---|---|---|
| Name | Single line text | (primary field) |
| Email | Email | |
| Role | Single select | Partner; Senior Associate; Associate; Paralegal; Secretary |
| P.105 Number | Single line text | |
| LSK Practice Number | Single line text | |
| Practice Year | Number | |
| Airtable Login | Email | |
| Active | Checkbox | |

---

### Table: Sign-ins

| Field Name | Field Type | Options |
|---|---|---|
| Task | Single line text | (primary field) |
| Document Type | Single line text | |
| Signed As | Link to another record | → Team Members table |
| Signed In By | Created by | |
| When | Created time | |

---

### Table: Firm Settings

| Field Name | Field Type | Options |
|---|---|---|
| Key | Single line text | (primary field) One row per firm-level setting |
| Value | Single line text | |

Seed four rows with the keys `bank_account_name`, `bank_name`, `bank_account_no`, `bank_branch` and leave the values blank; `/setup-conveyancing` fills them in once for the whole firm.

In the Documents table, the Status options also include **Drafted**, used when a client update is drafted but no mail connector is available to send it.

---

## Faster route: copy the ready-made base

Robin Advisory Group keeps a ready-made copy of this base with every table, field and link already in place. Open the share link RAG sends you, choose **Copy base**, pick the firm's workspace, and rename the copy **Kenya Conveyancing Manager**. Then share it with every fee earner (Editor) and run `/setup-conveyancing`; setup finds it by name.

## Step 3: Connect Airtable to Claude

No tokens or environment variables are needed. Each person opens **Settings > Connectors** in Claude, connects **Airtable**, and signs in with their own Airtable account. Their access to the base is whatever the base's sharing gives them, so the one shared base must be shared with every fee earner in Airtable.

## Step 4: Fix the Status field on Conveyances (only if you built the base by hand)

If Airtable created a default Status field with Todo/In Progress/Done choices, change the choices to: **Active; Completed; Stalled; Cancelled**.
