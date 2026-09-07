---
name: conveyance-document-drafter
description: >
  Drafts all conveyancing documents for Kenyan property transactions — Sale
  Agreement, LRA 33 Transfer, LRA 63 Transfer of Lease, LRA 58 Discharge of
  Charge, Requisitions on Title, Completion Notice, Undertaking Letter, consent
  application letters, engagement letters, fee notes, and client update letters.
  Triggered by /draft-conveyance-doc, /draft-engagement-letter, /new-conveyance,
  and /complete-milestone. Also trigger from natural-language requests such as
  “draft a letter of engagement”, “draft an LRA 63”, “draft a transfer”,
  “draft a client update”, “draft an undertaking”, or “draft a conveyancing
  letter”, even when the user does not invoke a slash command.
version: 0.1.0
---

# Conveyance Document Drafter

Drafts conveyancing work products for MAK & PARTNERS ADVOCATES LLP. Every document must be accurate, properly formatted, and ready to print.

---

## Verbatim rule (non-negotiable)

Use the reference template text **verbatim**. Fill only clearly-marked placeholders and matter-specific facts (party names, LR number, price, dates) taken from the user or the Conveyance Airtable record. **Never invent, paraphrase, summarise, or augment a substantive clause** from your own knowledge. The cost of one fabricated or reworded clause reaching a client is unrecoverable. If a required clause or fact is missing, leave a clearly-marked `[PLACEHOLDER]` and flag it; do not fill a legal term with a plausible guess. Where a generator script exists for the document, use it (it carries the verbatim body and hard-fails on missing data) rather than hand-drafting a substitute.

---

## Firm Profile

Use these details wherever the firm's information appears. Never output "[FIRM NAME]" — always use the actual details.

```
MAK & PARTNERS ADVOCATES LLP
4TH FLOOR, VICTORIA AT TWO RIVERS, TWO RIVERS DEVELOPMENT, LIMURU ROAD, NAIROBI
P.O. BOX 10644-00100, NAIROBI
NAIROBI, KENYA
Tel: +254 100 939 727
Email: mak@makadvocates.com
```

**Principal Advocate:** KEN ASHIMOSI, Advocate of the High Court of Kenya

---

## Output Format Rules

### Category A — Letterhead Documents

These go on the firm's official letterhead. Begin output with:

```
══════════════════════════════════════════════════════════
[PRINT ON FIRM LETTERHEAD — MAK & PARTNERS ADVOCATES LLP]
══════════════════════════════════════════════════════════
```

**Category A conveyancing documents:** Sale Agreement, Completion Notice, Undertaking Letter, all application letters (consent applications, rates clearance applications, rent clearance applications, official search application letters), client update letters, reminder/chase notices.

---

### Category B — Registry Documents (Filed at Land Registry)

These are not printed on letterhead. They carry the formal DRAWN AND FILED BY block at the bottom.

**Category B conveyancing documents:** LRA 33 (Transfer of Interest in Land), LRA 63 (Transfer of Lease), LRA 58 (Discharge of Charge), Requisitions on Title.

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

### LRA Government Forms (Category C)

LRA 9 (General Application) and other official registry forms: Claude populates the fields and outputs them clearly labelled for printing on the official government form. Begin output with:

```
[GOVERNMENT FORM — Populate the official LRA [X] form with these details. Print on the official form from the Land Registry.]
```

---

## Typography

**Registry documents and transfer instruments** (LRA 33, LRA 63, LRA 58, Requisitions on Title, Completion Notice, Undertaking Letter):
- Font: Book Antiqua, 12pt, single spaced, justified
- Note at bottom of output: `[Typography: Book Antiqua 12pt, single spaced, justified]`

**Correspondence** (Sale Agreement cover, all application letters, client update letters, chase notices):
- Font: Lexend, 12pt, single spaced, justified
- Note at bottom of output: `[Typography: Lexend 12pt, single spaced, justified]`

**Note on the Sale Agreement itself:** The Agreement body is Category A (letterhead) but uses Book Antiqua as it is a formal legal instrument.

---

## Output Instruction (every document)

At the very top of every output, print:

- **Category A:** `[LETTERHEAD DOCUMENT — Print on MAK & Partners Advocates LLP letterhead]`
- **Category B:** `[REGISTRY DOCUMENT — No letterhead. File at Land Registry. Check title details before filing.]`
- **Category C:** `[GOVERNMENT FORM — Populate the official LRA [X] form with these details.]`

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
- Title references: always use the full title — e.g., "Land Reference Number 209/4491" or "Title Number Nairobi/Block 123/456"
- Never include actual signatures or stamps
- LRA form numbers: always cite the full reference — "LRA 33 (Transfer of Interest in Land)" not just "Form RL1" or "the transfer form"

---

## Format Verification (run after every document generation)

After presenting any generated document to the user, run this check every time:

**Step 1 — Read the validated formats list:**
```bash
cat ${CLAUDE_PLUGIN_ROOT}/scripts/validated-formats.json
```

**Step 2 — Check if this doc_type has been validated:**
- If the current `doc_type` appears in the `validated` array → skip to Step 5.
- If not → proceed to Step 3.

**Step 3 — Ask the user:**

> "Is this the correct format for your firm? If yes, I'll remember it. If not, share a DOCX of your preferred template and I'll learn your firm's drafting style for this document type."

**Step 4a — If the user says yes (format is correct):**

Add the doc_type to the validated list:
```bash
node -e "
const fs = require('fs');
const p = '${CLAUDE_PLUGIN_ROOT}/scripts/validated-formats.json';
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
if (!data.validated.includes('DOC_TYPE_HERE')) {
  data.validated.push('DOC_TYPE_HERE');
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  console.log('Saved.');
}
"
```

Replace `DOC_TYPE_HERE` with the actual doc_type string (e.g. `sale_agreement`, `lra_33`).

Confirm to the user: "Format noted. I won't ask again for this document type."

**Step 4b — If the user provides a DOCX template:**

Ask them to share the file path or confirm the uploaded file is ready. Then extract and analyse it:

```bash
python3 -c "
import docx, sys, json
doc = docx.Document('TEMPLATE_PATH_HERE')
paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
tables = []
for t in doc.tables:
    for row in t.rows:
        tables.append([c.text.strip() for c in row.cells])
print(json.dumps({'paragraphs': paras[:80], 'tables': tables[:20]}, indent=2))
"
```

Read the output carefully. Identify:
- The overall structure and section order
- Clause numbering style (1., 1.1, (a), roman numerals, etc.)
- Heading formats and capitalisation conventions
- Execution block wording (exact phrasing used)
- Any recitals, schedules, or annexures and their order
- Any firm-specific wording that differs from standard LSK format

Write a drafting rules file for this doc_type:
```bash
cat > ${CLAUDE_PLUGIN_ROOT}/scripts/drafting-rules/DOC_TYPE_HERE.md << 'RULES_EOF'
# Drafting Rules — [DOC_TYPE] — [Firm Name]
# Extracted from firm template on [DATE]

[Write the identified rules here — structure, clause order, numbering, 
execution wording, headings, any deviations from standard LSK format]
RULES_EOF
```

Then mark it as validated (Step 4a) and confirm: "I've extracted your firm's drafting rules for this document type and saved them. Every future [document name] will follow this format."

**Step 5 — Apply saved rules (if rules file exists):**

Before generating any document, check whether a rules file exists for the doc_type:
```bash
cat ${CLAUDE_PLUGIN_ROOT}/scripts/drafting-rules/DOC_TYPE_HERE.md 2>/dev/null
```

If the file exists, read it and apply those rules when assembling the document content. If it does not exist, use the standard LSK format.

---

## Reference Files

- `references/sale-agreement.md` — Agreement for Sale (LSK Conditions of Sale 2015 incorporated by reference)
- `references/lra33-transfer.md` — LRA 33 Transfer of Interest in Land (freehold)
- `references/lra63-transfer-of-lease.md` — LRA 63 Transfer of Lease (leasehold assignments)
- `references/lra58-discharge.md` — LRA 58 Discharge of Charge
- `references/undertaking-letter.md` — Buyer's advocate undertaking on purchase price
- `references/requisitions-on-title.md` — Standard requisitions on title
- `references/completion-notice.md` — Formal completion notice to Vendor's Advocates
- `references/consent-application.md` — LCB consent + NLC consent application letters
- `references/rates-clearance.md` — Rates clearance application letter (County Government)
- `references/client-update-letter.md` — Plain-English milestone update for clients
