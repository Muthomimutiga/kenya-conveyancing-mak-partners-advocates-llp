---
name: statutory-form-trainer
description: >
  Trains the conveyancing system to generate any new LRA statutory form from
  a DOCX template. Can auto-download official templates from the Ministry of
  Lands website (lands.go.ke) or read a user-uploaded DOCX. Extracts form
  structure, builds a JSON schema, and wires it into the generator so the form
  can be drafted on demand. Triggered by /train-form.
version: 0.2.0
---

# Statutory Form Trainer

Every LRA statutory form shares the same anatomy. This skill teaches the generator a new one by reading a sample template and converting it into a JSON schema the generator can use immediately.

---

## The Anatomy of Every LRA Statutory Form

Before analysing any template, understand this structure — it applies to all forms:

| Section | What it contains |
|---|---|
| **Registry filing box** | Date Received / Presentation Book / Official Fees — always identical |
| **Form header** | Form number (e.g. LRA 42), regulation reference (r. XX(1)), Republic of Kenya / LRA Act title lines |
| **Title reference** | TITLE NO: [LR number] |
| **Details table** | Two-column table: left = label, right = value. Rows vary by form. |
| **Body / Witnesses** | Numbered clauses stating what the instrument does. Ends with IN WITNESS clause. |
| **Execution blocks** | Individual: SIGNED AS A DEED + name/ID/PIN + witness. Company: COMMON SEAL + Director/Secretary table. |
| **Presentation clause** | DRAWN AND FILED BY — identical on all forms. |

The generator already has the registry filing box, header, execution blocks, and presentation clause built. All you are teaching it is: what goes in the **details table** and **body clauses** for the new form.

---

## Step 1 — Read the Template

### 1a — Source: user-uploaded DOCX

If the user supplied a `.docx` path, go straight to the extraction command below.

If they supplied a `.doc` path (old binary Word format), convert it first:

```bash
textutil -convert docx USER_FILE_PATH_HERE -output /tmp/lra-form-converted.docx 2>/dev/null \
  || soffice --headless --convert-to docx USER_FILE_PATH_HERE --outdir /tmp/ 2>/dev/null \
  || libreoffice --headless --convert-to docx USER_FILE_PATH_HERE --outdir /tmp/ 2>/dev/null \
  || { echo "Could not convert .doc. Install LibreOffice or run on macOS (textutil), then retry."; exit 1; }
```

Use `/tmp/lra-form-converted.docx` as the path for extraction.

### 1b — Source: Ministry of Lands auto-download

If no file was provided, the template has already been downloaded and converted to `.docx` by the `/train-form` command. Use the path it produced (e.g. `/tmp/lra-42-template.docx`).

**Note on government form quality:** Forms downloaded from `lands.go.ke` are old binary `.doc` files. After conversion with `textutil`, the table structure is often lost — detail rows appear as tab-separated paragraphs rather than table cells. This is expected. Read the paragraphs carefully to reconstruct the table rows.

### 1c — Extract content

First ensure the `python-docx` library is available (it is not installed by default; without this guard the extraction below crashes with `ModuleNotFoundError: No module named 'docx'`):

```bash
python3 -c "import docx" 2>/dev/null \
  || pip install python-docx 2>/dev/null \
  || python3 -m pip install --user python-docx \
  || { echo "Could not install python-docx. Install it (pip install python-docx) and re-run /train-form."; exit 1; }
```

Then extract:

```bash
python3 -c "
import docx, json
doc = docx.Document('TEMPLATE_PATH_HERE')
paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
tables = []
for t in doc.tables:
    tbl = []
    for row in t.rows:
        tbl.append([c.text.strip() for c in row.cells])
    tables.append(tbl)
print(json.dumps({'paragraphs': paras, 'tables': tables}, indent=2))
"
```

Read all output carefully. If `tables` is empty but `paragraphs` contains tab characters (`\t`), the table was flattened during conversion — reconstruct the rows from the paragraph sequence.

---

## Step 2 — Identify the Form Components

From the extracted content, identify:

**A. Form metadata:**
- Form number: e.g. `LRA 42`
- Regulation reference: e.g. `(r. 57(1))`
- Document title: e.g. `TRANSFER BY PERSONAL REPRESENTATIVE TO PERSON ENTITLED UNDER A WILL OR ON AN INTESTACY`

**B. Party roles:**
- Who is party 1 (the "transferor" side)? What are they called in this form? e.g. Chargor, Cautioner, Personal Representative
- Who is party 2 (the "transferee" side)? e.g. Chargee, Person Entitled, Beneficiary
- Are they individuals, companies, or either?

**C. Details table rows** (in order):
- What rows appear in the two-column details table?
- For each row: what is the label? What data field does the value come from?
- Mark any row that uses party names with `value_field: "transferorNames"` or `"transfereeNames"`
- Mark the ID row with `use_id_label: true`
- If the table is flattened: reconstruct row order from paragraph sequence — labels appear first, then value placeholders (dots/blanks)

**D. Body clauses:**
- What does the IN WITNESS / numbered clause section say?
- Copy the exact text for each numbered clause
- Identify any `{{field_name}}` placeholders where data gets inserted

**E. Custom fields:**
- List any fields specific to this form that aren't standard (e.g. `amount_secured`, `date_of_grant`, `grant_type`)

---

## Step 3 — Present Your Analysis

Before writing any file, present your understanding to the user:

```
FORM ANALYSIS — [FORM NUMBER]

Form: [LRA XX] — [Document Title]
Regulation: [r. XX(1)]
Source: [Ministry of Lands download / user upload]

Parties:
  Party 1: [Role name] — [individual / company / either]
  Party 2: [Role name] — [individual / company / either]

Details table ([N] rows):
  1. [Label] → [field or blank]
  2. [Label] → [party names]
  3. [Label] → [ID label (struck-through)]
  ...

Body clauses:
  Intro: "[text]"
  1. "[clause 1 text]"
  2. "[clause 2 text]"
  Witness: "[IN WITNESS text]"

Custom fields needed from user:
  - [field_name]: [description]
  - [field_name]: [description]

Does this match the form? Confirm to proceed, or correct any details.
```

Wait for user confirmation before writing the schema.

---

## Step 4 — Write the Schema

Once confirmed, write the JSON schema to the form-schemas folder:

```bash
cat > ${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/FORM_ID_HERE.json << 'SCHEMA_EOF'
{
  "form_id": "lra_XX",
  "form_number": "LRA XX",
  "regulation": "(r. XX(1))",
  "doc_title": "DOCUMENT TITLE",
  "trained_on": "YYYY-MM-DD",
  "trained_from": "lands_go_ke_download",
  "party_roles": {
    "transferor": "Chargor(s)",
    "transferor_single": "Chargor",
    "transferee": "Chargee(s)",
    "transferee_single": "Chargee"
  },
  "detail_rows": [
    { "label": "Date of [Form]", "value_blank": true },
    { "label": "Party 1 Name", "value_field": "transferorNames", "bold": true },
    { "label": "ID/Passport/Company Registration No.", "value_field": "transferorIDs", "use_id_label": true },
    { "label": "Party 2 Name", "value_field": "transfereeNames", "bold": true },
    { "label": "ID/Passport/Company Registration No.", "value_field": "transfereeIDs", "use_id_label": true },
    { "label": "Custom Field Label", "value_field": "custom_field_name" }
  ],
  "body_text": [
    { "type": "intro",    "text": "This [DOCUMENT TITLE] witnesses as follows:" },
    { "type": "numbered", "number": 1, "text": "Clause 1 text here." },
    { "type": "numbered", "number": 2, "text": "Clause 2 text here." },
    { "type": "witness",  "text": "IN WITNESS the parties have executed this instrument as a deed." }
  ],
  "custom_fields": ["custom_field_name"]
}
SCHEMA_EOF
```

Set `"trained_from"` to:
- `"lands_go_ke_download"` if fetched automatically from the Ministry of Lands website
- `"user_upload"` if the user provided their own DOCX

Fill in every field from your analysis. Use `{{field_name}}` in body text where user data should be substituted.

---

## Step 5 — Generate a Test Document

Prepare test JSON for the new form and generate a sample:

```bash
cat > /tmp/conveyancing-doc-data.json << 'TESTEOF'
{
  "doc_type": "lra_XX",
  "date": "6th May 2026",
  "property_lr_no": "LR No. 12345/67",
  "property_location": "Nairobi",
  "vendor_name": "TEST TRANSFEROR",
  "vendor_id": "12345678",
  "purchaser_name": "TEST TRANSFEREE",
  "purchaser_id": "87654321"
}
TESTEOF

cd ${CLAUDE_PLUGIN_ROOT}/scripts && ([ -d node_modules ] || npm install) && \
  node generate-conveyancing-document.js /tmp/conveyancing-doc-data.json \
  /sessions/${SESSION_ID}/mnt/outputs/test-lra-XX.docx
```

Present the download link and ask: "Does this match the form? If anything is wrong — wrong clause text, missing fields, incorrect party labels — tell me and I'll update the schema."

---

## Step 6 — Update the Draft Command

Once the form is approved, tell the user:

> "The system can now generate [FORM NUMBER]. To use it, run `/draft-conveyance-doc`, select the matter, and choose '[Document name]' from the document menu. I'll add it to the available options."

Then update `commands/draft-conveyance-doc.md` — add the new form to the **3a — doc_type mapping** table:

```
[Form Name] → `lra_XX`
```

And add a **required fields checklist** entry in section **3b** listing the custom fields.

Also add the new form to the **Step 2 — Document Menu** list (under the relevant milestone, or under "Any stage"). If it is not in that menu, it will never appear in the `/draft-conveyance-doc` AskUserQuestion picker, so the form would be unreachable by the user even though the schema and generator are ready.

---

## Supported Base Fields (always available, no schema config needed)

These fields are always passed through from the user's JSON and available in body text templates:

- `property_lr_no`, `property_location`
- `vendor_name` / `transferor_name`, `vendor_id` / `transferor_id`
- `purchaser_name` / `transferee_name`, `purchaser_id` / `transferee_id`
- `purchase_price_words`, `purchase_price_figures`
- `date`
- Any array: `transferors[]`, `transferees[]` with `name`, `id_no`, `pin`, `company_name`, `is_company`, `reg_no`

---

## LRA Form URL Reference

All 90+ LRA forms are available at `https://lands.go.ke/forms`. Direct URL pattern:

```
https://lands.go.ke/sites/default/files/Ardhi%20Forms/Form-LRA-{N}-{DESCRIPTION}.doc
```

Key forms already built into the generator (do not train these — they use custom builders):
- LRA 33 (`lra_33`) — Transfer of Interest in Land (freehold)
- LRA 63 (`lra_63`) — Transfer of Lease (leasehold)
- LRA 58 (`lra_58`) — Discharge of Charge
- LRA 84 (`lra_84`) — Application for Official Search

All other forms (LRA 9, LRA 42, LRA 53, LRA 67, LRA 75, etc.) can be trained with this skill.
