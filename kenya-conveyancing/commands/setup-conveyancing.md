# /setup-conveyancing

**Purpose:** First-time setup for the MAK & Partners conveyancing system. Creates the Airtable base structure, verifies table and field IDs, and prepares the base for the live Conveyancing Tracker (installed separately via `/setup-conveyancing-artifact`).

---

## Step 1 — Verify Airtable Connection

Ping the Airtable MCP server to confirm it is connected:

```
mcp: airtable → ping
```

If the ping fails, tell the user: "Airtable is not connected. Please add your Airtable personal access token to CoWork settings and try again."

---

## Step 2 — Pre-install Document Generator Dependencies

Run this before anything else so the first document generation is instant:

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && npm install
```

If npm install fails, report the error to the user and stop. The generator will not work without its dependencies.

If it succeeds, continue silently.

---

## Step 4 — Locate or Create the Conveyancing Base

Search Airtable for a base named "Conveyancing" or "Kenya Conveyancing":

```
mcp: airtable → search_bases  query: "Conveyancing"
```

If found: confirm the base name with the user and proceed with that base ID.

If not found: tell the user — "No conveyancing base found. Please create one in Airtable following your airtable-setup.md reference guide, then run /setup-conveyancing again."

Store the base ID — you will need it throughout.

---

## Step 5 — Discover Table and Field IDs

Call `list_tables_for_base` with the base ID from Step 2.

Identify:
- The **Conveyances** table (may be named "Conveyances", "Transactions", or similar)
- The **Milestones** table (may be named "Milestones", "Milestone Schedule", or similar)

For each table, note the **table ID** and map the fields to these logical names:

**Conveyances table fields:**

| Token | Expected field name |
|---|---|
| AT_F_CVY_NAME | Matter Name / Property Name |
| AT_F_CVY_BUYER | Buyer |
| AT_F_CVY_SELLER | Seller |
| AT_F_CVY_STATUS | Status |
| AT_F_CVY_TENURE | Tenure |
| AT_F_CVY_PRICE | Purchase Price |
| AT_F_CVY_INSTR | Instructions Date |
| AT_F_CVY_TARGET | Target Completion |
| AT_F_CVY_ACTUAL | Actual Completion |
| AT_F_CVY_TITLE | Title Number |
| AT_F_CVY_MILESTONES | Milestones (linked record field) |

**Milestones table fields:**

| Token | Expected field name |
|---|---|
| AT_F_MS_REF | Milestone Reference |
| AT_F_MS_TYPE | Milestone Type |
| AT_F_MS_TARGETDATE | Target Date |
| AT_F_MS_STATUS | Status |
| AT_F_MS_COMPLETED | Completed Date |
| AT_F_MS_CONVEYANCE | Conveyance (linked record field) |
| AT_F_MS_NOTES | Notes |

If any field is missing, tell the user which fields need to be added to their Airtable base before proceeding.

Also retrieve the Airtable MCP server UUID — it is the part between `mcp__` and `__list_records_for_table` in the mcpTools list shown in CoWork for this plugin.

---

## Step 6 — Install the Conveyancing Tracker

The live Conveyancing Tracker is installed by its own command, `/setup-conveyancing-artifact`, which builds it on the shared Live Artifact Kit (broadsheet shell + tested view + Matter Allocation, with field IDs mapped — including Fee Earner). Do **not** hand-generate the tracker here.

Tell the user: "Base and fields are verified. Run `/setup-conveyancing-artifact` to install the live tracker — it maps the field IDs and registers the artifact in CoWork."

Run `/setup-conveyancing-artifact` now as the next step, or let the user run it. The tracker is no longer generated inside this command.

---

## Step 7 — Output Summary and Team Orientation

Present the download link for `conveyancing-tracker.html`.

Then deliver the following orientation in full. Do not summarise it. Present it exactly as written, with all headings and sections intact.

---

**SETUP COMPLETE**

Airtable base: [Base Name] ([Base ID])
Conveyances table: [Table ID] — [N] fields mapped
Milestones table: [Table ID] — [N] fields mapped
Dependencies: installed
Conveyancing Tracker: run /setup-conveyancing-artifact to install the live tracker

---

# Welcome to the MAK & Partners Conveyancing System

This is a short orientation for every member of the conveyancing team. It explains what this system is, how it works, and how to use it correctly from day one.

Read it once. Keep it open while you run your first matter. After that, it becomes instinct.

---

## What You Are Working With

You are working inside **Claude CoWork** — an AI workspace built by Anthropic. Think of it as a version of Claude that has been extended with custom tools specific to your firm and your workflows.

Three components power everything you are about to use:

### 1. The Plugin

A **plugin** is a package of instructions, skills, and tools installed into CoWork for a specific purpose. The plugin you are using right now — the MAK & Partners Conveyancing System — was built specifically for this firm. It knows your firm name, your partner's name, your letterhead, your address, your file reference format, and your conveyancing workflow from instructions to title.

When you open CoWork and this plugin is active, Claude is no longer a general assistant. It is a conveyancing-trained assistant for MAK & Partners.

### 2. Commands

**Commands** are the actions you can trigger. You run a command by typing a forward slash followed by the command name — for example, `/new-conveyance`. Commands are structured workflows: Claude follows a sequence of steps, asks you the right questions, and produces a result.

This plugin has five day-to-day commands (plus the `/setup-conveyancing`, `/setup-conveyancing-artifact`, and `/train-form` admin commands):

| Command | What it does |
|---|---|
| `/new-conveyance` | Opens a new matter — collects all party and property details, builds the 9-milestone schedule in Airtable, creates Calendar reminders, and drafts the Sale Agreement |
| `/draft-conveyance-doc` | Drafts any document for a matter at any milestone — letters, LRA forms, the Sale Agreement, undertakings, requisitions |
| `/complete-milestone` | Marks a milestone as complete, updates Airtable, logs the date, and tells you what comes next |
| `/conveyance-status` | Pulls the live status of every active matter — who is overdue, what is pending, what needs attention today |
| `/send-client-update` | Drafts a client-facing update letter for any matter, pre-filled with the current milestone status |

You do not need to remember syntax, field names, or Airtable table IDs. You just type the command and Claude handles everything from there.

### 3. Skills

**Skills** are background knowledge that Claude uses automatically — you never call them directly. For example, when you run `/new-conveyance`, Claude uses the `airtable-conveyances` skill behind the scenes to know exactly which Airtable table to write to, which fields to populate, and in what format. Skills make commands reliable: they encode the logic so Claude does not have to guess.

---

## How Documents Are Generated

Every time you draft a document, this is what actually happens:

1. Claude collects the matter details — from you directly or from Airtable.
2. Claude assembles a structured data file with every field the document needs.
3. A Node.js generator script reads that file and builds a fully formatted Word document — with MAK's letterhead, the correct fonts, the correct margins, the correct execution blocks for statutory forms.
4. CoWork presents a download link. You download the `.docx` file, review it, and print or send it.

**The document is not typed by Claude.** It is generated from a template engine that knows exactly what a Kenyan Sale Agreement, LRA 33 Transfer, or LRA 58 Discharge of Charge looks like. Claude fills the data. The engine builds the document.

This means:
- Every document uses MAK letterhead automatically — you never configure it
- Party names, prices, and dates are placed in the correct positions every time
- Execution blocks (individual vs company) are routed correctly based on party type
- LRA statutory forms carry your firm's P105 number and KRA PIN in the correct fields

---

## The Conveyancing Cycle Tracker

The Conveyancing Tracker is a **live artifact**, installed once with `/setup-conveyancing-artifact`. Open it inside CoWork — not in a browser directly, but within the CoWork interface. When you do:

- It connects to your Airtable base in real time
- Every active conveyance appears as a card with a horizontal milestone timeline
- Each node on the timeline shows the status: complete (green), current (gold), overdue (red alert), pending (grey)
- Hovering a milestone dot shows a tooltip with the milestone type, due date, and any notes
- Clicking a card opens the full transaction detail — all parties, all milestone dates, progress percentage
- **Matter Allocation** (top-left) groups every active file by fee earner — who is working on what at a glance
- Each card's timeline reflects that matter's real completion clock: a ready unit completing in weeks looks different from an off-plan unit completing next year

The tracker refreshes every time you open it. It is not a report you export — it is a live window into the system.

---

## The 9-Milestone Conveyancing Cycle

Every matter runs through a fixed cycle. The system tracks it milestone by milestone:

| Milestone | What happens | Key flag |
|---|---|---|
| M1 — Instructions | Sale Agreement drafted. Matter opened in Airtable. Calendar events created. | Instructions date = Day 0 |
| M2 — Official Search | Official search application drafted. Expiry date set (30 days from lodgement). | Search expiry reminder fires 7 days before |
| M3 — LCB/NLC Consent | Consent application drafted. Skipped automatically for freehold non-agricultural land. | Can delay a transaction by 30+ days |
| M4 — Rates Clearance | County government clearance letter drafted. | Required for all transfers |
| M5 — Rent Clearance | NLC rent clearance drafted. Skipped automatically for freehold land. | Leasehold only |
| M6 — Stamp Duty | Stamp duty assessment and payment guidance note. | KRA iTax process |
| M7 — Transfer Documents | LRA 33 (freehold) or LRA 63 (leasehold) drafted. LRA 58 if charge present. | Execution by parties required |
| M8 — Registration | Registration covering letter drafted. Documents lodged at Land Registry. | Wait time 14–30 days |
| M9 — Completion | Completion notice drafted. Title handed to client. Matter closed. | |

When you run `/new-conveyance`, Claude computes the target date for each milestone (the front cluster from the instructions date, the back cluster from the completion date) and, if a calendar connector is connected in CoWork, creates a reminder for each one in that calendar. If no calendar is connected, Claude lists the dates for you to add to your diary. It does not silently skip a deadline.

---

## Getting the Best Results

**Be specific with names.** Names on LRA instruments must match the title register exactly. A mismatch is grounds for rejection after stamp duty has been paid. When Claude asks for a name, give the full name as it appears on the national ID.

**Use commands for their intended purpose.** Do not ask Claude to "draft a transfer" in a general conversation — run `/draft-conveyance-doc` and follow the flow. The command knows which Airtable record to pull from and which questions to ask.

**Mark milestones as complete in real time.** Run `/complete-milestone` as soon as a milestone is done — do not batch them at the end of the week. The tracker, the calendar, and the status command all depend on current data.

**Check `/conveyance-status` every morning.** It takes ten seconds and tells you exactly what is overdue, what is due this week, and what needs a client update. Build it into your morning routine.

**The system does not replace your professional judgement.** Claude generates documents and tracks deadlines. It does not advise on whether to proceed, assess title risk, or make decisions that require a practitioner's eye. Those remain yours.

---

## If Something Goes Wrong

**Document did not generate:** Run the command again. If it fails twice, describe the error to Claude and it will diagnose it.

**Airtable data looks wrong:** Check the record directly in Airtable. The system writes what it is told — if a field is wrong, it was entered incorrectly. Edit the Airtable record and re-run the command.

**Tracker shows no data:** The tracker reads live from Airtable. If it shows nothing, either no Active matters exist yet, or the Airtable connection dropped. Re-run `/setup-conveyancing-artifact` to reconnect.

**Calendar events missing:** Confirm a calendar connector is connected in CoWork settings (Microsoft/Outlook if the firm is on Microsoft 365, or Google Calendar). If it was disconnected after `/new-conveyance` ran, create the calendar events manually for that matter from the dates in its milestone schedule.

---

You are ready. Run `/new-conveyance` to open your first matter.
