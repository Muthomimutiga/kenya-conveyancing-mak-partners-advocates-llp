# Drafting Rules — developer_sale_agreement (Universal Spine)

**Scope:** This rule applies to every developer sale agreement generated for MAK Partners, regardless of which developer project the matter relates to.

**Override mechanism:** A matching per-project file (`developer_sale_agreement__<project_slug>.md`) can override or extend any rule below. Where the per-project file is silent, the universal applies.

**Source data:** Each generation receives:
- The matter data from `/new-conveyance` (purchaser, apartment unit, purchase price, deposit, completion target, etc.)
- The project record from `developer-projects.json` (vendor company, title number, banks, stage costs, etc.)
- The per-project drafting rule for the selected `project_slug`

---

## 1. Document Shape

Every developer sale agreement contains the following sections in this order:

1. **Cover page** — Vendor name (caps), "as Vendor", "and", Purchaser placeholder, project name, apartment number, "DRAWN BY" block with MAK address.
2. **Preamble** — date placeholder, "BETWEEN", Vendor block (name, Co. Reg. No., PO Box, "the Vendor of the first part"), Purchaser block (refers to Section I of Schedule).
3. **Recitals** — Vendor's ownership of the Land, the Development, Change of User status, the sale-and-purchase intent referring to Sections II, III of the Schedule.
4. **Definitions and Interpretations** — alphabetised. Always includes: Architect, Architect's Office, Architectural Drawings, Ardhisasa, Building Plans, Business Day, By-Laws, Change of User, Common Property, Corporation, Data Protection laws/regulations, Defects Liability Period (if applicable), Development, Land/Land Act/Land Laws/Land Registration Act, Practical Completion Date, Registrar, Sale Completion Date, Sectional Plan/Properties Act/Regulations/Laws/Title, Service Charge, Unit Factor, Vendor's Advocates, Vendor's Office.
5. **Interpretation block** — joint and several where Purchaser is multiple, singular/plural rules, neuter gender clause, recitals integrated.
6. **The Vendor's Works (and Practical Completion)** — Vendor undertakes construction substantially per Building Plans + Architectural Drawings. Vendor's right to revise materials/specifications. Defects Liability Period (where applicable).
7. **The Purchase Price and Other Payments** — Stage 1 / Stage 2 / Stage 3 cost structure. Reference to Sections V, VI of Schedule. Vendor bank account block.
8. **Overdue Payments** — late-payment grace period (days) + Vendor's right to treat as fundamental breach.
9. **Grant of Possession, Sale Completion, Registration and Property Management** — Possession on Practical Completion + Stage 1/2 paid. Post-DLP inspection window. Acknowledgement of sale. Use limited to private residence. Sale Completion at Vendor's Advocates' offices on Sale Completion Date. Transfer instrument execution + ID/PIN/CR12/photos requirement. Vendor's responsibility for Sectional Plan registration and Corporation registration. By-Laws acknowledgement.
10. **Completion Documents** — list of documents Vendor's Advocates release on registration (original Sectional Title, registered Transfer, KRA e-slip, Valuation Form, Practical Completion Cert, Corp Registration Cert, By-Laws, NCA license, Occupational Cert, registered Sectional Plan, NEMA license).
11. **Property Management** — Purchaser's option to engage TSAVO LIFESTYLE LIMITED as Property Manager.
12. **Termination** — Negotiation Period (30 days good-faith) prior to enforcement. Vendor's Default Notice (30 days to cure) → Vendor's Termination Notice (30 days). Refund within 90 days subject to deduction of legal costs. Right to identify substitute purchaser.
13. **Force Majeure** — extensive list including Act of God, war, civil disturbance, judicial actions, government actions, terror, weather/disaster, fire. 6-month tolerance before either party may terminate.
14. **Warranties** — Vendor's title good and indefeasible, no third-party rights, legal capacity, no buffer/road/riparian/community/public-land issues, no pending litigation, no rights of way given, disclosure undertaking. Breach pre-completion → Termination route applies.
15. **Notices** — written + email. Vendor's notice address. Purchaser address per Schedule. Alternative Contact per Schedule. 5 BD post / 2 BD email deemed effective.
16. **Executory Agreement** — agreement is executory only, not a lease.
17. **COVID Audio-Visual Verification clause** — for projects that include it (see per-project rules).
18. **Changes in Law or Circumstances** — Purchaser bound by changes; may need to sign variations.
19. **Dispute Resolution** — variant per project (arbitration vs NCIA mediation; see per-project rules).
20. **Anti-Money Laundering** — proceeds-of-crime warranty; POCAMLA 2009 + 2021 indemnity.
21. **Data Protection** — DPA 2019 + Data Protection Regulations 2021 compliance.
22. **General Conditions / General Provisions** — assignment restriction (resale admin fee where stipulated), no immaterial-error consequence, time of essence, whole-agreement, severance, severability, governing law (Kenyan).
23. **Schedule of Particulars** — Sections I (Purchaser), II (Apartment), III (Purchase Price), IV (Development), V (Payment Plan: Deposit + Balance + monthly instalments), VI (Utility and Sectional Plan Costs), VII (Alternative Contact).
24. **Schedule of Legal Costs** — itemised table per project (Stage 1, Stage 2, Stage 3). Vendor's Advocates' bank account + MPESA Paybill.
25. **Execution block** — Vendor (Common Seal or Power of Attorney variant — see per-project) + Purchaser. Certifying officer.
26. **DRAWN BY** repeat block at end.

---

## 2. Standard Variable Bindings

The generator binds these JSON paths to clause variables:

| Clause variable | JSON path |
|---|---|
| `{{vendor.company_name}}` | `projects.<slug>.vendor.company_name` |
| `{{vendor.company_registration_number}}` | `projects.<slug>.vendor.company_registration_number` |
| `{{vendor.po_box}}` | `projects.<slug>.vendor.po_box` |
| `{{vendor.notice_address}}` | `projects.<slug>.vendor.notice_address` |
| `{{vendor.notice_email}}` | `projects.<slug>.vendor.notice_email` |
| `{{land.title_number}}` | `projects.<slug>.land.title_number` |
| `{{land.tenure}}` | `projects.<slug>.land.tenure` |
| `{{development.name}}` | `projects.<slug>.development.name` |
| `{{development.unit_breakdown}}` | `projects.<slug>.development.unit_breakdown` |
| `{{development.floors}}` | `projects.<slug>.development.floors` |
| `{{completion.lag_business_days}}` | `projects.<slug>.completion.lag_business_days` |
| `{{completion.anchor}}` | `projects.<slug>.completion.anchor` |
| `{{completion.anticipated_practical_completion_date}}` | `projects.<slug>.completion.anticipated_practical_completion_date` |
| `{{payments.vendor_bank.*}}` | `projects.<slug>.payments.vendor_bank.*` |
| `{{payments.vendor_advocates_bank.*}}` | `projects.<slug>.payments.vendor_advocates_bank.*` |
| `{{payments.late_payment_grace_days}}` | `projects.<slug>.payments.late_payment_grace_days` |
| `{{payments.late_payment_grace_unit}}` | `projects.<slug>.payments.late_payment_grace_unit` |
| `{{payments.stage_1.*}}` etc. | `projects.<slug>.payments.stage_X.*` |
| `{{dispute_resolution.*}}` | `projects.<slug>.dispute_resolution.*` |
| `{{architect.*}}` | `tsavo_group_constants.architect.*` |
| `{{property_manager.*}}` | `tsavo_group_constants.property_manager.*` |
| `{{vendor_advocates.*}}` | `vendor_advocates.*` |
| `{{purchaser.name}}` | matter data |
| `{{purchaser.id_number}}` | matter data |
| `{{apartment.number}}` | matter data |
| `{{apartment.floor}}` | matter data |
| `{{purchase_price.figures}}` | matter data |
| `{{purchase_price.words}}` | matter data |
| `{{deposit.figures}}`, `{{deposit.words}}` | matter data |
| `{{balance.installments_count}}` | matter data |
| `{{balance.monthly_amount}}` | matter data |
| `{{balance.start_month}}` | matter data |

---

## 3. Conditional Rendering Rules (Universal)

These conditions apply unless a per-project rule overrides:

| Condition | Render |
|---|---|
| `completion.defects_liability_period_months == null` | Omit DLP definition + omit Vendor's defect-remedy clause (6.6 / 2.6) entirely. |
| `payments.stage_2.electricity_meter_kes == null` | Omit the electricity meter line item from Schedule of Legal Costs + omit the corresponding K.Shs. row. |
| `incorporates_lsk_conditions_2015 == true` | Insert the standalone "THE LAW SOCIETY CONDITIONS FOR SALE (2015)" clause after the Warranties section. Otherwise omit. |
| `covid_audio_visual_verification_clause == true` | Insert the COVID Audio-Visual Verification clause between Executory Agreement and Changes in Law. Otherwise omit. |
| `vendor_execution_mode == "power_of_attorney"` | Vendor execution block uses the registered Power of Attorney variant (signed by duly authorised and constituted Attorney, PoA number placeholder). Otherwise uses Common Seal variant. |
| `dispute_resolution.type == "arbitration_ciarb_kenya"` | Use the CIArb-Kenya single-arbitrator variant. Otherwise use the NCIA mediation → court two-tier variant. |
| `resale_admin_fee_percent != null` | Insert the resale admin fee sub-clause in General Conditions. Otherwise omit. |
| `completion.anchor == "agreement_signing_date"` | Sale Completion Date defined relative to signing. Omit "Anticipated Practical Completion Date" definition. Generator's milestone calendar starts from signing date for that matter. |
| `completion.service_charge_frequency == "bi_annually"` | Service Charge definition reads "a bi-annually sum" instead of "a monthly sum". |
| `tenant_handover_notice_days != null` | Insert the tenant-in-occupation handover notice sub-clause in Section 4 (Conditions for Possession). |

---

## 4. Stylistic Constraints

- **Numbered clauses with bullet sub-clauses** — preserve the MAK house style (numeric headings 1, 2, 3; bullets for sub-clauses; nested where needed).
- **"Kenya Shillings" in full + figures in parentheses** — e.g., "Kenya Shillings Twenty-Five Thousand (K.Shs.25,000/=)". Always.
- **All-caps for capitalised defined terms** — Vendor, Purchaser, Land, Development, Apartment, Sale Completion Date, etc.
- **"Wakili" not "Counsel" or "Attorney"** in signature blocks where MAK signatories appear.
- **Footer on every page** — MAK address block per the firm's marketing footer (4th Floor Victoria at Two Rivers).
- **No em dashes** — use commas, semicolons or parenthetical asides.

---

## 5. Quality Gates Before Output

The generator must verify before writing the DOCX:

1. **All `{{...}}` placeholders resolved** — none left in the output. If any unresolved, raise an error and abort.
2. **All required matter fields present** — purchaser name + ID/PIN, apartment number + floor, purchase price (figures + words), deposit, balance + instalments + start month, target completion date.
3. **`project_slug` valid** — must match a key in `developer-projects.json`.
4. **No stranded references** — if DLP is null, no remaining mention of DLP in the output. If electricity meter is null, no remaining mention of electricity in Schedule.
5. **No em dashes** — auto-sweep replace.

---

## 6. File Naming Convention for Output

`Developer Sale Agreement - [Project Short Label] - Apt [unit] - [Purchaser Surname] - [YYYY-MM-DD].docx`

Example: `Developer Sale Agreement - Tsavo Skywalk - Apt 12C - Mwangi - 2026-05-19.docx`

---

## 7. Future Extensions

When Ann sends the remaining 2 project templates (out of 8 total):

1. Append a new entry to `developer-projects.json` under `projects.<new_slug>`.
2. Create a corresponding `developer_sale_agreement__<new_slug>.md` per-project rules file (use Tsavo Skywalk's as the simplest baseline if no overrides needed).
3. No code change required.

---

## 8. Related

- `developer-projects.json` — the registry.
- `developer_sale_agreement__royal_suburb_1.md` (and other per-project files).
- `validated-formats.json` — records which doc_type variants have been validated end-to-end.
- `generate-conveyancing-document.js` — `buildDeveloperSaleAgreement(matter, project)` function (Phase 3).
- `commands/new-conveyance.md` — intake; asks for `project_slug` when seller is developer.
- `commands/draft-conveyance-doc.md` — drafts; reads `project_slug` from matter.
