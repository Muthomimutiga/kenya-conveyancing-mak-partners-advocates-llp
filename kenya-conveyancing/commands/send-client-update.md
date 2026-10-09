---
description: Draft a plain-language progress update for the client
---

# /send-client-update

**Purpose:** Draft and send a plain-English progress update to the client.

---

## Step 1, Identify

Identify the matter by its number, not by listing every file (listing does not scale once the firm has volume, and it reads as clumsy).

Ask: "Which matter? Type its LR / Title number (for example Nairobi/Block 1/123):"

Query Airtable for the Active Conveyance whose **Title Number** matches what was typed (match on the number, ignoring spacing and case). Confirm the matter name back before proceeding. If nothing matches, say so and ask again. If a few close matches come back, show only those few and let the user pick.

Pull current milestone and client email from Airtable for the selected matter.

---

## Step 2, Draft

Invoke the `conveyance-document-drafter` skill. Use the `client-update-letter.md` reference.

Tone: formal English but accessible, no unexplained legal jargon. The client is not a lawyer. Use plain language. Tell them:
- What has been done
- What is happening next
- What (if anything) they need to do
- Any deadline or urgent action required

---

## Step 3, Show Draft and Confirm

Output the full draft letter, then ask:

With the AskUserQuestion tool, ask: "Send this update to [CLIENT EMAIL]?" Options: Send it now; Hold, let me edit first. Treat "Send it now" as the explicit confirmation to send.

Do NOT send without explicit confirmation.

---

## Step 4, Send from the firm's mailbox

On confirmation: send the letter to the client's email on file in Airtable through the Microsoft 365 (Outlook) connector this person has connected in CoWork, and only if its tools are actually present in this session; do not guess.

**On Microsoft 365:** create the email in the advocate's own Outlook with `outlook_create_draft` (To = the client's email on file, the approved subject and body), then send it with `outlook_send_draft` if that tool is present; the confirmation in Step 3 is the explicit go. The connector cannot attach files, so if the update is a letter on the letterhead, leave it as a draft, tell the advocate to attach the DOCX and send it from Outlook, and wait for them to confirm it went before recording it as sent.

**A write refused for permissions** (the connection holds `Mail.Read` but not the ReadWrite scope, or "access denied") is treated exactly as no mail connector, with one added line: "Your firm's administrator needs to re-approve the mail connector for write access." Do not walk the advocate through the admin console themselves.

If no mail connector is connected, do NOT claim the update was sent. Say so plainly, give the person the final letter to send from their own mail client, and record the Documents row with Status = "Drafted" instead of "Sent".

Subject line format: `RE: [Property Description], Conveyancing Update`

Then:
1. Record in Airtable Documents table: Document Type = "Client Update", Status = "Sent", Date Sent = today
2. Confirm: "Client update sent to [email] at [time]."
