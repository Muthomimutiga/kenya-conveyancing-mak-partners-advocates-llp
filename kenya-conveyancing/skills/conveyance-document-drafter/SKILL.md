---
name: conveyance-document-drafter
description: >
  Drafts all conveyancing documents for Kenyan property transactions: Sale
  Agreement, Requisitions on Title, Completion Notice, Undertaking Letter,
  consent application letters, rates clearance applications, client update
  letters, and any of the 70 Ministry of Lands LRA registry forms the plugin
  carries, from LRA 33 Transfer, LRA 63 Transfer of Lease and LRA 58 Discharge
  of Charge to cautions, restrictions, charges, leases, easements, partitions,
  personal-representative transfers and rectification applications.
  Triggered by /draft-conveyance-doc, /new-conveyance, and /complete-milestone.
  Also trigger from natural-language requests such as "draft a letter of
  engagement", "draft an LRA 63", "draft an LRA 67", "draft a caution", "draft a
  transfer", "draft a client update", "draft an undertaking", or "draft a
  conveyancing letter", even when the user does not invoke a slash command.
version: 0.2.0
last_verified: 2026-09-23
freshness_window: 180d
freshness_category: statutory-forms
verified_against: "The Ministry of Lands published LRA forms at lands.go.ke (fetched 2026-09-22, held verbatim in scripts/form-schemas/_source); LRA 2012; Land Registration (General) Regulations 2017; Land Act 2012; Land Control Act Cap 302; Stamp Duty Act Cap 480; Matrimonial Property Act 2013; LSK Conditions of Sale 2015; KRA stamp-duty and CGT rates"
---

# Conveyance Document Drafter

Drafts conveyancing work products for MAK & PARTNERS ADVOCATES LLP. Every document must be accurate, properly formatted, and ready to print.

## Audience and Work Shape

Audience: qualified advocates and conveyancing clerks at MAK & Partners Advocates LLP; every output is a draft for the responsible advocate to review, settle, and take responsibility for. Work shape: Bounded Transactional. Claude fills marked placeholders and surfaces deviations; it does not select between legal options or advise whether to transact.

---

## Verbatim rule (non-negotiable)

Use the reference template text **verbatim**. Fill only clearly-marked placeholders and matter-specific facts (party names, LR number, price, dates) taken from the user or the Conveyance Airtable record. **Never invent, paraphrase, summarise, or augment a substantive clause** from your own knowledge. The cost of one fabricated or reworded clause reaching a client is unrecoverable. If a required clause or fact is missing, leave a clearly-marked `[PLACEHOLDER]` and flag it; do not fill a legal term with a plausible guess. Where a generator script exists for the document, use it (it carries the verbatim body and hard-fails on missing data) rather than hand-drafting a substitute.

---

## Privilege and Confidentiality

Client instructions, drafting notes, and client update letters this skill handles can be privileged advocate-client communications under the Evidence Act (Cap 80) sections 134 to 137. The registry instruments (LRA 33, LRA 63, LRA 58, Requisitions on Title) and third-party correspondence (consent applications, rates clearance applications, completion notices, undertaking letters) are not privileged once filed or served, since they are addressed to the Land Registry, a County Government office, or opposing counsel, but they still carry client-identifying and financial detail the firm owes a duty of confidentiality over. Before writing any draft, note, or client communication to Airtable, the firm's mail or calendar, or any other third-party service, confirm the firm's data policy permits storing that content there. Claude drafts and fills placeholders; it does not assert a legal conclusion to the client or to any third party. Do not share matter content outside the firm without the advocate's authorisation.

---

## Firm Profile

Use these details wherever the firm's information appears. Never output "[FIRM NAME]". Always use the actual details.

```
MAK & PARTNERS ADVOCATES LLP
4TH FLOOR, VICTORIA AT TWO RIVERS, TWO RIVERS DEVELOPMENT, LIMURU ROAD, NAIROBI
P.O. BOX 10644-00100, NAIROBI
NAIROBI, KENYA
Tel: +254 100 939 727
Email: mak@makadvocates.com
```

**Principal Advocate (firm-level):** KEN ASHIMOSI, Advocate of the High Court of Kenya

**The advocate having conduct of the matter is NOT the Principal Advocate.** MAK & Partners Advocates LLP has several conveyancing fee earners. Whoever is running the plugin signs in first: look them up in the Team Members table of the firm's Airtable base, write a record to the Sign-ins table, and pass that as the `advocate` block in the data file (name, P.105 number and email, read from the directory, never typed from memory). The signing identity comes from the Team Members directory and from nowhere else. There is no file on disk that can supply it: not in the plugin directory, not in the user's home, not through an environment variable, and there is no fallback to the firm partner. A document that names or signs for an individual advocate without a directory-sourced `advocate` block is not produced at all; the generator refuses and writes nothing. That is deliberate and it is tested: a valid-looking config placed in every location the plugin once read is still refused. Firm-level details (firm name, address, letterhead, the DRAWN BY block, the LSK practice number, the KRA PIN, the Commissioner for Oaths) come from `scripts/firm-config.json` and are shared by everyone. Never name the Principal Advocate as the signing advocate or as the advocate having conduct unless he is the person running the plugin.

---

## Output Format Rules

### Category A: Letterhead Documents

These go on the firm's official letterhead. Begin output with:

```
══════════════════════════════════════════════════════════
[PRINT ON FIRM LETTERHEAD: MAK & PARTNERS ADVOCATES LLP]
══════════════════════════════════════════════════════════
```

**Category A conveyancing documents:** Sale Agreement, Completion Notice, Undertaking Letter, all application letters (consent applications, rates clearance applications, rent clearance applications, official search application letters), client update letters, reminder/chase notices.

**How the generator lays the letterhead out (since 1.5.0).** `scripts/firm-letter.js` is the firm letter page, shared by every Category A document: the header image anchored edge to edge at the top of page one, behind the text; the footer image anchored edge to edge at the bottom of every page; margins computed from the images so body text stays clear of both and the footer never covers a signature; the firm's correspondence font throughout; `Our Ref | Your Ref | Date` on tab stops; the recipient block bold with the town underlined; the RE line bold and underlined; and the firm's sign-off ("Yours faithfully, / For and on behalf of / MAK & PARTNERS ADVOCATES LLP / NAME / Advocate (P.105/…) / Advocates for the Vendor|Purchaser") held together on one page. `conveyance_letter` (`/draft-letter`), `fee_note`, `undertaking_letter` and `undertaking_request` use it. `engagement_letter` (`/draft-engagement-letter`, and 5b of `/new-conveyance`) is the firm's eleven-clause letter of engagement, signed by the firm partner (KEN ASHIMOSI, using the title configured in `firm_partner_title`) with the running advocate named as assisting in the Communication clause; it prints no fee table and no bank details on it. The fee note carries the firm's own account details, read from the **Firm Settings** table of the conveyancing base and passed in the data file as a `firm_bank` block (never from `scripts/firm-config.json`, which is read only at the client, and never typed from memory); with no `bank_account_no` in Firm Settings the fee note is refused and the fix is `/setup-conveyancing` step 4g. Sale agreements and registry forms carry no letterhead. Never rebuild the letterhead by hand in a data file: no address lines, no firm name at the top, no inline images. The page does it.

---

### Category B: Registry Documents (Filed at Land Registry)

These are not printed on letterhead. They carry the formal DRAWN AND FILED BY block at the bottom.

**Category B conveyancing documents:** LRA 33 (Transfer of Interest in Land), LRA 63 (Transfer of Lease), LRA 58 (Discharge of Charge), LRA 84 (Application for Official Search), Requisitions on Title, and every form in the LRA form library below. A registry form carries no letterhead and carries a page number in its footer.

**DRAWN AND FILED BY block (all Category B documents):**

```
DRAWN AND FILED BY:
MAK & PARTNERS ADVOCATES LLP
4TH FLOOR, VICTORIA AT TWO RIVERS, TWO RIVERS DEVELOPMENT, LIMURU ROAD, NAIROBI
P.O. BOX 10644-00100, NAIROBI
NAIROBI, KENYA
TEL: +254 100 939 727
EMAIL: mak@makadvocates.com
```

### LRA forms the plugin does not draft (Category C)

The 25 forms in `scripts/form-schemas/_excluded.json` are registers, certificates,
notices, orders and summonses the Land Registrar issues. They are not advocates' work
product and the plugin does not produce them. Name the form, give the reason from the
entry, and offer the practitioner form that answers it (for LRA 85, the certificate of
official search, that is the LRA 84 application). Do not hand-type a registrar's form as
a substitute.

---

## The LRA form library

The plugin drafts 70 of the Ministry of Lands' 95 published LRA forms. Four of them,
LRA 33, LRA 63, LRA 58 and LRA 84, have hand-built builders in
`scripts/generate-conveyancing-document.js`. The other 66 are a schema library:
one JSON file per form in `scripts/form-schemas/`, rendered by a single engine.

**The index is the map.** `scripts/form-schemas/_index.json` is the only list of what the
plugin can draft. Each entry carries the `form_id` to put in `doc_type`, the
`form_number` as the Ministry spells it, the `doc_title`, the `regulation`, the
`when_used` sentence, the names of the form's `custom_fields`, and `pairs_with_lra9`.
Read it when a form is asked for; never recall a form number or a form's contents from
memory. `scripts/form-schemas/README.md` is the library's contract, and
`scripts/form-schemas/_review-log.md` records that a person has read each rendered form
against its source.

**The text is the Ministry's.** Every title, regulation, detail row, operative paragraph,
execution wording, registry block and footnote a schema carries is copied verbatim from
the official form, held in `scripts/form-schemas/_source/lra-NN.txt` as published at
lands.go.ke. `scripts/form-schemas/lint.js` enforces the **schema text** in both
directions: it fails when a schema carries words the official text does not, and warns
when an operative paragraph of the official form appears nowhere in the schema.

Know what that check does not reach. The lint takes the first forty characters of each
block and reads only what the schema itself carries, so the **engine's own furniture**
(the signing frames, the certificate of verification, the seal blocks, the registry
block's default wording, the annex's jurat) is invisible to it, and so is anything past
the first forty characters of a block. That layer is checked by hand instead: every form
was rendered and read page by page against its source, and the reading is logged in
`scripts/form-schemas/_review-log.md`. Automated on the text, reviewed by a person on the
furniture; neither on its own would be enough.

**Fields are asked, never guessed, and not every field is declared.** Most of the blanks a
form leaves are declared fields, each with its own `label` and `prompt` written for the
person answering. The index carries the field names; the labels and prompts are in the
schema file itself, `scripts/form-schemas/<form_id>.json`, so open it once the form is
resolved. A **required declared field** the data file does not carry stops the run before
a single byte is written, naming the field:
`REFUSED: [lra_67] custom field "interest_claimed" (Interest claimed) is required.`

The rest of the blanks are the eleven **base fields**, which by design need no
declaration and are therefore in no `custom_fields` list: `vendor_name`, `vendor_id`,
`purchaser_name`, `purchaser_id`, `property_lr_no`, `property_location`,
`purchase_price_words`, `purchase_price_figures`, `date`, `declaration_text`,
`sworn_at` (the list is in `scripts/form-schemas/README.md`). **Nothing refuses on
these.** A form that needs one and does not get it prints the blank and exits zero: LRA
35 and seven of its siblings print `Consideration  Kenya Shillings  (Kshs. /=)` with no
price, and LRA 47 prints a statutory declaration with no grounds between its opening and
its closing. Asking only the declared fields is not enough; 6b of
`/draft-conveyance-doc` says how to find the base fields a given form uses, and the rule
is to ask for those too and then to read the finished document before presenting it.

A registry blank filled with a plausible guess is worse than a refusal, because the
refusal is visible and the guess is not. A registry blank left empty because nothing
asked for it is worse still, because neither is visible.

**Registrar-issued forms are refused by name.** The 25 forms in `_excluded.json` are
registers, certificates, notices, orders and summonses the registry issues. Each entry
carries its reason. Refuse the form, give the reason, offer the nearest practitioner
form, and do not draft the registrar's document in its place.

**Three published files are defective, and the library says so out loud.** The Ministry's
own .doc files for three forms are incomplete where they matter:

| Form | What the published file does | What the plugin renders |
|---|---|---|
| LRA-32 (FORM OF CONSENT OF A CHARGEE TO A PARTITION) | the converted text stops at `EXECUTION:`, so nothing after that line exists in the source | the engine's standard deed signing block, because the form says the Chargee signs the consent as a deed |
| LRA 45 (TRANSFER BY TRUSTEE ON BANKRUPTCY) | prints only the Transferee's signing frame, although its own witness clause reads `IN WITNESS the Transferor and the Transferee have signed this Transfer as a deed` | both parties' blocks, the Transferor then the Transferee, as every sibling transfer prints them. A transfer the transferring party does not sign is not registrable |
| LRA 94 (APPLICATION FOR RECTIFICATION OF REGISTER PURSUANT TO A COURT ORDER) | ends at `SIGNED by the Applicant in the presence of:-` with no certificate of verification | the standard block with the section 45 certificate of verification, which the Act requires and every sibling application prints |

In each case the schema renders the standard block and the departure from the published
file is recorded in `scripts/form-schemas/_review-log.md`, by decision and not by
oversight. If an advocate asks why the rendered form carries a block the downloaded
Ministry file does not, the answer is in the log: the departures are recorded in
`scripts/form-schemas/_review-log.md`, form by form.

---

## Worked example: a caution from the library

**Input.** The advocate says: "Our client has a sale agreement over Nairobi/Block 1/123
and the vendor is trying to sell it twice. Lodge a caution." The matter is already in
Airtable.

**What happens.**

1. `_index.json` is read. One entry matches a caution: LRA 67, CAUTION, `when_used` "A
   person claiming an interest in land lodges a caution so that no dealing is registered
   on the title without notice to them." One match, so say which form and carry on. (LRA
   68, NOTICE OF CAUTION, is in `excluded`: the Registrar issues it. If the advocate had
   asked for that one, it is refused by name and LRA 67 offered instead.)
2. The schema is opened and `party_roles` read off it: `transferor` is `Cautioner`,
   `transferee` is `Proprietor`. So the first party is the client, not the seller, and
   the second is the registered proprietor, who on this matter happens to be the seller.
   The form's sides are not the conveyance's vendor and purchaser, and the schema is
   what says so. `property_lr_no` is Nairobi/Block 1/123.
3. The schema is scanned for base fields: every `{{name}}` and every non-party
   `value_field` in it is already declared in `custom_fields`, and its `execution.mode`
   is `witnessed` rather than `declaration`, so LRA 67 needs no base field beyond the
   date, the title and the two parties. That scan is not a formality. LRA 35 would have
   come back needing `purchase_price_words` and `purchase_price_figures`, and LRA 47
   needing `declaration_text`, and no refusal would ever have named either.
4. The form declares nine custom fields. Each is asked by its own prompt, four to a
   popup: the cautioner's address for service, the proprietor's PIN, citizenship, and
   address; then the interest claimed, the extent or scope of the caution, the documents
   attached in support, and the name of the declarant; then the paragraphs of the
   statutory declaration. The interest claimed is the advocate's words, taken down as
   given: "Purchaser under an agreement for sale dated 1st September 2026." It is not
   composed from the matter record.
5. The advocate signs in and the `advocate` block goes into the data file.
6. The data file carries `"doc_type": "lra_67"`, the parties in the roles from step 2,
   the title, and the nine fields.

**Output.** A DOCX carrying the Ministry's own CAUTION form: `Form LRA 67 (r. 80(1))`,
the Act lines, the registry filing box, the title number, the eleven detail rows in the
official order, the operative paragraphs verbatim, the Cautioner's signing block with
its certificate of verification, the registry block, the firm's DRAWN BY
clause, a page number in the footer, and the statutory declaration annexed on its own
page. No letterhead.

**If a declared field had been left blank,** nothing would have been written at all:

```
REFUSED: [lra_67] custom field "interest_claimed" (Interest claimed) is required.
```

**A base field left blank would not have refused.** It would have printed the gap and
exited zero, which is why step 3 above exists and why the finished document is read
before it is presented.

**Then offer the LRA 9.** The entry's `pairs_with_lra9` is true, so the caution goes in
to the registry under a general application for registration. Ask, and draft it on a yes.

---

## Typography

**Registry documents and transfer instruments** (LRA 33, LRA 63, LRA 58, Requisitions on Title, Completion Notice, Undertaking Letter):
- Font: the firm's court font (`font_court` in `scripts/firm-config.json`), 12pt, single spaced, justified
- Note at bottom of output: `[Typography: the firm's court font, 12pt, single spaced, justified]`

**Correspondence** (Sale Agreement cover, all application letters, client update letters, chase notices):
- Font: the firm's correspondence font (`font_correspondence` in `scripts/firm-config.json`), 12pt, single spaced, justified
- Note at bottom of output: `[Typography: the firm's correspondence font, 12pt, single spaced, justified]`

**Note on the Sale Agreement itself:** The Agreement body is Category A (letterhead) but uses Book Antiqua as it is a formal legal instrument.

---

## Output Instruction (every document)

At the very top of every output, print:

- **Category A:** `[LETTERHEAD DOCUMENT: Print on MAK & Partners Advocates LLP letterhead]`
- **Category B:** `[REGISTRY DOCUMENT: No letterhead. File at Land Registry. Check title details before filing.]`
- **Category C:** not produced. Say which registrar-issued form was asked for, why it is refused, and which practitioner form to use instead.

At the very bottom, print:

```
─────────────────────────────────────────────
Drafted by Kenya Conveyancing Manager
Review before use. Insert actual title details, dates, and amounts.
─────────────────────────────────────────────
```

---

## General Drafting Rules

- Dates: write in full (e.g., "21st March 2026", not "21/03/2026")
- Monetary amounts: write in words AND figures (e.g., "Kenya Shillings Twelve Million Five Hundred Thousand (Kshs. 12,500,000)")
- Title references: always use the full title, e.g., "Land Reference Number 209/4491" or "Title Number Nairobi/Block 123/456"
- Never include actual signatures or stamps
- LRA form numbers: always cite the full reference: "LRA 33 (Transfer of Interest in Land)" not just "Form RL1" or "the transfer form"

---

## Confidence Bands

- High: the fact is supplied by the user or read from the Airtable record, and a verbatim template already covers the clause. Proceed and fill.
- Medium: the fact or branch (tenure, agricultural status, whether the property is charged, whether a party is a company) is ambiguous. Surface it and ask before writing the document.
- Low: a required term, figure, or clause is missing or falls outside the templates. Do not assert a value; leave a flagged `[PLACEHOLDER]` and hand back to the advocate. Statutory rates and timelines (stamp duty, CGT, LCB windows, registration fees) carry an explicit "verify with KRA" or equivalent hand-back rather than a guessed figure.

Never draft a clause at uniform confidence.

---

## Format Verification (run after every document generation)

After presenting any generated document to the user, run this check every time. The plugin directory is read only at the client, so nothing here reads or writes a file under `${CLAUDE_PLUGIN_ROOT}`. The list of formats the firm has already approved lives in the firm's own Airtable base.

**Step 1: Read the approved list.** In the **Firm Settings** table of the conveyancing base, read the row whose **Key** is `validated_formats`. Its **Value** is a comma-separated list of `doc_type` names (for example `sale_agreement, fee_note, lra_33`). No row, or an empty Value, means nothing has been approved yet.

**Step 2: Check this document.**
- If the current `doc_type` is in the list, skip to the end: do not ask.
- If not, go to Step 3.

**Step 3: Ask the user** with the AskUserQuestion tool:

> "Is this the correct format for your firm? If yes, I'll remember it and won't ask again for this document type."

**Step 4: If the user says yes,** add the `doc_type` to the list through the Airtable connector: update the `validated_formats` row's Value to the old list plus the new name, or create the row (Key `validated_formats`, Value the name) if it does not exist. Read the row back and confirm the name is there, then tell the user: "Format noted. I won't ask again for this document type."

If the Airtable write fails, or the Firm Settings table is not there, say so in one line ("I could not save that to Firm Settings, so I will ask again next time") and carry on. Do not try to remember it any other way, and never write a file under `${CLAUDE_PLUGIN_ROOT}`.

If the user says the format is wrong, ask what is wrong with it and hand back to the advocate: the verbatim rule above means a deviation from the standard LSK format is not something Claude corrects on its own guess. Do not generate the document until the advocate confirms how it should read.

---

## What This Skill Does NOT Do

- Does not advise whether to buy or sell, or on price, tax, or valuation.
- Does not verify title or conduct the official search (registry documents carry "Check title details before filing").
- Does not compute fees from a scale. There is no ARO scale embedded; the fee earner sets the fee.
- Does not invent, paraphrase, or augment a substantive clause. A missing term stays a flagged `[PLACEHOLDER]`.
- Is not configured for use until `scripts/firm-config.json` carries the firm's own details in place of the Firm Profile above.
- Is not for a form outside `scripts/form-schemas/_index.json`. The index is the boundary: if the form is not in `forms`, the plugin does not draft it, whether it is in `excluded` or nowhere at all. Work that needs a form the library does not carry (first registration, sectional properties, anything under the Sectional Properties Act) escalates to the advocate.
- **Is not for a matter type outside a standard sale or transfer, whether or not the form exists.** The library carrying a form is not the same as the firm being instructed and competent on the work behind it. First registration, subdivision and boundary work, succession and transmission on death, partition of land held in common, sectional properties, charge enforcement and court-ordered rectification all have forms in the index and all escalate to the advocate before a word is drafted: a transmission needs the grant, a partition needs the order or the agreement, a rectification needs the court order. Having LRA 39, LRA 29 or LRA 94 on the shelf is not having the authority that makes it registrable. Draft one only on the advocate's own instruction for that matter.
- Does not produce a registrar's document. The 25 forms in `_excluded.json` are refused by name, with the reason and the nearest practitioner form offered.

---

## Escalation

Stop and route to the advocate when: the form needed is not in `scripts/form-schemas/_index.json`, or the matter type is outside a standard sale or transfer even though the form is in the index (both under What This Skill Does NOT Do above); the instrument depends on an authority the firm has not shown you, such as a grant of representation, a court order, a board consent or a power of attorney; a base field the form needs has no answer and cannot be taken from the matter record; a fact, branch, or term is missing or in conflict and cannot be resolved from the user or the Airtable record; a completion date has already passed or a required calendar entry is missing; `scripts/firm-config.json` has not been set up for the firm on the matter (the Firm Profile has not been configured); or the task calls for a decision on price, tax, valuation, title risk, or whether to proceed with the transaction. Claude surfaces the gap and asks; it does not guess a legal term to keep a document moving.

---

## Ownership and Review

Owner: Robin Advisory Group (build) for the firm's conveyancing practice. Review trigger: on any change to the LRA forms, LSK Conditions of Sale, or KRA rates, and at least every 6 months. Material changes to the verbatim templates, delegation threshold, or scope are logged in the plugin `verification-log.md`.

---

## Reference Files

- `references/sale-agreement.md`: Agreement for Sale (LSK Conditions of Sale 2015 incorporated by reference)
- `references/lra33-transfer.md`: LRA 33 Transfer of Interest in Land (freehold)
- `references/lra63-transfer-of-lease.md`: LRA 63 Transfer of Lease (leasehold assignments)
- `references/lra58-discharge.md`: LRA 58 Discharge of Charge
- `references/undertaking-letter.md`: Buyer's advocate undertaking on purchase price
- `references/requisitions-on-title.md`: Standard requisitions on title
- `references/completion-notice.md`: Formal completion notice to Vendor's Advocates
- `references/consent-application.md`: LCB consent + NLC consent application letters
- `references/rates-clearance.md`: Rates clearance application letter (County Government)
- `references/client-update-letter.md`: Plain-English milestone update for clients
