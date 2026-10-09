---
name: conveyancing-cycle
description: >
  Core logic skill for the Kenya Conveyancing Manager. Handles milestone date
  calculation, leasehold vs freehold branching logic, official search expiry
  tracking, overdue detection, and status assessment. Triggered by
  /new-conveyance, /conveyance-status, and /complete-milestone.
version: 0.1.0
last_verified: 2026-07-22
freshness_window: 90d
freshness_category: volatile
verified_against: "LRA 2012; Land Act 2012 Cap 280; Land Control Act Cap 302; Stamp Duty Act Cap 480; Income Tax Act (CGT); LRA Registration Regs; LSK Conditions of Sale 2015"
---

# Conveyancing Cycle Logic

This skill contains the rules that drive the 9-milestone conveyancing cycle. Apply these rules whenever opening a new matter, checking status, or advancing milestones.

---

## Scope, Audience, and How to Use

**Audience:** the firm's conveyancing advocates and fee earners running Kenyan sale/transfer matters. Claude surfaces and calculates; it does not decide.

**Work shape:** bounded transactional. Milestones, day windows, and statutory triggers are defined in advance; deviations are flagged for the advocate rather than resolved by Claude.

**Delegation:** the skill calculates dates and flags statutory requirements and deviations. The advocate verifies the anchors and dates and decides. Outputs are legal support, not legal advice, and the advocate confirms current law before advising the client.

**Confidence:** where tenure, agricultural status, or title state is uncertain, surface it and ask. Never assume. See Confidence Bands below.

**Confidentiality:** matter data (client IDs, KRA PINs, prices) is confidential and may attract advocate-client privilege (Evidence Act Cap 80 ss.134-137). Keep it within the firm's authorised systems and do not expose it beyond the matter. See Privilege and Confidentiality below.

---

## Privilege and Confidentiality

The matter records, notes, drafts, and communications this skill handles, including client national ID and KRA PIN numbers, purchase prices, deposit amounts, and title particulars, are privileged advocate-client communications under the Evidence Act (Cap 80) sections 134 to 137. Before writing any of them to Airtable or any other third-party service, confirm the firm's data policy permits storing privileged client matter there. Claude calculates and organises; it does not assert a legal conclusion to a client or to any third party. Do not share matter data outside the firm without the advocate's authorisation.

---

## Confidence Bands

- High: the tenure, dates, and statutory triggers are explicit and unambiguous. Calculate and propose the milestone schedule.
- Medium: the tenure, agricultural status, or title state is clear but a date, figure, or party is stated only in relative terms or is otherwise uncertain. Surface it with your reasoning and ask before proceeding.
- Low: the input is garbled, the matter type is unknown, or two facts conflict (for example, the instructions say freehold but the official search shows a registered lease). Name the uncertainty and hand back to the advocate.

Never produce a milestone schedule or a status flag at uniform confidence.

---

## Reference Files

- `references/milestone-logic.md`: the 9 milestones with day windows, skip conditions, and dependencies
- `references/kenya-conveyancing-law.md`: key statutory rules (LRA, Land Act, Stamp Duty Act, Land Control Act)

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
- Milestone 3 = NLC consent (not LCB): required for ALL leasehold dealings (ss.55–56 LRA)
- Milestone 5 (Rent Clearance) = REQUIRED: Land Rent Clearance Certificate from NLC (s.55(b) LRA)
- Transfer instrument: LRA 63 (Transfer of Lease)
- Milestones 3 and 5 often run in parallel; obtain simultaneously from NLC

**Agricultural freehold:**
- Milestone 3 = LCB consent: Land Control Act Cap. 302
- LCB meets monthly, allow 4–6 weeks
- Validity: 6 months from grant

---

### 2. Milestone Date Calculation

Start from the Instructions Date (Day 0). Use business days where a regulation specifies, calendar days otherwise.

| Milestone | Default Calendar Day from Instructions Date |
|---|---|
| 1: Instructions + Sale Agreement | Day 0 |
| 2: Official Search | Day 7 |
| 3: LCB/NLC Consent | Day 14 |
| 4: Rates Clearance | Day 14 |
| 5: Rent Clearance (leasehold) | Day 14 |
| 6: Stamp Duty | Day 45 |
| 7: Transfer Documents | Day 60 |
| 8: Registration | Day 70 |
| 9: Completion | Day 90 (or target completion date): the sale agreement's ninety-day completion |

Where a target completion date is given, use it as the anchor for Milestone 9 and work backwards.

**Official Search Expiry** = Milestone 2 date + 30 days.

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
| NLC consent | Variable, allow 3–4 weeks | Land Act |
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

---

## Worked Example

**Input:** Individual sale, freehold, non-agricultural land (Nairobi/Block 45/210), so no LCB or NLC consent applies. Instructions Date (Day 0): 3 August 2026. Purchase Price: KES 8,500,000. Deposit (10%, LSK Condition 5.3): KES 850,000. No target completion date has been fixed by the parties, so Milestone 9 runs on the default Day 90.

**Output:**

| Milestone | Target Date |
|---|---|
| 1: Instructions + Sale Agreement | 3 Aug 2026 (Day 0) |
| 2: Official Search | 10 Aug 2026 (Day 7) |
| 3: LCB/NLC Consent | SKIPPED, freehold and non-agricultural |
| 4: Rates Clearance | 17 Aug 2026 (Day 14) |
| 5: Rent Clearance | SKIPPED, freehold |
| 6: Stamp Duty | 17 Sep 2026 (Day 45) |
| 7: Transfer Documents | 2 Oct 2026 (Day 60) |
| 8: Registration | 12 Oct 2026 (Day 70) |
| 9: Completion | 1 Nov 2026 (Day 90) |

Official Search Expiry = 10 Aug 2026 + 30 days = 9 September 2026.

Surface this schedule to the advocate for confirmation before writing it to Airtable.

---

## What This Skill Does NOT Do / When to Escalate

It does NOT handle non-sale dealings (charge/mortgage only, transmission on death, lease under 21 years, subdivision-only), disputed or court-ordered titles, or contentious matters. It does NOT decide whether to proceed with a transaction, verify title on the advocate's behalf, or give the client legal advice; it calculates dates and flags statutory requirements, nothing more.

Stop and route to the advocate when:
- the matter is not a standard sale/transfer
- the official search reveals a caution, inhibition, or restriction
- the title state contradicts the instructions given at intake
- the instructions themselves conflict with one another
- the input is unreadable or too garbled to extract reliably

---

## Ownership and Review

Owner: Robin Advisory Group (build) for the firm's conveyancing practice. Review trigger: on any change to the LRA forms, the Land Control Act, the Stamp Duty Act, KRA rates, or the LSK Conditions of Sale, and in any case within the freshness window declared above.
