---
description: Draft the firm's letter of engagement for a matter, signed by the firm partner
argument-hint: [client] re [matter], e.g. "Jane Wanjiru re recovery of Kshs 1.2m from Beta Traders"
---

# /draft-engagement-letter

Draft the firm's letter of engagement on the firm's letterhead, clause for clause from the template the firm supplied on 11 September 2026: Terms of Engagement, Commencement, Background, Scope of Work, Professional Fees and Disbursements, Assumptions, Termination, Confidentiality, Communication, Governing Law and Dispute Resolution, Acceptance of Terms, then the acceptance block for the client's signature. The standard wording is in the generator and is not to be rewritten; only the matter facts vary.

**The firm partner signs the letter.** The advocate running this command is named in the Communication clause as assisting, which is why the sign-in below still matters.

Parse $ARGUMENTS for the client and the matter. Ask for whatever is missing, one question at a time.

## Step 1: Load the matter, if there is one

If a matter is named, find the **Conveyance** by its title number or parties and take the client, the property and the price.

## Step 2: Gather the matter facts

Ask, in one message, only for what the record and $ARGUMENTS did not supply:

1. **Client:** full name as it should appear, postal address lines, town, email, and whether the client is a man, a woman, a company or more than one person (this sets his/her/its/their).
2. **RE line:** what the engagement is for, in a few words (it prints as `RE: LETTER OF ENGAGEMENT – …` in capitals).
3. **Background:** one to three short paragraphs of the facts as the client gave them.
4. **Scope of work:** the list of what the firm will do, each item a short phrase ending in a semicolon; the last two joined with "and".
5. **Professional fee:** the figure (printed as `Kshs. …`, exclusive of VAT and disbursements). Optionally, what it covers as a short list, if the fee earner wants that spelled out; the letter reads fine without it.
6. **Deposit** requested to commence, if any.
7. **Assumptions:** the template's six standard assumptions apply by default; ask whether any matter-specific assumption should be added (the template's own example excludes work outside the quoted scope).

Never invent a fee, a deposit or a fact. Leave a gap and ask.

## Step 3: Sign in (who signs this letter)

Every letter carries the signing advocate's own name and P.105 number, read from the firm directory (the **Team Members** table of the Conveyancing Manager base), never from memory. Before building the data file:

1. Create one record in the **Sign-ins** table of the Conveyancing Manager base: `Task` = `draft-engagement-letter: [letter type]`, `Document Type` = `[letter type]`.
2. The create call returns only the fields you wrote, so read the record back with `list_records_for_table` using its record id and `fieldIds` = [`Signed In By`]; take the **email** from that person object.
3. In **Team Members**, find the record whose **Airtable Login** equals that email (case-insensitive), else whose **Email** equals it. Neither: stop and say "You are not in the firm directory yet. Run /setup-conveyancing once, then try again."
4. Say one line and continue: "Signing as [Name], [P.105 Number]." If the user says "sign as [someone]", use that person's record instead.
5. Update the Sign-in record's **Signed As** to the chosen record, and carry the identity into the data file as:

```json
"advocate": { "record_id": "rec…", "signin_id": "rec…", "name": "[Name]", "p105_no": "[P.105 Number]", "practice_no": "[LSK Practice Number]", "practice_year": [Practice Year], "email": "[Email]" }
```


## Step 4: Build the data file

Write `/tmp/engagement-data.json`:

```json
{
  "doc_type": "engagement_letter",
  "date": "[today, e.g. 11th September 2026]",
  "ref": "[our reference]",
  "client_name": "[Client name]",
  "client_address_lines": ["[P.O. Box …]", "[TOWN]"],
  "client_email": "[email]",
  "client_pronoun": "her | his | its | their",
  "re_line": "[what the engagement is for]",
  "background": ["…", "…"],
  "scope": ["…;", "…;", "…; and", "…."],
  "fee_text": "Kshs. 150,000",
  "fee_covers": ["…;", "…;", "…."],
  "deposit_text": "KES 75,000",
  "assumptions": [],
  "advocate": { … from the sign-in … }
}
```

`fee_covers` is optional: include it only if the fee earner gave a list of what the fee covers; omit the key entirely otherwise, the letter reads fine without it. Leave `assumptions` empty to use the template's six. Do not pass `signatory_name`; the letter is signed by the firm partner, as configured in `scripts/firm-config.json` (`firm_partner`, `firm_partner_title`).

## Step 5: Generate

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node generate-conveyancing-document.bundle.js /tmp/engagement-data.json /sessions/${SESSION_ID}/mnt/outputs/[client-slug]-engagement-letter-[YYYY-MM-DD].docx
```

If the generator prints `REFUSED:`, do not retry: the assisting advocate's identity is missing or out of date (usually `/setup-conveyancing`). Any other error: read it, fix the data file, and retry.

## Step 6: Present and refine

Confirm the file was created and present it. Read it back once as the client would: the RE line, the background, the scope, the fee and the deposit must be exactly what was agreed. Ask whether anything should change; on changes, update the data file and regenerate.

## Step 7: Record it

When the user approves, create a record in the **Documents** table: name `Letter of Engagement, [Client]`, type `Other`, linked to the matter, dated today.
