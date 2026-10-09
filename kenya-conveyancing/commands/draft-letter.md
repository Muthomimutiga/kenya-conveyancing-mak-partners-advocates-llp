---
description: Draft any letter on the firm's letterhead (conveyancing): demand, client update, cover, application or chase letter, signed by the advocate running it
argument-hint: [letter type] to [recipient] re [matter or subject], e.g. "demand letter to Beta Traders re unpaid invoice", "client update to Jane Wanjiru re the Wanjiru purchase"
---

# /draft-letter

Draft correspondence on the firm's letterhead. The page is the firm's own: header on page one, footer on every page, the firm's correspondence font, the firm's sign-off. Use `/draft-engagement-letter` for engagement letters; this command is for everything else that goes out as a letter.

Parse $ARGUMENTS for the letter type, the recipient and the matter or subject. Ask for whatever is missing, one question at a time.

## Step 1: Load the matter, if there is one

If a matter is named, find the **Conveyance** by its title number or parties and take the property, the parties, the milestone and the client. Application letters (official search, rates clearance, rent clearance, LCB or NLC consent, registration covering letter) take their addressee from the milestone; a client update takes the client's address.

## Step 2: Gather what the letter must say

Ask, in one message, only for what the matter record and $ARGUMENTS did not supply:

- **Recipient block:** name, title or firm, postal address lines, town (the last line, in capitals).
- **Their reference**, if known (otherwise `TBA`).
- **Subject line**, which becomes the RE line, in capitals.
- **The substance:** what the letter must tell, ask or demand, any dates, sums and deadlines, and anything to enclose.

Draft the body yourself: short formal paragraphs in the firm's register, first person plural, no filler. A demand letter opens with who we act for and the instructions, sets out the debt or breach, and ends with a **TAKE NOTICE** paragraph naming the deadline and the consequence. A client update opens with the matter, says what happened, what happens next, and what we need from the client. Never invent facts, sums or dates; leave a bracketed gap and ask.

## Step 3: Sign in (who signs this letter)

Every letter carries the signing advocate's own name and P.105 number, read from the firm directory (the **Team Members** table of the Conveyancing Manager base), never from memory. Before building the data file:

1. Create one record in the **Sign-ins** table of the Conveyancing Manager base: `Task` = `draft-letter: [letter type]`, `Document Type` = `[letter type]`.
2. The create call returns only the fields you wrote, so read the record back with `list_records_for_table` using its record id and `fieldIds` = [`Signed In By`]; take the **email** from that person object.
3. In **Team Members**, find the record whose **Airtable Login** equals that email (case-insensitive), else whose **Email** equals it. Neither: stop and say "You are not in the firm directory yet. Run /setup-conveyancing once, then try again."
4. Say one line and continue: "Signing as [Name], [P.105 Number]." If the user says "sign as [someone]", use that person's record instead.
5. Update the Sign-in record's **Signed As** to the chosen record, and carry the identity into the data file as:

```json
"advocate": { "record_id": "rec…", "signin_id": "rec…", "name": "[Name]", "p105_no": "[P.105 Number]", "practice_no": "[LSK Practice Number]", "practice_year": [Practice Year], "email": "[Email]" }
```


## Step 4: Build the data file

Write `/tmp/letter-data.json`:

```json
{
  "doc_type": "conveyance_letter",
  "date": "[today, e.g. 11th September 2026]",
  "ref": "[our reference]",
  "their_ref": "[their reference or TBA]",
  "recipient_lines": ["[Name]", "[Title or firm]", "[P.O. Box …]", "[TOWN]"],
  "salutation": "Dear Sir/Madam,",
  "subject": "RE: [SUBJECT IN CAPITALS]",
  "paragraphs": ["…", "…", "TAKE NOTICE that …"],
  "closing": "Yours faithfully,",
  "attn": "[optional attention line]",
  "signing_for": "[Vendor | Purchaser | omit if not acting in a sale]",
  "advocate": { … from the sign-in … }
}
```

## Step 5: Generate

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/letter-data.json /sessions/${SESSION_ID}/mnt/outputs/[recipient-slug]-[letter-type]-[YYYY-MM-DD].docx
```

If the generator prints `REFUSED:`, do not retry: the signing identity is missing or out of date; read the reason and pass it to the user (usually `/setup-conveyancing`). Any other error: read it, fix the data file, and retry.

## Step 6: Present and refine

Confirm the file was created and present it. Ask whether anything should change; on changes, update the data file and regenerate.

## Step 7: Record it

When the user approves, create a record in the **Documents** table with the document name, type, the matter link and the date.
