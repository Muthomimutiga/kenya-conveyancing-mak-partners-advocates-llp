---
name: conveyancing-cycle
description: >
  Core logic skill for the Kenya Conveyancing Manager. Handles milestone date
  calculation, leasehold vs freehold branching logic, official search expiry
  tracking, overdue detection, and status assessment. Triggered by
  /new-conveyance, /conveyance-status, and /complete-milestone.
version: 0.1.0
---

# Conveyancing Cycle Logic

This skill contains the rules that drive the 9-milestone conveyancing cycle. Apply these rules whenever opening a new matter, checking status, or advancing milestones.

---

## Reference Files

- `references/milestone-logic.md` — the 9 milestones with day windows, skip conditions, and dependencies
- `references/kenya-conveyancing-law.md` — key statutory rules (LRA, Land Act, Stamp Duty Act, Land Control Act)

---

## Core Logic Rules

### 1. Tenure Determination

At intake, the tenure drives everything:

**Freehold:**
- Milestone 5 (Rent Clearance) → SKIPPED
- Milestone 3 (Consent) → SKIPPED unless land is agricultural (outside municipality/town)
- Transfer instrument: LRA 33
- No NLC consent required
- No Land Rent Clearance Certificate required

**Leasehold:**
- Milestone 3 = NLC consent (not LCB) — required for ALL leasehold dealings (ss.55–56 LRA)
- Milestone 5 (Rent Clearance) = REQUIRED — Land Rent Clearance Certificate from NLC (s.55(b) LRA)
- Transfer instrument: LRA 63 (Transfer of Lease)
- Milestones 3 and 5 often run in parallel — obtain simultaneously from NLC

**Agricultural freehold:**
- Milestone 3 = LCB consent — Land Control Act Cap. 302
- LCB meets monthly — allow 4–6 weeks
- Validity: 6 months from grant

---

### 2. Milestone Date Calculation

Milestones run on **two clocks**, anchored separately. Never count all nine forward from Day 0 — that is correct only for a ready-built unit and wrong for off-plan.

**Step 1 — resolve the Completion Date.**

- **Developer / off-plan matter:** Completion Date = `anchor_date` + `lag_business_days`, both from the project's `completion` block in the plugin's `scripts/developer-projects.json` (path is relative to the plugin root, not this skill folder). The `anchor` is one of:
  - `agreement_signing_date` — ready-built unit; anchor date is the signing date.
  - `practical_completion_date` — built, new title issued; anchor date is practical completion.
  - `anticipated_practical_completion_date` (APCD) — off-plan / under construction; anchor date is the APCD, captured and confirmed per matter at intake (the registry value may be stale).
- **Individual sale:** Completion Date = the target completion date the advocate gives.

**Step 2 — front cluster, anchored to the Instructions Date (Day 0).** Confirms title and starts clearances early; runs the same regardless of how far completion is:

| Milestone | Target |
|---|---|
| 1 — Instructions + Sale Agreement | Day 0 |
| 2 — Official Search | + 5 business days |
| 3 — LCB / NLC Consent | + 10 business days |
| 4 — Rates Clearance | + 10 business days |
| 5 — Rent Clearance (leasehold) | + 10 business days |

**Step 3 — back cluster, anchored to the Completion Date.** Stamp duty, transfer, and registration cannot happen until the unit is ready and paid for:

| Milestone | Target |
|---|---|
| 6 — Stamp Duty | Completion − 30 business days |
| 7 — Transfer Documents | Completion − 20 business days |
| 8 — Registration | Completion − 12 business days |
| 9 — Completion | Completion Date |

Count business days Monday–Friday, skipping weekends. For a ready-built unit (signing + 90 BD) the two clusters sit close together — the classic ~90-day cycle. For an off-plan unit (APCD + 90 or 180 BD) the back cluster floats out to near practical completion; the gap between the clusters is the construction wait. On a short cycle, keep the back cluster ordered with minimum gaps rather than collapsing it: Stamp Duty (M6) >= Milestone 5 + 1 business day; Transfer (M7) >= M6 + 5 business days; Registration (M8) >= M7 + 5 business days; Completion (M9) >= M8 + 10 business days. Where the raw "completion minus offset" would put two milestones on the same day or out of order, these minimum gaps govern.

**Official Search Expiry** = Milestone 2 date + 30 calendar days. On an off-plan matter the early search lapses long before completion, so a fresh official search is needed close to completion — note this on the Milestone 2 record.

---

### 3. Overdue Detection

A milestone is Overdue if:
- Target Date < today AND Status = "Pending" or "In Progress"

Flag as URGENT when Milestone 2 (Official Search) IS completed, its Official Search Expiry is within 10 days, and Registration (Milestone 8) has not yet occurred. A search lapsing before registration means a fresh official search is needed to protect priority. (A search not yet done has no expiry, so the trigger requires M2 completed, not pending.)

---

### 4. Processing Time Rules

These govern how long each registry/government step actually takes:

| Step | Processing Time | Authority |
|---|---|---|
| Official Search (LRA 84) | 5 business days | Reg. 32 LRA Regulations |
| Transfer registration | 10 business days | Reg. 32 |
| Discharge of charge | 7 business days | Reg. 32 |
| LCB consent | 4–6 weeks (meets monthly) | Land Control Act |
| NLC consent | Variable — allow 3–4 weeks | Land Act |
| Rates clearance | 3–5 business days (Nairobi online) | County practice |
| Stamp duty (iTax) | 1–2 business days | KRA practice |

---

### 5. Late Registration Penalty

If an instrument is lodged more than 3 months after its execution date:
- Additional fee = registration fee × number of 3-month periods elapsed
- Capped at twice the original fee (s.36(4) LRA)

Flag this automatically if Transfer Documents (Milestone 7) date is more than 3 months from the Registration (Milestone 8) target date.

---

### 6. Spousal Interest Check

If LRA 10 (Spouse's Interest) is noted on the register, the spouse must consent to any dealing. Flag this at Milestone 7 (Transfer Documents) preparation. The Transfer instrument cannot be registered without spousal consent if LRA 10 is noted.
