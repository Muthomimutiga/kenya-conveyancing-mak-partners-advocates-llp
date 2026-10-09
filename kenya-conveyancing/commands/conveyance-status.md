---
description: Show the current status of one or all active conveyance matters
---

# /conveyance-status

**Purpose:** Pull the current state of one or all active conveyance matters.

---

## Invocation

- `/conveyance-status`, lists all active matters with status
- `/conveyance-status [LR No. or matter name]`, detailed view for one matter

---

## Single Matter Output

Use the `airtable-conveyances` skill to:
1. Find the Conveyance record matching the LR No. or matter name
2. Pull all linked Milestone records
3. Calculate days overdue or days remaining for each milestone. **Overdue is computed, not stored.** Nothing else in the plugin sets a milestone to Overdue. Treat any milestone whose Status is Pending or In Progress and whose Target Date is before today as overdue, whatever its Status field says, and write Status = "Overdue" back to that record so the base and the report agree. A milestone that is Completed or Skipped is never overdue.
4. Check Official Search Expiry

Output format:

```
CONVEYANCE STATUS, [MATTER NAME]

LR No.: [LR NO.]
Tenure: [Freehold / Leasehold]
Purchase Price: Kshs. [AMOUNT]
Target Completion: [DATE] ([X days remaining / X days overdue])
Status: [Active / Stalled / Completed]

CURRENT MILESTONE: [MILESTONE TYPE]

MILESTONE TRACKER
1. Instructions + Sale Agreement     [DATE], COMPLETED [actual date]
2. Official Search                   [DATE], [STATUS]
   Search expires: [DATE], [X days remaining] [URGENT if <10 days]
3. LCB/NLC Consent                   [DATE], [STATUS]
4. Rates Clearance                   [DATE], [STATUS]
5. Rent Clearance                    [DATE], [SKIPPED / STATUS]
6. Stamp Duty                        [DATE], [STATUS]
7. Transfer Documents                [DATE], [STATUS]
8. Registration                      [DATE], [STATUS]
9. Completion                        [DATE], [STATUS]

NEXT ACTION: [Description of what needs to happen next and who owns it]
```

Flag any milestone where Status = Overdue with a warning marker.
Flag Official Search Expiry with URGENT if within 10 days.

---

## All Active Matters Output

Query Airtable: Conveyances where Status = "Active". For each, show:

Apply the same overdue rule to every milestone of every active matter, and list each overdue milestone under the matter, not only the current one.

```
[MATTER NAME], LR [LR NO.]
Current Milestone: [MILESTONE]     Due: [DATE]     [OVERDUE / X days remaining]
Official Search: [expires DATE, X days] (if applicable and Milestone 2 not yet completed)
```
