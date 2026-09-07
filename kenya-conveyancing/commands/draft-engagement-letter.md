---
description: Draft a MAK letter of engagement for a conveyancing matter
allowed-tools: Read, Write, mcp__airtable__search_records, mcp__airtable__create_record
argument-hint: for [client or matter] — e.g. "for Jane Wambui's purchase of Nairobi/Block 138/1333"
---

# Draft Letter of Engagement

This command invokes the `conveyance-document-drafter` skill with
`doc_type: "engagement_letter"`.

It may also be invoked naturally when an associate says “draft a letter of
engagement”, “prepare an engagement letter”, or “send me the engagement letter
for this matter”. Do not require the associate to use a slash command.

Identify the matter from the argument or ask for the LR / Title number. Pull
the available client and property details from Airtable, then ask only for
missing engagement-letter fields. Use the approved MAK letterhead, opening
block, subject line, body formatting, acceptance section, footer, and grammar
defaults in the conveyancing document generator.

Use the required-field checklist and JSON shape in
`commands/draft-conveyance-doc.md`, then generate with:

```json
{ "doc_type": "engagement_letter" }
```

Render and visually inspect the DOCX before presenting it to the associate.
