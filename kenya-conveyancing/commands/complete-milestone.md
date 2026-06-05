# /complete-milestone

**Purpose:** Mark a milestone as completed and advance the matter to the next stage.

---

## Step 1 — Identify

Identify the matter by its number, not by listing every file (listing does not scale once the firm has volume, and it reads as clumsy).

Ask: "Which matter? Type its LR / Title number (for example Nairobi/Block 138/1333):"

Query Airtable for the Active Conveyance whose **Title Number** matches what was typed (match on the number, ignoring spacing and case). Confirm the matter name back before proceeding. If nothing matches, say so and ask again. If a few close matches come back, show only those few and let the user pick.

Then pull the Pending milestones for that conveyance. With the **AskUserQuestion tool** (these are bounded choices):
- "Which milestone was completed?" Options: the pending milestones in sequence, the current one first. If more than four are pending, show the four nearest in sequence.
- "Date completed?" Options: Today; Enter a date.

---

## Step 2 — Update Airtable

Use the `airtable-conveyances` skill:
1. Update the Milestone record: Status → "Completed", Completed Date → date provided
2. Update the Conveyance record: Current Milestone → the next milestone, written as its **SHORT option name** (Instructions, Official Search, Consent, Rates Clearance, Rent Clearance, Stamp Duty, Transfer Docs, Registration, Completion). Map the long Milestone Type to its short name (e.g. "Instructions + Sale Agreement" → "Instructions"; "LCB / NLC Consent" → "Consent"; "Transfer Documents" → "Transfer Docs"). Writing a long name fails (not a valid option on the single select).

Skip conditions:
- If completing Milestone 2 (Official Search): confirm Official Search Expiry date is set correctly in Airtable
- If completing Milestone 3 (Consent) and Milestone 5 (Rent Clearance) is Skipped: note this in output
- If completing Milestone 8 (Registration): also update Conveyance Status → "Completed" when Milestone 9 is done

---

## Step 3 — Prompt Next Steps

Output the completion confirmation:

```
Milestone [X] — [Milestone Type] marked complete on [DATE].
Next milestone: [MILESTONE TYPE] — due [DATE]
```

Then ask:

With the AskUserQuestion tool, ask both in one popup:
- "Draft the documents for [NEXT MILESTONE] now?" Options: Yes, draft them; Not now.
- "Send a client update to the client?" Options: Yes, draft an update; Not now.

If yes to drafting: invoke `/draft-conveyance-doc` for the next milestone.
If yes to client update: invoke `/send-client-update`.

---

## Step 4 — Special Logic

**Milestone 2 completed:** Confirm Official Search Expiry in output. Remind that the 14-day protection period began on lodgement of LRA 84 — caution may need to be lodged if the window is closing.

**Milestone 8 completed (Registration):** Output the new title details. Confirm new Certificate of Title number if known. Prompt: "Update Airtable with Actual Completion Date and new title number?"

**Milestone 9 completed:** Update Conveyance Status → "Completed". Send final client update confirming title has been registered in buyer's name.
