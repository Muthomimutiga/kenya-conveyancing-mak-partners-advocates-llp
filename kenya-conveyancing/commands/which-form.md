---
description: Which form do I use for this? Names the forms, their order, the consents, deadlines and traps for a conveyancing task, each tied to its provision
---

# /which-form

**Purpose:** An advocate describes what they need to do, in their own words, and gets back the forms to prepare, in the order they are lodged, with the consents, clearances, deadlines and traps that go with them. Every legal proposition is tied to the provision it comes from. **The plugin states the law; the advocate decides.**

This workflow is also invoked by natural-language requests. If an advocate asks "which form do I use for…", "what do I need to lodge for…", "what forms for a transfer of…", "how do I remove a caution", "what's the procedure for…", or "do I need LCB consent", route the request here even when /which-form was not typed.

This command drafts nothing and signs nothing, so it does **not** sign in to the firm directory and does not need a matter to exist. It only reads the plugin's own reference files.

---

## Step 1, Read the two references

Both live in the plugin and are read only:

- **The procedures:** `${CLAUDE_PLUGIN_ROOT}/scripts/procedures/*.json`. Five transactions, each with `triggers` (when it applies), `not_this_if` (when it does not, and what to use instead), `bundle` (the forms, their order and when each is required), `alternatives` (forms that are one-or-the-other), `consents`, `clearances`, `sequence`, `traps`, `practice_varies` and `statutory_basis` (the law, with verbatim quotes proved against the statute).
  - `sale_and_transfer_of_freehold`
  - `sale_and_transfer_of_leasehold`
  - `charge_and_discharge`
  - `cautions_and_restrictions`
  - `transfer_by_personal_representative_to_beneficiary`
- **The form index:** `${CLAUDE_PLUGIN_ROOT}/scripts/form-schemas/_index.json`. Every form the plugin can draw (`forms`, each with `when_used`) and the registrar-issued forms it recognises and refuses (`excluded`).

## Step 2, Match the request

**A transaction** (a sale, a charge, a caution, a transfer out of an estate): match it to one procedure by its `triggers`, then check every `not_this_if` entry against what the advocate said. If a `not_this_if` fact applies, switch to the procedure it names, and say why in one line using its `why`.

- **If the procedure it names is not one of the five files**, do not switch and do not improvise one. Say: "The plugin does not yet carry a full procedure for [that case]", give the `why`, and list only the forms the current procedure's own `bundle` gives for that fact, if any.
- **If a fact appears both in `not_this_if` and as a `condition` on a form in this procedure's `bundle`**, the bundle wins: keep the procedure, include that form as conditional, and add the `not_this_if` `why` as a note under it.

**A single task** ("I need to lodge a caution", "replace a lost title", "register a lease"): match it to forms by `when_used` in the index. Where a procedure also covers it, use the procedure, because it carries the consents and traps.

**A registrar-issued form** (in `excluded`): say plainly that the Land Registrar issues it and an advocate does not draft it, and name the form the advocate lodges instead, if any.

**Nothing matches:** say so. Name the closest procedure or form and what differs. **Never invent a form, a form number or a requirement that is not in these files.** If the matter is outside the five procedures (a gift, a sectional property, a compulsory acquisition), say it is outside what the plugin covers and that the advocate should work from the statute.

## Step 3, Ask only the questions that change the answer

Look at the matched procedure's `bundle` conditions, `alternatives` and `consents`. Every `required: false` form, every alternative pair and every conditional consent turns on a fact. Ask only for the facts the advocate has not already given, in **one** AskUserQuestion call, at most four questions. Typical deciders:

- Is the title freehold or leasehold?
- Is the land agricultural and within a land control area? (decides Land Control Board consent)
- Is the title charged, and is the charge being redeemed on completion or does it survive? (decides discharge **or** consent, never both)
- Is the registered proprietor alive? Did they hold jointly or in common?

If the advocate does not know a fact, keep both branches in the answer and label each one. Where a fact is implied rather than stated ("she is the only beneficiary"), say what you took it to mean in one line so the advocate can correct it.

## Step 4, Give the answer

Lead with the forms, then what surrounds them. Use this shape:

**[Procedure name]**, [one-line summary]

**Forms to prepare, in lodging order**
| Order | Form | Why |
|---|---|---|
Only the forms that apply on the facts given. A form whose condition is unknown goes in with "Only if [condition]".

- **Number the rows 1, 2, 3 in display**, sorted by each form's `order` in the file. Forms that share an `order` share a number too, marked "either" when they are alternatives or "together" when both are lodged. Do not print the file's raw `order` values.
- The Land Control Board application, where it applies, goes **first, before anything is lodged**, labelled "LCB Form 1", not "Form 1".
- Whenever the matter concerns an existing registered title, put **LRA 84, Application for official search** above the table as "Before anything else", unless the advocate says a current search is already in hand. It confirms what is actually on the register (a caution rather than a restriction, a charge, a lease term) before any form is chosen. It is in the index even where a procedure's bundle does not list it.
- If any step turns on a form the Land Registrar issues (in the index's `excluded` list), add one line under the table: "Issued by the Registrar, not drafted by you: [forms]".

**One or the other, never both:** each applicable `alternatives` pair, with what decides it.

**Consents:** for each applicable consent: who gives it, under which provision, the deadline, and what happens if it is missed (from `consents`). Say the Land Control Board consequence in full when it applies: the transaction is void for all purposes under s.6(1) of the Land Control Act, and the application must be made within six months of the agreement under s.8(1).

**Clearances:** from `clearances`, only those that apply.

**Order of work:** the procedure's `sequence`, numbered, keeping only the steps that belong to the task asked. If LRA 84 was placed above the table, the first step is the official search, whether or not the procedure's own sequence lists it. A procedure can cover both sides (lodging a caution and removing one): show the side the advocate is on.

**What goes wrong:** every `traps` entry that applies to the side the advocate is on, each with its provision in brackets. Then, under **"From the other side"**, any trap written for the opposite party that gives this advocate leverage, turned to their use. For example, where the reason for a caution has ended, a proprietor's advocate should see that s.75 exposes a cautioner who maintains a caution without reasonable cause to damages: that supports an application on LRA 70 and is a reason to ask the cautioner to sign LRA 69. State it conditionally when the facts do not settle whether reasonable cause has ended. A provision cited here also goes in "The law".

**The law:** the `statutory_basis` entries that bear on the forms and consents above, each as the provision followed by its `quote` in quotation marks, verbatim, then its `effect` in one line.

**Where practice varies:** any `practice_varies` entry that applies, stated as varying, not as a rule. Where an entry sets out routes, present each route and ask the advocate which they want; do not choose for them.

Every legal statement carries its provision, taken from the procedure file (for example "Land Registration Act s.59"). When quoting the statute, use the `quote` from `statutory_basis` **verbatim** and nothing else. Do not paraphrase a quote, and do not add law that is not in the file. If the advocate wants the full note, run:

```bash
cd ${CLAUDE_PLUGIN_ROOT}/scripts && node procedures/render-procedure.js [transaction_id]
```

and present its output as it is.

**Review status, always shown.** Read the procedure's `verified_by`. If its `status` is `APPROVED`, the last line of the answer is: *Procedure reviewed and approved by [by], [date]. This is the plugin's reading of the statute and registry practice; the advocate on the matter decides.* If it is anything else, put this line **at the top** of the answer, before the forms: *This procedure has not yet been signed off by an advocate. Use it as a checklist to work from, not as settled guidance.* Where you answered from the form index alone, with no procedure, say so.

For an unapproved procedure, or an answer from the form index alone, the last line is: *This is the plugin's reading of the statute and registry practice. The advocate decides.*

## Step 5, Offer the next step

With the AskUserQuestion tool, ask: "Draft these now?" Options: Draft them for a matter; Open a new matter first; Not now.

- **Draft them for a matter:** hand each form, in lodging order and starting with LRA 84 where it was placed first, to `/draft-conveyance-doc` with its `form_id` from the index. That command signs in, looks up the matter and asks for any facts the form needs.
- **Open a new matter first:** run `/new-conveyance`, then draft.
- **Not now:** stop. Nothing is drafted and nothing is written to Airtable.

Never draft without that confirmation.
