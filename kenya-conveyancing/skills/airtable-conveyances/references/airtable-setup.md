# Airtable Setup Guide — Kenya Conveyancing Manager

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
| Matter Name | Single line text | (primary field) Format: "[Seller surname] / [Buyer surname] — LR [LR No.]" |
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
| Fee Earner | Single select | The firm's fee earners (e.g. Ken Ashimosi; Ann Wayodi). Drives the tracker's Matter Allocation view — who is working on what. Seed with your advocates' names. |
| Project | Single line text | Developer project slug for off-plan matters (e.g. royal_suburb_1, tsavo_skywalk). Blank for individual sales. Set by /new-conveyance. |
| Document Folder URL | URL | OneDrive / SharePoint matter folder |
| Notes | Long text | |
| Milestones | Link to another record | → Milestones table |
| Parties | Link to another record | → Parties table |
| Documents | Link to another record | → Documents table |

---

### Table: Milestones

| Field Name | Field Type | Options |
|---|---|---|
| Milestone Ref | Single line text | (primary field) Format: "[Matter Name] — M[1-9]" |
| Conveyance | Link to another record | → Conveyances table |
| Milestone Type | Single select | Instructions + Sale Agreement; Official Search; LCB / NLC Consent; Rates Clearance; Rent Clearance; Stamp Duty; Transfer Documents; Registration; Completion |
| Target Date | Date | Include time: No |
| Completed Date | Date | Include time: No |
| Status | Single select | Pending; In Progress; Completed; Overdue; Skipped |
| Official Search Expiry | Date | Set only for Milestone 2 (Target Date + 30 days) |
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
| Document Link | URL | OneDrive / SharePoint document link |
| Date Created | Date | |
| Date Sent / Filed | Date | |

---

## Step 3: Get Your API Credentials

1. Go to **airtable.com/create/tokens**
2. Click **Create new token**
3. Name: "Kenya Conveyancing Manager — Claude"
4. Scopes: Select `data.records:read` and `data.records:write`
5. Access: Select your **Kenya Conveyancing Manager** base
6. Click **Create token** and copy it

## Step 4: Get Your Base ID

1. Go to **airtable.com/api**
2. Select your **Kenya Conveyancing Manager** base
3. Find your Base ID in the Introduction section — it starts with `app...`
4. Copy it

## Step 5: Configure the Plugin

In your CoWork settings, set these environment variables:
- `AIRTABLE_API_KEY` → your personal access token from Step 3
- `AIRTABLE_BASE_ID` → your base ID from Step 4

## Step 6: Fix the Status field on Conveyances

Airtable creates a default Status field with Todo/In Progress/Done choices. Open the Status field on the Conveyances table and change the choices to: **Active; Completed; Stalled; Cancelled**.
