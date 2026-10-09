---
description: First-time setup of the conveyancing Airtable base and IDs (run once)
---

# /setup-conveyancing

**Purpose:** First-time setup for the MAK & Partners Advocates LLP conveyancing system. Creates the Airtable base structure, verifies table and field IDs, and prepares the base for the live Conveyancing Tracker (installed separately via `/setup-conveyancing-artifact`).

---

## Step 1, Verify Airtable Connection

Ping the Airtable MCP server to confirm it is connected:

```
mcp: airtable → ping
```

If the ping fails, tell the user: "Airtable is not connected. Open Settings > Connectors, connect Airtable and sign in with your own Airtable account, then run /setup-conveyancing again."

---

## Step 2, Confirm Node.js

```bash
node --version
```

**Do not run `npm install`.** The document generator ships as a self-contained bundle with its dependencies already inside it, and in the CoWork sandbox the plugin directory is mounted **read only**, so an install would fail and cannot succeed. If `node --version` returns a version, this step is done.

---

## Step 3, Locate the Conveyancing Base

Search Airtable for a base named "Conveyancing" or "Kenya Conveyancing":

```
mcp: airtable → search_bases  query: "Conveyancing"
```

The firm uses ONE shared conveyancing base for everyone. There must never be a second.

If found: confirm the base name with the user and proceed with that base ID. Select the shared firm base; do not create another.

**If more than one base matches**, do not pick by search ranking. List every match by name and ask the user, with the AskUserQuestion tool, which one is the firm's shared conveyancing base. The firm's base is normally named exactly **Kenya Conveyancing Manager**. A base with "Template" or "TEST" in its name is never the firm's working base.

If not found: do NOT immediately create a base, that is how a firm ends up with several. First ask the user: "Is this the very first time anyone at the firm is setting up conveyancing?"
- If YES (first-ever firm setup): create the base per the airtable-setup.md reference guide. This becomes THE firm base. Then tell the user it must be shared in Airtable with every fee-earner who will use the plugin, so their setup finds this same base rather than making their own.
- If NO (the base already exists, you just cannot see it): your Airtable account has not been shared into it. Tell the user to ask the firm's administrator to add them as a collaborator on the existing shared base, then run /setup-conveyancing again. Do not create a second base.

Store the base ID, you will need it throughout.

---

## Step 4, Record Yourself in the Firm Directory

MAK & Partners Advocates LLP has several conveyancing fee earners and each installs their own copy of this plugin. Letters and engagement letters carry an **individual advocate's name and P.105 number** in their signature blocks, so those must be the details of the person running setup, not the firm's partner. A letter that goes out signed in another advocate's name is a professional-conduct problem, so this step is not optional and must not be guessed at.

Nothing is saved on this machine. The CoWork sandbox keeps no files between tasks, which is why the earlier version of this step, which wrote a config file, did not work: the file was gone by the next task and letters fell back to the firm partner's details. The record now lives in the **Team Members** table of the Conveyancing Manager base located in Step 3, and every drafting command signs in to it before it writes anything.

**4a, Check the directory is prepared.** `list_tables_for_base` and confirm **Team Members** has the fields Name, Email, Role, P.105 Number, LSK Practice Number, Practice Year, Airtable Login, Active, and that a **Sign-ins** table exists with Task, Document Type, Signed As, Signed In By, When. If anything is missing, list the gaps and stop.

**4b, Sign in.** Create one record in **Sign-ins**: `Task` = `setup-conveyancing`, `Document Type` = `setup`. The create call returns only the fields you wrote, so read the record back with `list_records_for_table` using its record id and `fieldIds` = [`Signed In By`]. Its value is a person object; take its **email**. That is the Airtable account this person is working as. Call it LOGIN.

**4c, Find their record.** In Team Members, look for the record whose **Airtable Login** equals LOGIN (case-insensitive); if none, the record whose **Email** equals LOGIN. Found: show what the directory holds and continue with it prefilled. Not found: with the AskUserQuestion tool, list the Active names plus "I am not listed" and ask "Which of these is you?". A record whose Airtable Login is already set to a different address belongs to another account; stop and say so (this CoWork is probably connected to a shared Airtable login rather than their own).

**4d, Ask, in one message, prefilled where present:**

1. Your full name as it should read inside a sentence, title case. Example: `Jane Wanjiru`.
2. Your P.105 number, exactly as it appears on your practising certificate. Example: `P.105/5678/16`.
3. Your LSK practice number and the year it was issued for. Example: `LSK/26/01234`, issued for `2026`.
4. Your work email address. Example: `jane@firmname.co.ke`.
5. Your role: Partner, Senior Associate, Associate, Paralegal or Secretary.

P.105 must be in the form `P.105/` digits `/` digits. Do not accept a blank P.105, and do not accept the partner's numbers for anyone but the partner. There is no fallback any more: the generator refuses to produce a letter without the signing advocate's own details.

**4e, Write the record.** Update the record found in 4c, or create one if the user was not listed, with Name, Email, Role, P.105 Number, LSK Practice Number, Practice Year, **Airtable Login = LOGIN**, Active ticked. Then update the Sign-in record from 4b so **Signed As** links to it. Write nothing to disk.

**4f, Confirm.** Read the record back and tell the user: "Recorded in the firm directory. Airtable knows you as [LOGIN]. Letters you draft will be signed [Name], Advocate ([P.105 Number]). Nothing is stored on this machine; every drafting command signs in first and says who it is signing as. To draft for someone else, say 'sign as [name]' during the draft."

**What stays firm-level.** The firm's name, address, letterhead artwork, DRAWN BY block and partner come from `scripts/firm-config.json`, which is built when the plugin is generated and is not edited here. `firm_partner` is used for firm-level blocks only and never to sign for an individual. The one firm-level thing this command does capture is the bank account, in Step 4g, because that one is usually still missing when the plugin is installed.

**4g, The firm's bank account.** A fee note is how a client learns where to send money, so the generator refuses to write one without the firm's account details. Those details cannot be added to a file after installation: the plugin directory is read only inside the sandbox and keeps no files between tasks, which is the same reason advocate identity lives in Airtable. They go in the directory instead.

Check whether **Firm Settings** exists in the base. If it does not, create it with the fields `Key` (single line text) and `Value` (single line text), one row per setting.

Read the rows. If `bank_account_no` already has a value, say so in one line and move on: this is a firm-level setting and the first person to run setup fills it in for everyone.

If it is blank, ask, in one message:

1. The name on the firm's bank account, exactly as the bank holds it.
2. The bank.
3. The account number.
4. The branch, if the bank uses one.

Say plainly why you are asking: "This goes on every fee note so clients know where to pay. It is recorded once for the whole firm, not per person." If the person does not have the details to hand, **do not guess and do not invent a placeholder.** Tell them fee notes will be refused until someone records them, that every other document works meanwhile, and that they or a colleague can run `/setup-conveyancing` again at any time to add them. Then continue with the rest of setup.

Write one row per value to Firm Settings with the keys `bank_account_name`, `bank_name`, `bank_account_no`, `bank_branch`. Read them back and show the person what was recorded, so a mistyped account number is caught while they are still looking at it.

---

## Step 5, Discover Table and Field IDs

Call `list_tables_for_base` with the base ID from Step 3.

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

The token names in the left-hand columns above are used only by `/setup-conveyancing-artifact`, if the firm installs the live tracker. For everything else, what matters is that each field exists with the expected name. Report any that do not, by exact name.

---

## Step 6, Install the Conveyancing Tracker

The live Conveyancing Tracker is installed by its own command, `/setup-conveyancing-artifact`, which builds it on the shared Live Artifact Kit (broadsheet shell + tested view + Matter Allocation, with field IDs mapped, including Fee Earner). Do **not** hand-generate the tracker here.

Tell the user: "Base and fields are verified. Run `/setup-conveyancing-artifact` to install the live tracker, it maps the field IDs and registers the artifact in CoWork."

The tracker is optional. Ask, with the AskUserQuestion tool, whether the firm wants the live Conveyancing Tracker dashboard now. If yes, run `/setup-conveyancing-artifact`. If no, skip it: every command works without it, and `/conveyance-status` gives the same picture in chat.

---

## Step 7, Output Summary and Team Orientation

Then deliver the following orientation in full. Do not summarise it. Present it exactly as written, with all headings and sections intact.

---

**SETUP COMPLETE**

Airtable base: [Base Name] ([Base ID])
Conveyances table: [Table ID], [N] fields mapped
Milestones table: [Table ID], [N] fields mapped
Advocate identity: [Advocate name], [P.105 number], [email]
Document generator: ready (Node.js present; nothing to install)
Firm bank account: [recorded / not yet recorded, fee notes refused until it is]
Conveyancing Tracker: optional, run /setup-conveyancing-artifact only if the firm wants the live dashboard

---

# Welcome to the MAK & Partners Advocates LLP Conveyancing System

This is a short orientation for every member of the conveyancing team. It explains what this system is, how it works, and how to use it correctly from day one.

Read it once. Keep it open while you run your first matter. After that, it becomes instinct.

---

## What You Are Working With

You are working inside **Claude CoWork**, an AI workspace built by Anthropic. Think of it as a version of Claude that has been extended with custom tools specific to your firm and your workflows.

Three components power everything you are about to use:

### 1. The Plugin

A **plugin** is a package of instructions, skills, and tools installed into CoWork for a specific purpose. The plugin you are using right now, the MAK & Partners Advocates LLP Conveyancing System, was built specifically for this firm. It knows your firm name, your partner's name, your letterhead, your address, your file reference format, and your conveyancing workflow from instructions to title.

When you open CoWork and this plugin is active, Claude is no longer a general assistant. It is a conveyancing-trained assistant for MAK & Partners Advocates LLP.

### 2. Commands

**Commands** are the actions you can trigger. You run a command by typing a forward slash followed by the command name, for example, `/new-conveyance`. Commands are structured workflows: Claude follows a sequence of steps, asks you the right questions, and produces a result.

These are the day-to-day commands (plus the `/setup-conveyancing` and `/setup-conveyancing-artifact` admin commands):

| Command | What it does |
|---|---|
| `/which-form` | Ask "which form do I use for..." in plain words. Returns the forms in lodging order, the consents and deadlines (including Land Control Board consent), the clearances, and the traps, each tied to its section. Drafts nothing until you say so |
| `/new-conveyance` | Opens a new matter, collects all party and property details, builds the 9-milestone schedule in Airtable, creates Calendar reminders, and drafts the Sale Agreement |
| `/draft-conveyance-doc` | Drafts any document for a matter at any milestone, letters, LRA forms, the Sale Agreement, undertakings, requisitions |
| `/complete-milestone` | Marks a milestone as complete, updates Airtable, logs the date, and tells you what comes next |
| `/conveyance-status` | Pulls the live status of every active matter, who is overdue, what is pending, what needs attention today |
| `/send-client-update` | Drafts a client-facing update letter for any matter, pre-filled with the current milestone status |

You do not need to remember syntax, field names, or Airtable table IDs. You just type the command and Claude handles everything from there.

### 3. Skills

**Skills** are background knowledge that Claude uses automatically, you never call them directly. For example, when you run `/new-conveyance`, Claude uses the `airtable-conveyances` skill behind the scenes to know exactly which Airtable table to write to, which fields to populate, and in what format. Skills make commands reliable: they encode the logic so Claude does not have to guess.

---

## How Documents Are Generated

Every time you draft a document, this is what actually happens:

1. Claude collects the matter details, from you directly or from Airtable.
2. Claude assembles a structured data file with every field the document needs.
3. A Node.js generator script reads that file and builds a fully formatted Word document, with the firm's letterhead, the correct fonts, the correct margins, the correct execution blocks for statutory forms.
4. CoWork presents a download link. You download the `.docx` file, review it, and print or send it.

**The document is not typed by Claude.** It is generated from a template engine that knows exactly what a Kenyan Sale Agreement, LRA 33 Transfer, or LRA 58 Discharge of Charge looks like. Claude fills the data. The engine builds the document.

This means:
- Every document uses the firm's letterhead automatically, you never configure it
- Party names, prices, and dates are placed in the correct positions every time
- Execution blocks (individual vs company) are routed correctly based on party type
- LRA statutory forms are reproduced from the Ministry's own published text, word for word, with the facts of your matter filled into the blanks the form leaves. Where the Ministry prints a row that applies only sometimes, it prints blank rather than demanding an answer
- A fee note carries the firm's bank account, read from the Firm Settings table so it can be corrected after installation. Everything else that is firm-level, the name, address, letterhead and DRAWN BY block, is built into the plugin when it is generated
- Letters and the engagement letter are signed in **your** name with **your** P.105 number, from your record in the firm directory (Team Members), read at every draft. The firm name, letterhead, and DRAWN BY block come from the shared `firm-config.json`. If a document ever comes out in another advocate's name, the sign-in matched the wrong record; re-run `/setup-conveyancing` and check Airtable Login on your record

---

## The Conveyancing Cycle Tracker

The Conveyancing Tracker is a **live artifact**, installed once with `/setup-conveyancing-artifact`. Open it inside CoWork, not in a browser directly, but within the CoWork interface. When you do:

- It connects to your Airtable base in real time
- Every active conveyance appears as a card with a horizontal milestone timeline
- Each node on the timeline shows the status: complete (green), current (gold), overdue (red alert), pending (grey)
- Hovering a milestone dot shows a tooltip with the milestone type, due date, and any notes
- Clicking a card opens the full transaction detail, all parties, all milestone dates, progress percentage
- **Matter Allocation** (top-left) groups every active file by fee earner, who is working on what at a glance
- Each card's timeline reflects that matter's own target dates: a matter with a near completion date looks different from one still weeks out

The tracker refreshes every time you open it. It is not a report you export, it is a live window into the system.

---

## The 9-Milestone Conveyancing Cycle

Every matter runs through a fixed cycle. The system tracks it milestone by milestone:

| Milestone | What happens | Key flag |
|---|---|---|
| M1, Instructions | Sale Agreement drafted. Matter opened in Airtable. Calendar events created. | Instructions date = Day 0 |
| M2, Official Search | Official search application drafted. Expiry date set (30 days from lodgement). | Search expiry reminder fires 7 days before |
| M3, LCB/NLC Consent | Consent application drafted. Skipped automatically for freehold non-agricultural land. | Can delay a transaction by 30+ days |
| M4, Rates Clearance | County government clearance letter drafted. | Required for all transfers |
| M5, Rent Clearance | NLC rent clearance drafted. Skipped automatically for freehold land. | Leasehold only |
| M6, Stamp Duty | Stamp duty assessment and payment guidance note. | KRA iTax process |
| M7, Transfer Documents | LRA 33 (freehold) or LRA 63 (leasehold) drafted. LRA 58 if charge present. | Execution by parties required |
| M8, Registration | Registration covering letter drafted. Documents lodged at Land Registry. | Wait time 14–30 days |
| M9, Completion | Completion notice drafted. Title handed to client. Matter closed. | |

When you run `/new-conveyance`, Claude computes the target date for each milestone from the Instructions Date and, if a target completion date is given, adjusts the later milestones to it. If a calendar connector is connected in CoWork, it creates a reminder for each one in that calendar. If no calendar is connected, Claude lists the dates for you to add to your diary. It does not silently skip a deadline.

---

## Getting the Best Results

**Be specific with names.** Names on LRA instruments must match the title register exactly. A mismatch is grounds for rejection after stamp duty has been paid. When Claude asks for a name, give the full name as it appears on the national ID.

**Use commands for their intended purpose.** Do not ask Claude to "draft a transfer" in a general conversation, run `/draft-conveyance-doc` and follow the flow. The command knows which Airtable record to pull from and which questions to ask.

**Mark milestones as complete in real time.** Run `/complete-milestone` as soon as a milestone is done, do not batch them at the end of the week. The tracker, the calendar, and the status command all depend on current data.

**Check `/conveyance-status` every morning.** It takes ten seconds and tells you exactly what is overdue, what is due this week, and what needs a client update. Build it into your morning routine.

**The system does not replace your professional judgement.** Claude generates documents and tracks deadlines. It does not advise on whether to proceed, assess title risk, or make decisions that require a practitioner's eye. Those remain yours.

---

## If Something Goes Wrong

**Document did not generate:** Run the command again. If it fails twice, describe the error to Claude and it will diagnose it.

**Airtable data looks wrong:** Check the record directly in Airtable. The system writes what it is told, if a field is wrong, it was entered incorrectly. Edit the Airtable record and re-run the command.

**Tracker shows no data:** The tracker reads live from Airtable. If it shows nothing, either no Active matters exist yet, or the Airtable connection dropped. Re-run `/setup-conveyancing-artifact` to reconnect.

**Calendar events missing:** Confirm the Microsoft 365 connector is connected in CoWork settings and the firm has turned on its write actions. If it was disconnected after `/new-conveyance` ran, create the calendar events manually for that matter from the dates in its milestone schedule.

---

You are ready. Run `/new-conveyance` to open your first matter.
