# /train-form

**Purpose:** Teach the system to generate a new LRA statutory form. Provide a form number and the system will auto-download the official template from the Ministry of Lands, learn its structure, build a schema, and make it available for drafting immediately. Or provide your own DOCX if you have a firm copy.

---

## Step 1 — Identify the Form

Ask:

> "Which statutory form would you like to add? (e.g. LRA 42, LRA 9, LRA 26)"

Then ask:

> "Do you have your own DOCX copy of this form? If yes, share the file path. If not, I'll auto-download the official template from the Ministry of Lands website."

---

## Step 2 — Check if Already Trained

Check whether a schema already exists for this form:

```bash
ls ${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/
```

If a schema for this form already exists, tell the user:

> "This form is already trained. Run `/draft-conveyance-doc` and select [Form Name] from the document menu. If you want to retrain it with a new template, say 'retrain' and I'll overwrite the existing schema."

Otherwise proceed.

---

## Step 3 — Get the Form Template

### 3a — If user provided their own file

Use the file path they gave. Proceed to Step 4.

### 3b — Auto-download from Ministry of Lands

The Ministry of Lands publishes all LRA statutory forms at `https://lands.go.ke/forms`. Files are hosted at:

```
https://lands.go.ke/sites/default/files/Ardhi%20Forms/Form-LRA-{N}-{DESCRIPTION}.doc
```

To find the correct download URL for any form number, fetch the forms listing and grep for the form number:

```bash
FORM_NUM="42"  # replace with actual number from user input

# Search all pages for the matching URL
for PAGE in $(seq 0 13); do
  URL=$(curl -s "https://lands.go.ke/forms?page=${PAGE}" \
    | grep -o "/sites/default/files/Ardhi%20Forms/Form-LRA-${FORM_NUM}-[^\"]*\.doc" \
    | head -1)
  [ -n "$URL" ] && echo "https://lands.go.ke${URL}" && break
done
```

Once you have the URL, download the file:

```bash
curl -L -s "DOWNLOAD_URL_HERE" -o /tmp/lra-${FORM_NUM}-template.doc
echo "Downloaded: $(file /tmp/lra-${FORM_NUM}-template.doc)"
```

The file will be a binary `.doc` (old Word format). Convert it before reading:

```bash
textutil -convert docx /tmp/lra-${FORM_NUM}-template.doc -output /tmp/lra-${FORM_NUM}-template.docx 2>/dev/null \
  || soffice --headless --convert-to docx /tmp/lra-${FORM_NUM}-template.doc --outdir /tmp/ 2>/dev/null \
  || libreoffice --headless --convert-to docx /tmp/lra-${FORM_NUM}-template.doc --outdir /tmp/ 2>/dev/null \
  || { echo "Could not convert .doc. Install LibreOffice (brew install --cask libreoffice) or run on macOS (textutil), then retry."; exit 1; }
[ -f /tmp/lra-${FORM_NUM}-template.docx ] && echo "Converted to .docx successfully"
```

Use `/tmp/lra-${FORM_NUM}-template.docx` as the template path in the next step.

---

## Step 4 — Train the Form

Use the `statutory-form-trainer` skill to:

1. Read the template (converted .docx or user-supplied file)
2. Identify the form anatomy
3. Present the analysis for user confirmation
4. Write the schema to `scripts/form-schemas/[form-id].json`
5. Generate a test document
6. Confirm with the user

Follow the skill exactly.

---

## Step 5 — Confirm and Close

Once the test document is approved:

```
FORM TRAINED

[LRA XX] — [Document Title] is now available.

To use it:
1. Run /draft-conveyance-doc
2. Select your matter
3. Choose '[Document Name]' from the document menu

The system will ask you for the following fields:
[list custom_fields from the schema]

Schema saved to: scripts/form-schemas/lra_XX.json
Trained on: [date]
Source: [Ministry of Lands auto-download / user upload]
```
