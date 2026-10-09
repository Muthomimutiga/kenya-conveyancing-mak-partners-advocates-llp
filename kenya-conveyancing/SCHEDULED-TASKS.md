# SCHEDULED-TASKS.md, Kenya Conveyancing Manager

## Daily Briefing, Weekdays 7:30am

Run `/conveyance-status` for ALL active conveyances.

Output format:

```
CONVEYANCING DAILY BRIEFING, [DATE]

OVERDUE
- [Matter], [Milestone] was due [DATE]

DUE THIS WEEK
- [Matter], [Milestone] due [DATE]

OFFICIAL SEARCH EXPIRING
- [Matter], Search expires [DATE] ([X] days remaining)

COMPLETIONS THIS MONTH
- [Matter], Target completion [DATE]
```

Pull from Airtable: query Milestones table where Status = "Overdue" OR (Status is "Pending" or "In Progress" AND Target Date is before today) OR (Status = "Pending" AND Target Date within the next 7 days). **Overdue is computed, not stored.** Nothing else in the plugin sets a milestone to Overdue. Treat any milestone whose Status is Pending or In Progress and whose Target Date is before today as overdue, whatever its Status field says, and write Status = "Overdue" back to that record so the base and the report agree. A milestone that is Completed or Skipped is never overdue. Also check Official Search Expiry within 10 days.
