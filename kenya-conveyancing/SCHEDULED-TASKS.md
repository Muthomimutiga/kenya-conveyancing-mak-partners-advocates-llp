# SCHEDULED-TASKS.md — Kenya Conveyancing Manager

## Daily Briefing — Weekdays 7:30am

Run `/conveyance-status` for ALL active conveyances.

Output format:

```
CONVEYANCING DAILY BRIEFING — [DATE]

OVERDUE
- [Matter] — [Milestone] was due [DATE]

DUE THIS WEEK
- [Matter] — [Milestone] due [DATE]

OFFICIAL SEARCH EXPIRING
- [Matter] — Search expires [DATE] ([X] days remaining)

COMPLETIONS THIS MONTH
- [Matter] — Target completion [DATE]
```

Pull from Airtable: query Milestones table where Status = "Overdue" OR (Status = "Pending" AND Target Date within 7 days). Also check Official Search Expiry within 10 days.
