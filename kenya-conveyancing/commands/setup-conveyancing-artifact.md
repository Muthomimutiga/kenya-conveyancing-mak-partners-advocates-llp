---
description: Install the live Conveyancing Tracker dashboard (run once)
---

# /setup-conveyancing-artifact, Install The Conveyancing Tracker

Run once to install the live Conveyancing Tracker artifact for the firm.
Re-run any time to update the firm name, timezone, or a changed field ID.

The tracker is read-only: it fetches and renders live data from Airtable every
time it opens in CoWork. Milestone status, fee earner, and dates are edited via
the commands (`/new-conveyance`, `/complete-milestone`) or directly in Airtable.

---

## Step 1, Verify Airtable

Call `mcp__<AT>__ping` (or any lightweight Airtable tool) to confirm the Airtable
MCP is connected. If it fails, tell the user to connect Airtable in CoWork
settings and stop.

The tracker reads only Airtable. Its page carries no mail or calendar server
tokens at all, so there is nothing to map for them, whichever mail and calendar
system the firm runs.

---

## Step 2, Locate the conveyancing base

The firm uses a single shared conveyancing base for everyone. `search_bases`,
select that base ("Kenya Conveyancing Manager" or similar), and confirm its name
with the user. Store its ID as `CONV_BASE_ID`. Do NOT create a new base. If it
does not appear, your Airtable account has not been shared into it: ask the firm's
administrator to add you as a collaborator on the shared base, then re-run.

---

## Step 3, Discover tables and fields

`list_tables_for_base(CONV_BASE_ID)`. Identify:

- The **Conveyances** table. Store its ID as `CONV_CONVEYANCES_TBL`.
- The **Milestones** table. Store its ID as `CONV_MILESTONES_TBL`.

Map every token in `scripts/artifact/TOKENS.md` to a real field ID:

| Token | Field to find |
|---|---|
| `__CONV_F_CVY_NAME__` | Matter Name (text) |
| `__CONV_F_CVY_BUYER__` | Buyer (text) |
| `__CONV_F_CVY_SELLER__` | Seller (text) |
| `__CONV_F_CVY_STATUS__` | Status (single select: Active / Completed / Stalled / Cancelled) |
| `__CONV_F_CVY_TENURE__` | Tenure (single select: Freehold / Leasehold) |
| `__CONV_F_CVY_PRICE__` | Purchase Price (Kshs) (currency / number) |
| `__CONV_F_CVY_INSTR__` | Instructions Date (date) |
| `__CONV_F_CVY_TARGET__` | Target Completion (date) |
| `__CONV_F_CVY_ACTUAL__` | Actual Completion (date, may be blank) |
| `__CONV_F_CVY_TITLE__` | Title Number (text) |
| `__CONV_F_CVY_ASSIGNEE__` | **Fee Earner** (single select: the firm's advocates) |
| `__CONV_F_MS_TYPE__` | Milestone Type (single select) |
| `__CONV_F_MS_TARGETDATE__` | Target Date (date) |
| `__CONV_F_MS_STATUS__` | Status (single select: Pending / In Progress / Completed / Overdue / Skipped) |
| `__CONV_F_MS_COMPLETED__` | Completed Date (date) |
| `__CONV_F_MS_CONVEYANCE__` | Conveyance (linked record to Conveyances) |
| `__CONV_F_MS_NOTES__` | Notes (long text) |
| `__CONV_F_MS_SEARCHEXPIRY__` | Official Search Expiry (date, on the Official Search milestone row only) |

If the **Fee Earner** field does not exist yet, add it to the Conveyances table
(single select, seeded with the firm's advocates) before continuing, the Matter
Allocation view reads it. If any other required field is missing, list the gaps
and stop. Do not proceed with a partial map: `apply-ids.js` throws on the first
unmapped token.

---

## Step 4, Retrieve server UUIDs

Read the Airtable UUID from the tool names visible in this session: the segment
between `mcp__` and `__list_records_for_table`. No other server id is needed.

---

## Step 5, Capture firm config

- **Firm display name** (masthead): `MAK & Partners Advocates LLP`
- **Timezone**: `Africa/Nairobi`

---

## Step 6, Generate and register the artifact

Write the full token map to `/tmp/conv-artifact-ids.json`, every token in
`scripts/artifact/TOKENS.md`:

```json
{
  "__AT_SERVER_UUID__":          "<airtable-uuid>",
  "__FIRM_NAME__":               "MAK & Partners Advocates LLP",
  "__BRIEF_TZ__":                "Africa/Nairobi",
  "__CONV_BASE_ID__":            "<base-id>",
  "__CONV_CONVEYANCES_TBL__":    "<conveyances-table-id>",
  "__CONV_MILESTONES_TBL__":     "<milestones-table-id>",
  "__CONV_F_CVY_NAME__":         "<field-id>",
  "__CONV_F_CVY_BUYER__":        "<field-id>",
  "__CONV_F_CVY_SELLER__":       "<field-id>",
  "__CONV_F_CVY_STATUS__":       "<field-id>",
  "__CONV_F_CVY_TENURE__":       "<field-id>",
  "__CONV_F_CVY_PRICE__":        "<field-id>",
  "__CONV_F_CVY_INSTR__":        "<field-id>",
  "__CONV_F_CVY_TARGET__":       "<field-id>",
  "__CONV_F_CVY_ACTUAL__":       "<field-id>",
  "__CONV_F_CVY_TITLE__":        "<field-id>",
  "__CONV_F_CVY_ASSIGNEE__":     "<field-id>",
  "__CONV_F_MS_TYPE__":          "<field-id>",
  "__CONV_F_MS_TARGETDATE__":    "<field-id>",
  "__CONV_F_MS_STATUS__":        "<field-id>",
  "__CONV_F_MS_COMPLETED__":     "<field-id>",
  "__CONV_F_MS_CONVEYANCE__":    "<field-id>",
  "__CONV_F_MS_NOTES__":         "<field-id>",
  "__CONV_F_MS_SEARCHEXPIRY__":  "<field-id>"
}
```

Then resolve the artifact into the CoWork session:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact/apply-ids.js \
  ${CLAUDE_PLUGIN_ROOT}/scripts/assets/artifact-template.html \
  /tmp/conv-artifact-ids.json \
  /sessions/${SESSION_ID}/mnt/outputs/conveyancing-tracker.html
```

**Register it as a CoWork artifact.** Writing the file registers nothing. Follow the `cowork-artifact`
skill in this plugin (`${CLAUDE_PLUGIN_ROOT}/skills/cowork-artifact/SKILL.md`). The Tracker carries only
the older system's transport, so it needs `mcp__cowork__create_artifact`: `id` = `conveyancing-tracker`,
`html_path` = the path above, `description` = `The Conveyancing Tracker: every active conveyance through the nine milestones, live from the firm's Airtable base.`,
`mcp_tools` = [`mcp__<segment>__list_records_for_table`] with the Airtable segment as this session's tool
names read. If the skill's detection finds only the updated system, stop and tell the user the Tracker
is not yet built for it.

If `apply-ids` errors with "unmapped token", a token was missed. Add it to the
map and re-run.

---

## Step 7, Confirm

Tell the user:

- The Conveyancing Tracker is registered and ready to open in CoWork.
- Open it **inside CoWork** (not a browser), it connects live to Airtable on
  every load.
- Active conveyances appear as cards with the 9-milestone cycle. Click any card
  for the full transaction detail.
- **Matter Allocation** (top-left) groups every active file by fee earner, so the
  team sees who is working on what at a glance. Each card also shows its Fee Earner.
- Each card's timeline reflects that matter's own target dates, a matter nearing
  completion looks different from one still weeks out.
- Alerts surface overdue milestones, official-search expiry (10-day window), and
  due-this-week items.
- To reassign a matter or update a milestone, edit Airtable (or run the commands);
  the tracker refreshes on next open.
