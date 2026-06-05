# Token Map — The Conveyancing Tracker

All tokens follow the `__UPPER_SNAKE_CASE__` convention. `apply-ids.js` performs a
global string-replace; any unmapped token causes an error so no placeholder reaches
production.

---

## Core kit tokens (required by every plugin)

| Token | Source | Description |
|---|---|---|
| `__AT_SERVER_UUID__` | MCP tool list | Airtable server UUID |
| `__GCAL_SERVER_UUID__` | MCP tool list | Google Calendar UUID, or `__GCAL_UUID_ABSENT__` |
| `__GMAIL_SERVER_UUID__` | MCP tool list | Gmail UUID, or `__GMAIL_UUID_ABSENT__` |
| `__FIRM_NAME__` | Firm config | Display name shown in the masthead |
| `__BRIEF_TZ__` | Firm config | IANA timezone (default: `Africa/Nairobi`) |

---

## Conveyancing base and table tokens

| Token | Description |
|---|---|
| `__CONV_BASE_ID__` | Airtable base ID for the conveyancing base (format: `appXXXXXXXXXXXXXX`) |
| `__CONV_CONVEYANCES_TBL__` | Table ID for the Conveyances table (format: `tblXXXXXXXXXXXXXX`) |
| `__CONV_MILESTONES_TBL__` | Table ID for the Milestones table (format: `tblXXXXXXXXXXXXXX`) |

---

## Conveyances table field tokens (`__CONV_F_CVY_*__`)

| Token | Field name | Type | Description |
|---|---|---|---|
| `__CONV_F_CVY_NAME__` | Matter Name | Text | Transaction / matter name shown on card |
| `__CONV_F_CVY_BUYER__` | Buyer | Text | Buyer full name |
| `__CONV_F_CVY_SELLER__` | Seller | Text | Seller full name |
| `__CONV_F_CVY_STATUS__` | Status | Single select | Active / Completed / Stalled / Cancelled |
| `__CONV_F_CVY_TENURE__` | Tenure | Single select | Freehold / Leasehold |
| `__CONV_F_CVY_PRICE__` | Purchase Price | Currency / Number | Transaction value in KES |
| `__CONV_F_CVY_INSTR__` | Instructions Date | Date | Date instructions were received |
| `__CONV_F_CVY_TARGET__` | Target Completion | Date | Expected completion date |
| `__CONV_F_CVY_ACTUAL__` | Actual Completion | Date | Actual completion date (if done) |
| `__CONV_F_CVY_TITLE__` | Title Number | Text | Title deed / LR number |
| `__CONV_F_CVY_ASSIGNEE__` | Fee Earner | Single select | Advocate who owns the matter; drives the Matter Allocation view (who is working on what) |

---

## Milestones table field tokens (`__CONV_F_MS_*__`)

| Token | Field name | Type | Description |
|---|---|---|---|
| `__CONV_F_MS_TYPE__` | Milestone Type | Text or Single select | e.g. Instructions Received, Official Search, Stamp Duty |
| `__CONV_F_MS_TARGETDATE__` | Target Date | Date | When this milestone should be reached |
| `__CONV_F_MS_STATUS__` | Status | Single select | Pending / In Progress / Completed / Overdue / Skipped |
| `__CONV_F_MS_COMPLETED__` | Completed Date | Date | Actual completion date for this milestone |
| `__CONV_F_MS_CONVEYANCE__` | Conveyance | Linked record | Link back to the parent Conveyances record |
| `__CONV_F_MS_NOTES__` | Notes | Long text | Free-text notes shown in the milestone tooltip |
| `__CONV_F_MS_SEARCHEXPIRY__` | Official Search Expiry | Date | For the Official Search milestone only: date the search result expires (typically Target Date + 30 days). Tracker flags this when 10 or fewer days remain. |

---

## Notes

- The `__CONV_F_MS_SEARCHEXPIRY__` field only needs a value on the Official Search milestone row; it can be blank on all other milestone rows.
- All `__CONV_F_*__` tokens are Airtable field IDs (format: `fldXXXXXXXXXXXXXX`), not field names. Use `list_tables_for_base` to discover them.
- The `__CONV_BASE_ID__` token covers both the Conveyances and Milestones tables (they live in the same base).
