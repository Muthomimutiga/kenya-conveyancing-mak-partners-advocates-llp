# Milestone Logic — Kenya Conveyancing Cycle

## Two clocks: how to read the "Day" values below

The "Day N" on each milestone is a **default offset for a ready-built / individual sale**, where instructions and completion are roughly 90 days apart. For developer matters the cycle is split across two anchors (see `SKILL.md` §2):

- **Front cluster (Milestones 1–5)** is anchored to the Instructions Date (Day 0). The "Day" values below apply directly — these run early regardless of the project.
- **Back cluster (Milestones 6–9)** is anchored to the **Completion Date** (= `anchor_date` + `lag_business_days` for developer matters), not to Day 0. On an off-plan project the back cluster sits months later than the "Day 45–90" values below suggest; the gap is the construction wait. Read Milestones 6–9 as "Completion − 30 / − 20 / − 12 / 0 business days," not as fixed days from instructions.

The statutory facts on each milestone (validity periods, processing times, required certificates) are correct in all cases. Only the calendar anchoring differs by matter type.

## The 9 Milestones

---

### Milestone 1 — Instructions + Sale Agreement

- **Day:** 0
- **LRA forms:** None
- **Key task:** Take instructions. Draft Agreement for Sale incorporating LSK Conditions of Sale 2015 by reference.
- **Legal note:** The Agreement is an unregistered contract only (s.36(2) LRA). No legal interest in land passes to the buyer until registration of the Transfer (s.43(2) LRA).
- **Deposit:** 10% of Purchase Price (LSK Condition 5.3). Held by Vendor's Advocates as stakeholders.
- **Skip condition:** None — always required.
- **Triggers:** Everything. Day 0 is the anchor for all subsequent milestone dates.

---

### Milestone 2 — Official Search

- **Day:** 7–14
- **Form:** LRA 84 (Application for Official Search — triplicate). Result: LRA 85 (Official Search Certificate).
- **Fee:** KES 1,000
- **Processing time:** 5 business days (Reg. 32)
- **Validity:** 30 days (industry practice — create Outlook Calendar expiry reminder)
- **14-day protection period:** Lodging LRA 84 with the proprietor's written consent suspends registration of any other instrument on that title for 14 days (ss.36(8)–(9) LRA). Any instrument lodged during this period has priority over cautions and other instruments presented during the same period.
- **What to verify in LRA 85:**
  - Registered proprietor name matches seller
  - Any charges, cautions, restrictions, or inhibitions on the register
  - Land user category (residential / commercial / agricultural / industrial)
  - Registered area and dimensions
  - Check for LRA 10 (Spouse's Interest) note
- **Skip condition:** None — always required.

---

### Milestone 3 — LCB / NLC Consent

- **Day:** 14–30
- **Applies to:** Agricultural land (LCB) OR leasehold (NLC). Freehold non-agricultural = SKIPPED.

**LCB Consent (Agricultural Freehold):**
- Authority: Land Control Act Cap. 302 + s.6 Land Control Act
- LCB meets monthly — apply immediately on receiving instructions
- Allow 4–6 weeks for consent
- Validity: 6 months from date of grant
- Without LCB consent: any dealing in agricultural land is void (s.6(1) Land Control Act)

**NLC Consent (Leasehold):**
- Authority: ss.55–56 LRA + Land Act Cap. 280
- Required for ALL dealings in leasehold land (transfers, charges, subleases, assignments)
- Apply to National Land Commission (NLC)
- Also produces the Land Rent Clearance Certificate — obtain both simultaneously
- Validity: 6 months typically

- **Skip condition:** Freehold, non-agricultural land → SKIPPED. Mark Status = "Skipped" in Airtable.

---

### Milestone 4 — Rates Clearance

- **Day:** 14–30 (runs parallel with Milestone 3)
- **Purpose:** Certificate confirming all land rates to the County Government are fully paid.
- **Issued by:** County Government for the county where the land is situated.
- **Nairobi:** Online portal (Nairobi City County e-payment system). Apply online; certificate issued electronically.
- **Other counties:** Physical application to County Land Rates office.
- **Required by:** Condition 8.4(c) LSK Conditions of Sale — Vendor must deliver original valid Rates Clearance Certificate on Completion Date (valid for at least 21 days from Completion Date) + payment receipts for last 3 years.
- **Skip condition:** None — always required.

---

### Milestone 5 — Rent Clearance (Leasehold Only)

- **Day:** 14–30 (typically obtained simultaneously with Milestone 3)
- **Purpose:** Certificate confirming all land rent to the NLC/Government is paid.
- **Required by:** s.55(b) LRA — no leasehold dealing can be registered without a Land Rent Clearance Certificate.
- **Issued by:** National Land Commission.
- **Required delivery at Completion:** Condition 8.4(d) LSK Conditions of Sale — original valid Land Rent Clearance Certificate + receipts for last 3 years.
- **Skip condition:** Freehold → SKIPPED automatically. Mark Status = "Skipped" in Airtable.

---

### Milestone 6 — Stamp Duty Assessment + Payment

- **Day:** 45–60
- **Legal basis:** Stamp Duty Act Cap. 480. s.46 LRA: absolute gateway — the Registrar shall not accept any instrument for registration unless it is duly stamped.
- **Rates:**
  - Urban land: 4% of purchase price or market value (whichever is higher)
  - Rural land: 2% of purchase price or market value (whichever is higher)
  - Verify current rates with KRA before advising the client — rates may change.
- **Process:**
  1. Self-assessment on KRA iTax portal
  2. Generate payment slip
  3. Pay via M-Pesa or bank transfer
  4. Stamps affixed to the Transfer instrument (or electronically endorsed)
- **Stamp duty base:** The higher of: (a) the purchase price agreed by parties; (b) the market value as assessed by the government valuer. If KRA disputes the declared value, a valuation by the Chief Government Valuer may be required.
- **Stamp duty rates:** 4% of the (higher of price or assessed value) for land within a municipality or town; 2% for agricultural / rural land.
- **Payment deadline:** stamp duty is payable within **30 days** of the date of the instrument (or of assessment); late payment attracts a penalty. It is the Purchaser's cost.
- **Capital Gains Tax (Vendor's liability):** **15%** of the net gain on the transfer, payable to KRA on or before transfer. This is separate from stamp duty. Confirm the Vendor's CGT position before Completion.
- **Skip condition:** None — no instrument can be registered without stamp duty payment.

---

### Milestone 7 — Transfer Documents Prepared

- **Day:** 60–70
- **Primary forms:**
  - Freehold: LRA 33 (Transfer of Interest in Land)
  - Leasehold: LRA 63 (Transfer of Lease)
- **Mandatory cover form:** LRA 9 (General Application for Registration — quadruplicate — accompanies EVERY instrument lodged at the registry without exception).
- **Execution (s.44 LRA) and verification of execution (s.45 LRA + Reg. 88, Fourth Schedule):**
  - Signed by both Transferor AND Transferee
  - Verified (witnessed) by a qualified advocate, Judge, Magistrate, Kadhi, Registrar, Deputy Registrar, or Superintendent of Prisons
  - Attesting witness must sign on the same page as the executing party's name (Reg. 87)
- **Transferee attachments to accompany lodgement:**
  - Certified copy of National ID or Passport
  - Copy of KRA PIN certificate
  - 2 passport-size photographs
  - Marriage certificate (if applicable)
  - If company: Certificate of Incorporation + CR12 (extract from Registrar of Companies)
  - Power of Attorney (LRA 5 or LRA 6) if signing through an attorney — must be registered before use
- **If property is charged:** Also prepare LRA 58 (Discharge of Charge) — signed by the Chargee (lender). Lender's written consent to the transfer is required (s.59 LRA). The discharge must be lodged simultaneously with the Transfer.
- **Spousal consent:** Obtain the spouse's consent to the dealing whenever the Transferor (or Chargor) is or may be married. Basis: s.93 Land Registration Act 2012 read with s.12 Matrimonial Property Act 2013; constitutional anchor Article 45(3). The spousal interest is an **overriding interest under s.28 LRA**, so it binds even when LRA 10 is NOT noted on the register: do not treat an LRA 10 note as the trigger. For a charge over a matrimonial home, also s.79(3) Land Act 2012. Use the standalone Spousal Consent form or the consent block in the Agreement for Sale.

---

### Milestone 8 — Registration at Land Registry

- **Day:** 70–80
- **Lodge at Land Registry:**
  - LRA 9 (quadruplicate)
  - LRA 33 or LRA 63 (two counterparts each — Reg. 22)
  - Original title document (Certificate of Title or Certificate of Lease)
  - Stamped Transfer instrument
  - All consents and clearances (LCB/NLC consent, Rates Clearance, Rent Clearance if leasehold)
  - Transferee attachments
  - Registration fees (electronic payment or banker's cheque — no cash, Reg. 36)
- **Fees:** Transfer registration: KES 1,000
- **Late penalty:** If instrument is more than 3 months old from execution date: additional fee = registration fee per additional 3-month period, capped at 2× the original fee (s.36(4) LRA).
- **Registry hours:** Monday–Friday 9:00am–1:00pm and 2:00pm–4:00pm (Reg. 4). Instruments presented outside these hours are treated as presented at 9:00am the next business day.
- **Processing time:** 10 business days (Reg. 32).
- **Rejection:** If rejected, Registrar issues LRA 22 (Notice of Rejection). Applicant may appeal to the County Registrar within 14 days.
- **Priority rule:** Priority determined by order of presentation to the registry — NOT the date of the instrument (s.36(5) LRA).

---

### Milestone 9 — Completion

- **Day:** 80–90 (or the contractually agreed Completion Date)
- **Form:** LRA 19 (Application for Certificate of Title or Certificate of Lease). Fee: KES 2,500.
- **Process:**
  - Old Certificate of Title cancelled
  - New Certificate of Title issued in buyer's name (s.30 LRA)
  - Certificate of Lease issued only for leases exceeding 21 years (s.30(2)(b) LRA)
  - Balance of Purchase Price released to Vendor's Advocates on delivery of registered title to Purchaser's Advocates
- **Undertaking letter:** Buyer's advocate holds the balance of the Purchase Price in trust and releases it only against delivery of the registered Transfer and new Certificate of Title.
- **Completion venue:** Vendor's Advocates' office (or as agreed) — LSK Condition 8.2.
- **Completion Documents (Vendor to deliver — LSK Condition 8.4):**
  - Original Certificate of Title
  - Duly executed Transfer (triplicate)
  - Original valid Rates Clearance Certificate (valid 21+ days from Completion Date)
  - Land Rent Clearance Certificate + 3 years' receipts (leasehold)
  - Latest utility bills paid to Completion Date
  - Copy of ID / PIN / passport photos of Vendor (and Directors if company)
  - All consents
  - Discharge of Charge (if applicable)
