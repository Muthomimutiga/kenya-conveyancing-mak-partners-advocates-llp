---
description: Install the MAK Project Desk for the person running this (run once inside your own Cowork task; identity is read from your connectors, My post from Microsoft 365, and the desk publishes as a live artifact)
---

# /setup-project-desk — Install the Project Desk for the person running this

Run once, inside the fee earner's own CoWork. Every copy is the same page. It
reads the firm's Project Desk base live through this person's own Airtable
connection, and every change made on it (assigning a unit, moving a unit along
the gates, adding to the list) is written to Airtable first and re-read before
it is shown as done. Airtable is the source of truth; the page holds nothing.

**Do not ask who the desk is for.** The desk belongs to whoever is running this
command. Work out who that is from their connectors (Step 5) and ask only as a
last resort, and then ask "Who are you?", never "who is this for?".

---

## Step 1 — Verify Airtable, and that this is a CoWork task

**This command must run as a CoWork task, not in a chat.** In a chat, CoWork creates
the artifact without connector access and the desk stays "Static build · not
connected". If you are in a chat, tell the user to start a new task and run
`/setup-project-desk` there, then stop.

Call `search_bases` for **"MAK Project Desk"** (or any lightweight Airtable
tool) to confirm the Airtable MCP is connected **as this person's own account**.
If it fails, tell them to connect Airtable in CoWork settings and stop.

## Step 2 — Locate the Project Desk base

Select the **MAK Project Desk** base and confirm it with the user. Store its ID
as `DESK_BASE_ID`. Do not use the firm's separate "Conveyancing Manager" base;
individual matters are never in the Project Desk.

## Step 3 — Check the schema, do not map it

The desk resolves every table and field **by name at load**. Call
`list_tables_for_base(DESK_BASE_ID)` and confirm:

- A **Units** table with fields named exactly: Unit Number, Purchaser Name,
  Advocate, Stage, Sold, Blocked By, Phase, Purchaser Email, Mobile,
  ID Number, PIN Number, Ardhi Sasa ID, Comments, and the eighteen gate
  checkboxes (Agreement requested … Transfer complete).
- A **Notes** table with fields named Note ID, Unit, Author, Note, Done.
- Note whether a **Team** table (Name, Email, Airtable Login, Role, Advocate
  Label, Active) and a **Sign-ins** table (Task, Signed In By, When) exist.
  Team may also carry **Watched Mailboxes** and **Desk URL**. Steps 6 to 9 use
  them; the desk works without them.

If Units or Notes is missing a field, list the gaps and stop.

## Step 4 — Which artifact system this session has

Follow step 1 of the **`cowork-artifact`** skill in this plugin
(`${CLAUDE_PLUGIN_ROOT}/skills/cowork-artifact/SKILL.md`): ToolSearch for
`artifact`. `mcp__cowork__create_artifact` present means the **older system**;
otherwise the `Artifact` tool present means the **updated system**; neither
means stop with the skill's wording. Everything below depends on this.

## Step 5 — The Airtable connector, as the page must address it

- **Older system:** the segment between `mcp__` and `__list_records_for_table`
  in this session's Airtable tool names, copied verbatim (at MAK it has read
  `Airtable`; on other accounts it is a UUID).
- **Updated system:** the connector's display name as claude.ai shows it,
  `Airtable`.

Store it as `AT_SERVER`.

## Step 6 — Who is running this?

Establish the person's identity in this order, stopping at the first that works:

1. **Microsoft 365.** If a Microsoft 365 connector is available in this session
   and it exposes a tool that returns the signed-in user's own profile (`get_me`
   or similar), call it and take the **email** and display **name**.
2. **Airtable sign-in stamp.** If the base has a **Sign-ins** table, create one
   record in it (`Task` = `setup-project-desk`). The create call returns only the
   fields you wrote, so read the record back with `list_records_for_table` using
   its record id and `fieldIds` = [`Signed In By`], and take the **email** (and
   name, if present) from that value.
3. **Ask, once.** With the AskUserQuestion tool: "Who are you?" Options: the
   Active names from the Team table plus "Someone else", which asks for a name
   and a work email.

Then resolve the person against **Team**: the record whose **Airtable Login**
equals the email (case-insensitive), else whose **Email** equals it, else (after
asking) whose **Name** matches. If the match came from asking and a sign-in
email is known, write that email into the record's **Airtable Login**. Take
`Name`, `Role` (Partner / Steward / Associate), `Advocate Label`, `Watched
Mailboxes` and `Desk URL`.

- **VIEWER** is the lowercase first name for the five fee earners (`winfred`,
  `ann`, `ken`, `patricia`, `jessica`). Anyone else, including a person not in
  Team, is `guest`.
- **NAME** is their display name, **ROLE** one of exactly `partner`, `steward`,
  `associate` (a guest is `associate`), **EMAIL** the email found.

Say one line: "Setting up the Project Desk for [NAME], [role]." A guest gets a
desk with nothing allocated, which is correct: say so.

## Step 7 — My post (Microsoft 365)

"My post" on Home reads the person's own inbox, plus any shared mailboxes they
follow, and keeps from a shared mailbox only mail whose sender is a purchaser on
a unit allocated to them. Guests never get it.

1. If this session has a Microsoft 365 connector with `outlook_email_search`:
   call it **once on the person's own inbox** with a small limit (for example
   `{folderName: "Inbox", order: "newest", limit: 3}`) so its shape is verified
   in this session, then set **MS_SERVER** to how the page must address it:
   older system, the segment of its tool ids; updated system, the display name
   (`mcp__Microsoft_365__get_me` means `Microsoft 365`).
2. If there is no Microsoft 365 connector, set MS_SERVER to the literal
   `__MS_SERVER_ABSENT__` and tell the user My post will read "Not connected"
   until they connect Microsoft 365 and re-run.
3. **MAILBOXES** is the person's `Watched Mailboxes` field as a JSON array of
   addresses (one address per line in Airtable), `[]` when blank or missing.

## Step 8 — Generate the page

Write the token map to `/tmp/project-desk-ids.json`. Eight tokens, nothing else:

```json
{
  "__AT_SERVER_UUID__":       "<AT_SERVER>",
  "__DESK_BASE_ID__":         "<DESK_BASE_ID>",
  "__DESK_VIEWER__":          "<VIEWER>",
  "__DESK_VIEWER_NAME__":     "<NAME>",
  "__DESK_VIEWER_ROLE__":     "<ROLE>",
  "__DESK_VIEWER_EMAIL__":    "<EMAIL>",
  "__MS_SERVER__":            "<MS_SERVER or __MS_SERVER_ABSENT__>",
  "__DESK_VIEWER_MAILBOXES__":"<MAILBOXES, e.g. [] or [\"rising@makadvocates.com\"]>"
}
```

Then, choosing the template by the system from Step 4:

```bash
# older system: a complete document
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact/apply-ids.js \
  ${CLAUDE_PLUGIN_ROOT}/scripts/assets/project-desk-template.html \
  /tmp/project-desk-ids.json \
  /sessions/${SESSION_ID}/mnt/outputs/project-desk.html

# updated system: the fragment
node ${CLAUDE_PLUGIN_ROOT}/scripts/artifact/apply-ids.js \
  ${CLAUDE_PLUGIN_ROOT}/scripts/assets/project-desk-artifact-template.html \
  /tmp/project-desk-ids.json \
  /sessions/${SESSION_ID}/mnt/outputs/project-desk.html
```

If `apply-ids` errors with "unmapped token", a token was missed. Add it and
re-run. (`__MS_SERVER_ABSENT__` is a sentinel, not a leftover.)

## Step 9 — Publish

Follow the **`cowork-artifact`** skill for the system from Step 4.

- **Older system:** `mcp__cowork__create_artifact` with `id` = `project-desk`,
  `html_path` = the file above, `description` = `MAK Project Desk for [NAME]: every sold unit through the eighteen gates, live from the Project Desk base through their own Airtable connection.`,
  `mcp_tools` = `mcp__<AT_SERVER>__list_tables_for_base`,
  `mcp__<AT_SERVER>__list_records_for_table`,
  `mcp__<AT_SERVER>__update_records_for_table`,
  `mcp__<AT_SERVER>__create_records_for_table`, plus
  `mcp__<MS_SERVER>__outlook_email_search` when Step 7 found Microsoft 365.
  `update_summary` on a re-run: `Re-installed for [NAME]`.
- **Updated system:** `Artifact` with `file_path` = the file above, `title` =
  `MAK Project Desk`, the same `description`, `favicon` = `🏗️` on a first
  publish only, `url` = the person's `Desk URL` when it is set, and
  `capabilities` =
  `{"mcp": {"servers": [{"server": "Airtable", "tools": ["list_tables_for_base", "list_records_for_table", "update_records_for_table", "create_records_for_table"]}` `, {"server": "<MS_SERVER>", "tools": ["outlook_email_search"]}` (only when Step 7 found Microsoft 365) `]}}`.
  On success, write the returned URL into the person's Team row, field
  **Desk URL**, before anything else.

Do not present or attach the HTML. Report success only when the tool has
replied created, updated or published; otherwise quote the reply and stop.

## Step 10 — Prove it before you say it is ready

Do not tell the person the desk is ready on the strength of a written file or
a tool reply alone. Prove three things and report them as facts:

1. **It registered.** Older system: `mcp__cowork__list_artifacts` shows
   `project-desk`, or `mcp__cowork__verify_artifact` ran clean. Updated
   system: the publish returned a URL and it is now in the person's Team row.
2. **It connects.** Ask the person to open it once. The status chip must read
   "Live from Airtable via CoWork" (older) or "Live from Airtable via
   claude.ai" (updated). "Static build · not connected" means the connectors
   were not allowed or the session was a chat; say so and stop.
3. **It is theirs.** The sidebar shows their name and role, no picker, and
   Home opens on their own units (or "nothing is allocated" for a guest). For
   an associate or steward with Microsoft 365, My post shows their inbox with
   "Your inbox" rows and any followed mailbox rows tagged with a unit; without
   Microsoft 365 it shows the "Not connected" note, never an error.

If any of the three fails, report which and what the page or tool said. Do
not soften it.

## Step 11 — Confirm

Tell the user, by role:

- **Everyone:** where the desk opens (older system: the Artifacts view of the
  Cowork sidebar; updated system: its private link and their Artifacts
  gallery). The first open asks them to allow the connectors. The status chip
  in the sidebar reads "Live from Airtable via CoWork" or "Live from Airtable
  via claude.ai" when connected, which means the base, the connector and the
  page agree; "Static build · not connected" means the Airtable connection is
  missing. There is no name picker: this desk is theirs and shows their view
  only. Every number opens the units beneath it; a unit shows everything the
  register holds, including the eighteen gates and who moves next; search is
  the box at the top of the sidebar; every unit carries a note thread saved to
  the Notes table; "Copy as list" and "Copy chase pack" copy courier-ready
  text.
- **Associate (Winfred, Patricia, Jessica):** Home shows what is waiting on
  them, what is waiting on someone else, their post (live from their own inbox
  and followed mailboxes when Microsoft 365 is connected, "Not connected"
  otherwise), and the firm's shared list; the board shows their own units;
  they move their own units along the gates.
- **Steward (Ann):** all of the above plus **Stewardship** on Home: Allocation
  (unallocated units with one-click assign, each advocate's load), Register
  health as a list of things to fix, and the latest notes across the desk.
  Only Ann and Ken can change who a unit is allocated to.
- **Partner (Ken):** the whole book: **The brief** at the top of Home (one
  paragraph from the register and four counts that each open their units),
  Stewardship, and every advocate's units on the board.
- **Guest (anyone not in the team, including Robin):** their own empty desk,
  "nothing is allocated to you", with the shared list and search. No post.
  Nothing else.
