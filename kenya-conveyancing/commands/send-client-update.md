# /send-client-update

**Purpose:** Draft and send a plain-English progress update to the client.

---

## Step 1 — Identify

Identify the matter by its number, not by listing every file (listing does not scale once the firm has volume, and it reads as clumsy).

Ask: "Which matter? Type its LR / Title number (for example Nairobi/Block 138/1333):"

Query Airtable for the Active Conveyance whose **Title Number** matches what was typed (match on the number, ignoring spacing and case). Confirm the matter name back before proceeding. If nothing matches, say so and ask again. If a few close matches come back, show only those few and let the user pick.

Pull current milestone and client email from Airtable for the selected matter.

---

## Step 2 — Draft

Invoke the `conveyance-document-drafter` skill. Use the `client-update-letter.md` reference.

Tone: formal English but accessible — no unexplained legal jargon. The client is not a lawyer. Use plain language. Tell them:
- What has been done
- What is happening next
- What (if anything) they need to do
- Any deadline or urgent action required

---

## Step 3 — Show Draft and Confirm

Output the full draft letter, then ask:

With the AskUserQuestion tool, ask: "Send this update to [CLIENT EMAIL]?" Options: Send it now; Hold, let me edit first. Treat "Send it now" as the explicit confirmation to send.

Do NOT send without explicit confirmation.

---

## Step 4 — Send via Outlook

On confirmation: use the Outlook mail connector (Microsoft 365) to send the letter to the client's email on file in Airtable.

Subject line format: `RE: [Property Description] — Conveyancing Update`

Then:
1. Record in Airtable Documents table: Document Type = "Client Update", Status = "Sent", Date Sent = today
2. Confirm: "Client update sent to [email] at [time]."
