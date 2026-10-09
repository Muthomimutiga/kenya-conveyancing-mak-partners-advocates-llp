# The LRA form library

One JSON file per Ministry of Lands form. The generator renders it; the official text
in `_source/` is the only authority for what it says.

- `_source/lra-NN.txt` holds the 95 official forms as published at lands.go.ke. Ground
  truth. Never edited, never paraphrased, never retyped from memory.
- `lra_NN.json` is a schema: what the form is called, what it asks for, what it says,
  and who signs it.
- `_excluded.json` lists the 25 forms this plugin will not draft.
- `_index.json` is generated: the one list of what the plugin drafts.
- `_review-log.md` records that a human has read each rendered form against its source.

## The contract

A schema file is named `lra_NN.json` and its `form_id` is the file stem.

| Field | What it is |
|---|---|
| `form_id` | `lra_NN`, matching the file name |
| `form_number` | `LRA NN`, spelled exactly as the official text spells it (`LRA-16` stays hyphenated) |
| `regulation` | the regulation as it should print, for example `(r. 80(1))` |
| `regulation_official` | optional: the regulation verbatim from the official text, where that differs from what should print |
| `doc_title` | the title as it should print |
| `doc_title_official` | the title verbatim from the official text, for the lint to match |
| `source` | `{url, fetched, text}`: where the text came from and which `_source` file holds it |
| `category` | `instrument`, `application`, `consent`, `declaration`, `deed`, `notice` or `withdrawal` |
| `when_used` | one sentence, plain English, no em dash |
| `party_mode` | `two_party`, `single_party` or `none` |
| `party_roles` | `{transferor, transferor_single, transferee, transferee_single}`, or only the transferor pair for `single_party` |
| `title_label` | the form's own label for the title line; default `TITLE NO` |
| `filing_box` | optional: `"default"` (Date Received / Presentation Book / Official Fees Paid), `"none"`, or an array of verbatim lines, one per column |
| `pre_title_lines` | optional: verbatim lines printed after the filing box and before the document title |
| `title_line` | optional: `"default"`, `"none"`, or an array of verbatim lines printed in its place |
| `head_lines` | optional: verbatim lines printed at the very top, above the form number |
| `act_lines` | optional: verbatim lines printed under REPUBLIC OF KENYA, in place of the two default Act lines |
| `detail_rows` | the boxed table above the body, in the official order |
| `body_text` | the operative paragraphs, verbatim |
| `execution` | `{mode, signer, signer_label, verification}` |
| `registry_block` | optional: `"default"`, `"none"`, or the form's own block as an array of lines |
| `annex` | optional, an annexed statutory declaration |
| `foot_notes` | optional: the Ministry's asterisked notes, printed at the foot of the form |
| `custom_fields` | every fact the drafter must supply, with a label and a prompt |
| `pairs_with_lra9` | true when the form is lodged with an LRA 9 application to register |

### The official spelling, where it differs

`doc_title` / `doc_title_official`, `regulation` / `regulation_official` and a body
block's `text` / `text_official` are the same pair three times: the first is what
prints, the second is what the Ministry printed.
Set the `_official` one only where the two differ, which is where the official text
carries a glaring typo. The lint and `build-index.js` then match the `_official`
string against `_source`, so the check still bites, while the form a client files
reads correctly. LRA 84 is the standing example: the official header is `(r. 86(1)`
with no closing bracket, so the form prints `(r. 86(1))` and the index publishes both.
An unbalanced bracket in a regulation reference is a typo; the Ministry's wording,
its spelling of a form number, and its clause text are not, and stay verbatim.

A body block's `text_official` earns its keep for one thing only: a sentence the
conversion split across a table cell. LRA 80 prints `IN WITNESS WHEREOF this grant of
easement has been duly executed by the parties herein.`, but in `_source/lra-80.txt`
the word `IN` sits at line 39 and the rest at line 60, with the whole execution cell
between them, so the joined sentence appears nowhere in the converted text and the
probe cannot match it. Give the block the whole sentence as `text`, so the filed
instrument reads properly, and the contiguous fragment as `text_official`, so the lint
still matches the official text:

```json
{ "type": "witness", "text": "IN WITNESS WHEREOF this grant of easement has been duly executed by the parties herein.", "text_official": "WITNESS WHEREOF this grant of easement has been duly executed by the parties herein." }
```

That is the only legitimate use. Never reach for it to paper over wording that differs
from the Ministry's: if the probe fails because the sentence is not the form's
sentence, the sentence is wrong, not the lint. Placeholders are declared from `text`,
which is what renders, so keep `text_official` a plain fragment of the official words.

### `detail_rows`

`{label, value_blank?, value_field?, value_template?, use_id_label?, bold?}`.

- `value_blank: true` leaves the cell empty for the registry or the client to fill.
- `value_field` is `transferorNames`, `transferorIDs`, `transfereeNames`, `transfereeIDs`
  (the party columns), or any key in the data file.
- `value_template` is a string with `{{field}}` placeholders.
- `use_id_label: true` prints the registry's ID/Passport/Company Registration label with
  the inapplicable words struck through, chosen from the value.

### `body_text`

`{type, number?, letter?, text, text_official?}` where `type` is `intro`, `numbered`,
`lettered`, `spacer`, `witness` or `plain`. `{{field}}` placeholders resolve from the
data file. `text_official` is only for a sentence the conversion split across a table
cell: see The official spelling, where it differs.

One more type takes no `text`. A **table** block prints an operative schedule as the
grid the Ministry prints, not as prose:

```json
{ "type": "table", "columns": ["Cadastral Plan", "Title Number", "Area"], "rows_field": "partition_schedule" }
```

`columns` are the form's own headings, verbatim, and are linted against the official
text like every other verbatim key. `rows_field` names a declared field whose value
carries one row per line, the cells of a row split on a pipe:
`CP/1 | T/1 | 0.5 Ha`. Say that in the field's `prompt`, because the person answering
has to type it: `One row per line, cells separated by a pipe: plan | title | area`.
A row with fewer cells than headings leaves the rest of the row blank.

Four rules that bite:

1. **Verbatim.** The lint takes the first 40 characters of each block, drops the
   placeholders, and requires the result to appear in the official text. So a block's
   opening must be a contiguous run of the form's own words. Where the official form
   puts a blank inside that opening, split the paragraph at the blank into consecutive
   blocks (see `lra_16.json`'s opening line, which the official form itself wraps).
   The textutil conversion also leaves a cell marker where a table cell ends, so a
   heading that spans two cells is two blocks.
2. **Footnotes.** An asterisked note at the foot of the form is carried as a `plain`
   block after the paragraph that carries its asterisk, and never between the witness
   line and the execution. Where the official form prints its notes at the bottom of
   the page instead, use `foot_notes`.
3. **Multi-line values.** A `{{field}}` whose value carries newlines becomes one
   paragraph per line, of the block's own kind. A `numbered` block carries its
   numbering on through them, so leave room before the next number.
4. **Square brackets.** A square-bracketed passage that describes a fact to supply is
   a blank, whether or not it says provide, insert or give: `[postal address code and
   town and country]` becomes a declared field. Only bracketed alternatives, such as
   `[or Passport Number]`, stay verbatim. Turning a bracketed instruction into a field
   will usually cost one completeness warning, because the official line no longer
   matches; say so in `_review-log.md` and move on.

### `execution`

`{mode, signer, signer_label, verification}`. `signer` is `transferor`, `transferee`
or `both`.

| mode | What it emits |
|---|---|
| `deed` | the registry deed blocks, the passport photograph, the seal for a company, and the section 45 certificate of verification |
| `witnessed` | `SIGNED by the <signer_label> in the presence of:-` with the photograph, ID, PIN and signature lines, and the certificate of verification when `verification` is true |
| `declaration` | the jurat: `SWORN at ... by the said ... this ... day of ... 20...`, `BEFORE ME:`, `COMMISSIONER FOR OATHS`. `verb: "declared"` makes it `DECLARED at` |
| `signature` | a plain `Signature of <signer_label>`, `Name`, `Date` |
| `signature` (with `verification: true`) | the same three lines, then the section 45 certificate on its own, with no photograph cell |
| `none` | nothing, and no presentation clause |

Three optional keys carry wording the official forms vary:

- `verification: false` drops the section 45 certificate of verification, on `deed` as
  well as `witnessed`. LRA 17, for one, prints none. On `signature` mode the reverse:
  `verification: true` adds the certificate under the signature rule, with no photograph
  or identifier cell, which is how LRA 34 prints it.
- `signed_label` replaces the leading words of the signing cell, where the form words
  them its own way: a power of attorney reads `SIGNED and SEALED by the` where the
  default is `SIGNED as a deed by the`.
- `jurat_signatory` replaces the `COMMISSIONER FOR OATHS` line under a `declaration`
  jurat, for example LRA 47's `Signature of Commissioner for Oaths or Magistrate or
  Notary Public`.
- `verification_heading` replaces the certificate's heading, which the forms word two
  ways: the default `Certificate of Verification under Section 45 of the Land
  Registration Act`, and `Verification of execution pursuant to Section 45 of the Land
  Registration Act` on LRA 42, 43, 45, 48, 60, 61 and others. Verbatim-linted, so give
  the form's own words. Like `signed_label`, it takes one string or
  `{ transferor, transferee }`, for a form such as LRA 50 that heads its two
  certificates differently; a side left out keeps the default.
- `photograph: false` drops the coloured photograph cell from the signatory block,
  leaving the `ID/No`, `PIN No` and `Signature` lines. LRA 46's execution carries no
  photograph. The default is true, so nothing changes unless a form says so.
- `company_seal: false` drops the common seal block and the director's certificate from
  a company party's execution, keeping the attorney paragraph and its own certificate.
  LRA 53 and LRA 56 route the chargee straight to its attorneys and print neither seal
  nor director certificate; LRA 54 prints both before the attorney paragraph, so it
  leaves the key alone. The default is true. A company with no attorney paragraph keeps
  its seal whatever the key says, so a block is never left with nothing to sign.
- `verification_variant: "attorney"` certifies the attorneys rather than the party:
  `I CERTIFY that ... and ... being the duly constituted attorney(s) of the <party>
  appeared before me on ...`, which is what the official attorney forms print.
- `signed_label` and `signing_recital` may each be one string for both sides, or
  `{ "transferor": ..., "transferee": ... }` where the form words the two sides
  differently. LRA 60 signs one side `SIGNED by the duly authorised attorneys of the`
  and the other `SIGNED AND SEALED by the duly authorised attorneys of the`.
- `signing_recital` prints between `<signed_label> <party role>` and
  `in the presence of:-`. It is verbatim-linted and its `{{field}}` placeholders must be
  declared, so the drafter is actually asked for the power of attorney's particulars:

```json
"signing_recital": "under and by virtue of Powers of Attorney registered at the {{poa_lands_registry}} Lands registry as number {{poa_lands_no_1}} and {{poa_lands_no_2}} and at the registry of Documents at Nairobi as Number {{poa_docs_no_1}} and {{poa_docs_no_2}} respectively"
```

- `signatory_cell: "attorney"` prints the photograph, `Name` and
  `Signature of Attorney(s)` in the signatory cell, and leaves out the ID/Passport and
  PIN lines the official attorney block does not carry.
- `extra_blocks` adds a signatory the two party sides cannot express. Each entry is
  `{signed_label, signer_label, verification, name_field}` and renders after the party
  blocks, in the same frame: `<signed_label> <signer_label>` over `in the presence of:-`,
  the signatory's name from the declared `name_field`, and its own section 45
  certificate when `verification` is true. LRA 55 needs one for its borrower, who signs
  the charge without being the chargor or the chargee:

```json
"extra_blocks": [
  { "signed_label": "SIGNED as a deed by the", "signer_label": "Borrower(s)", "verification": true, "name_field": "borrower_name" }
]
```

A key an entry carries wins over the form-level one **even when it is empty**, which is
how a block says it has nothing of its own: `"signing_recital": ""` on an entry means
that signatory signs personally, whatever recital the form sets for its parties. Only a
key the entry leaves out falls through to the form level. Getting this backwards put a
power of attorney recital over a chargor who signed in person, which is the worst thing
this library can print.

An `extra_blocks` entry may also carry `signing_recital`, `signatory_cell`,
`verification_heading`, `verification_variant`, `photograph` and `company_seal`, each
meaning what it means above,
and `frame`: `"witnessed"` (the default) or `"deed"`, for a third signatory the
official form sets in the deed frame rather than the witnessed one.

On the schema path a company's second seal signatory reads `Director/Secretary`. A
signing block never straddles a page break: its rows are marked so the whole block
moves to the next page instead.

The `DRAWN BY` presentation clause follows every mode except `none`, and is always
firm level, never an advocate.

### The head: `filing_box`, `title_line`, `head_lines`

The head the engine draws is `Form <number>  <regulation>` over the three centred Act
lines, then the registry filing box, then the document title and the title line. Not
every form carries the same head, so three optional keys shape it, each defaulting to
what the engine already did:

| key | values |
|---|---|
| `filing_box` | `"default"` (Date Received / Presentation Book / Official Fees Paid), `"none"` for a form that carries no lodging box, or an array of verbatim lines, one per column of the box, drawn between the same two rules (LRA 96's box reads Registration Fees Paid and Receipt no. for registration) |
| `title_line` | `"default"` (the `<title_label>: <title number>` line), `"none"`, or an array of verbatim lines printed in its place, with `{{property_lr_no}}` where the number goes |
| `head_lines` | an array of verbatim lines printed at the very top of the form, above the `Form LRA NN` line, for a form with its own head: LRA 96 sets `SECOND SCHEDULE` over everything else |
| `act_lines` | an array of verbatim lines printed under `REPUBLIC OF KENYA`, in place of the default `THE LAND REGISTRATION ACT` and `THE LAND REGISTRATION (GENERAL) REGULATIONS, 2017`. LRA 83 cites the Act by number: `["THE LAND REGISTRATION ACT", "(No 3 of 2012)"]` |
| `pre_title_lines` | an array of verbatim lines printed after the filing box and before the document title, for a form whose head reads in that order (LRA 16 prints its matter heading, the Act and the title number there, then its title) |

The order the engine draws: `head_lines`, `Form <number>  <regulation>`, the three Act
lines, the filing box, `pre_title_lines`, the document title, the title line. Put each
line of the official head in the key that matches where the form prints it, and
`{{field}}` placeholders resolve in all of them.

A `filing_box` entry is one column of the box, and may carry its label over its blank
by holding a newline: `"Registration Fees Paid\nKshs."`. Every line of every entry in
these five keys, and in `foot_notes`, faces the same verbatim check as a body block, so
give the form's own words; a placeholder in any of them must be declared in
`custom_fields` like any other.

### `foot_notes`

An array of verbatim lines printed at the foot, after the presentation clause, held
together so a note block does not split across a page. Use it
for the Ministry's asterisked notes where the official form prints them at the bottom
of the page. The other rule still stands and is still the default: a note that explains
an asterisk in one paragraph can be a `plain` block right after that paragraph. Pick
whichever matches the form in front of you, and never put either between the witness
line and the execution.

### `registry_block`

Only 24 of the 95 official forms print the standard `REGISTERED and SEALED` block, and
the forms that carry a registrar section at all do not word it the same way, so each
form says for itself. Across the 66 schemas as written: 14 take the default, 30 carry
the form's own lines, and 22 print none.

| value | What it emits |
|---|---|
| `"default"` (or the field left out) | the standard `REGISTERED and SEALED ... LAND REGISTRAR` block for `deed`, `witnessed` and `signature`, and nothing for `declaration` and `none` |
| `"none"` | no registrar section, whatever the execution mode |
| an array of strings | those lines, verbatim and in order, in place of the standard block. Use it for a form with its own wording, for example LRA 58's `REGISTERED this ...` and `ENTRY in Encumbrances Section Number ...`. `{{field}}` placeholders resolve as everywhere else |

Set it explicitly from the official text: if `REGISTERED and SEALED` is in
`_source/lra-NN.txt`, `"default"`; if the form ends at the certifying signature (LRA 70,
for one), `"none"`.

### `annex`

`[{type: "statutory_declaration", heading, intro, body_lines?, closing_lines?, closing, jurat, jurat_signatory}]`.
The annex starts on its own page. `intro` and `closing` may carry `{{field}}`
placeholders.

The body can come from two places, and a form may use both:

1. `body_lines`, an array of verbatim lines the official annex pre-prints, such as
   LRA 10's `THAT I am the spouse of the ... the registered proprietor by virtue of the
   following:` and `I attach the following supporting documents:` with its listed
   items. Verbatim-linted like every other text the schema carries, and its `{{field}}`
   placeholders must be declared.
2. `declaration_text` from the data file, split on newlines, one numbered paragraph per
   line: the deponent's own grounds.

3. `closing_lines`, an array of verbatim lines the official annex prints after the
   deponent's grounds, such as LRA 10's `I attach the following supporting documents:`
   and the documents listed under it. Linted like `body_lines`.

**The order the annex prints, top to bottom:**

| | |
|---|---|
| `heading` | centred, bold, on its own page |
| `intro` | `I, <name> ... do hereby sincerely declare as follows:-` |
| `body_lines` | the form's pre-printed recitals |
| `declaration_text` | the deponent's own grounds, numbered from 1 |
| `closing_lines` | the form's lines that follow the grounds |
| `closing` | the single closing sentence |
| `jurat`, `jurat_signatory` | the jurat, the declarant's signature rule, then the signature rule for the person before whom it was declared |

So the form's words sit on both sides of the deponent's, which is how the official
annexes sequence them.

### `custom_fields`

`[{name, label, prompt, required}]`. Every `{{field}}` the schema uses that is not one
of the generator's base fields must be declared here. A required field the data file
does not carry stops the run before anything is written:

```
REFUSED: [lra_67] custom field "interest_claimed" (Interest claimed) is required.
```

Base fields, which need no declaration: `vendor_name`, `vendor_id`, `purchaser_name`,
`purchaser_id`, `property_lr_no`, `property_location`, `purchase_price_words`,
`purchase_price_figures`, `date`, `declaration_text`, `sworn_at`.

**A placeholder the data file cannot fill stops the run**, wherever it appears: a body
block, a detail row, an annex line, a head or foot key, an execution string. The
refusal names the field and the key it stood in:

```
REFUSED: [lra_35] body_text needs the field "purchase_price_figures", and the data file
has no value for it. A {{field}} in a registry form marks a fact, not a blank the
Ministry prints: the form would go out with a hole in it.
```

That is the difference between a `{{field}}` and a dotted line. The Ministry's dotted
lines are blanks to be filled in ink, and the schema carries them as the text they are;
a `{{field}}` is a fact the drafter must supply, so an empty one is a hole in a
registrable instrument, not a blank. A field that is only spaces counts as empty.

## Which forms get a schema

A form gets a schema when a firm signs, swears or lodges it. A form does not when the
Land Registrar issues, orders, seals or signs it, or when it is a register or a
certificate the registry maintains. Those 25 are in `_excluded.json` with the reason,
each confirmed against its own `_source` text. Drafting one would be producing a
registrar's document.

Four forms are not schemas at all: LRA 33, LRA 58, LRA 63 and LRA 84 have hand-built
builders in `generate-conveyancing-document.js`, and `build-index.js` lists them from a
static table. One form, one builder: the index refuses a form that has both.

The library is closed at 66 schemas and those 4 builders, so `_index.json` publishes 70
draftable forms beside the 25 it refuses: 95 in all, which is every form the Ministry
publishes.

## The tools

```bash
node scripts/form-schemas/lint.js [ids...]         # every schema against the official text
node scripts/form-schemas/build-index.js           # rewrite _index.json
node scripts/form-schemas/render-all.js <outDir> [--pdf] [--bundle] [ids...]
```

- **lint** after writing or editing any schema, and before every commit. It checks the
  required fields, the form number against the official text, the regulation and title
  verbatim, every body block, every undeclared placeholder, em dashes, the party mode,
  the execution mode, the `registry_block` shape, and a signer the party mode cannot
  produce. One `FAIL` line per problem, exit 1.
  It also **warns**, without failing, when an operative paragraph of the official form
  (any line of 60 characters or more that is not a dotted blank) appears nowhere in the
  schema. That is the other direction from the verbatim check: `FAIL` proves nothing
  was invented, `WARN` proves nothing was left out. Blanks compare as blanks, so a run
  of dots in the official text and a `{{placeholder}}` in the schema are the same
  thing. A warning is not always a defect: a form's notes, its registry furniture and
  its cell-wrapped labels legitimately produce them. Read each one, then either cover
  the paragraph or say in `_review-log.md` why it is not covered.
- **build-index** after adding or removing a schema. `_index.json` is what the drafting
  command reads to know what it can draft.
- **render-all** to see the form. With no `KENYA_CONVEYANCING_FIRM_CONFIG` in the
  environment it renders against the fixture firm in `scripts/test-fixtures` in an
  isolated HOME, so nothing real leaks into a test render. It uses the source generator
  when `scripts/node_modules` is installed and the committed bundle otherwise;
  `--bundle` forces the bundle.

## The review procedure

A schema is not done when the lint passes. It is done when a person has read the
rendered form against the official text.

```bash
cd scripts && node form-schemas/render-all.js /tmp/lra-review --pdf lra_NN
```

Read every page of `/tmp/lra-review/lra_NN.pdf` beside `_source/lra-NN.txt`: the form
number and regulation, the title, every detail row and its order, every paragraph,
who signs and how, the annex, the registry block. Fix the schema or the builder, render
again, then log one line in `_review-log.md`:

```
- [2026-09-22] lra_NN: read by ED, matches the official form
```

## Adding a form

1. Read `_source/lra-NN.txt` in full. Decide the party roles, the detail rows in the
   official order, the body paragraphs, the execution wording, whether the form carries
   a registration block and in what words, and any annex.
2. Write `lra_NN.json`. Never type a title, a regulation or a clause from memory.
3. `node form-schemas/lint.js lra_NN` until clean.
4. `node form-schemas/render-all.js /tmp/lra-review --pdf lra_NN` and read the PDF.
5. `node form-schemas/build-index.js` and `node --test scripts/form-schemas.test.js`.

## Worked example: `lra_67.json`

```json
{
  "form_id": "lra_67",
  "form_number": "LRA 67",
  "regulation": "(r. 80(1))",
  "doc_title": "CAUTION",
  "doc_title_official": "CAUTION",
  "source": {
    "url": "https://lands.go.ke/sites/default/files/Ardhi%20Forms/Form-LRA-67-CAUTION.doc",
    "fetched": "2026-09-22",
    "text": "_source/lra-67.txt"
  },
  "category": "application",
  "when_used": "A person claiming an interest in land lodges a caution so that no dealing is registered on the title without notice to them.",
  "party_mode": "two_party",
  "party_roles": {
    "transferor": "Cautioner",
    "transferor_single": "Cautioner",
    "transferee": "Proprietor",
    "transferee_single": "Proprietor"
  },
  "title_label": "TITLE NUMBER",
  "detail_rows": [
    { "label": "Date of Caution", "value_blank": true },
    { "label": "The Cautioner: Give full name(s)", "value_field": "transferorNames", "bold": true },
    { "label": "ID/Passport No./Registration No of the Cautioner (if any)", "value_field": "transferorIDs" },
    { "label": "Address of the Cautioner (within Kenya for service of Notice).", "value_field": "cautioner_address" },
    { "label": "The Proprietor: Give full name(s)", "value_field": "transfereeNames", "bold": true },
    { "label": "ID/Passport/Registration No. of the Proprietor (if any)", "value_field": "transfereeIDs" },
    { "label": "PIN Number.", "value_field": "proprietor_pin" },
    { "label": "Citizenship/Place of registration.", "value_field": "proprietor_citizenship" },
    { "label": "Address of the Proprietor (within Kenya for service of notice).", "value_field": "proprietor_address" },
    { "label": "Interest Claimed", "value_field": "interest_claimed" },
    { "label": "Extent or Scope of the Caution (Absolutely/Subject to the Interest of the Cautioner)", "value_field": "caution_scope" }
  ],
  "body_text": [
    { "type": "intro", "text": "The Cautioner HEREBY APPLIES for registration of a Caution over the above Title to the extent or scope stated above." },
    { "type": "plain", "text": "The Cautioner forbid the registration of dealings and the making of entries in the register relating to the Title to the extent or scope of the Caution without the Cautioner's consent until this Caution has been withdrawn by the Cautioner or removed by order of the Court or the Registrar." },
    { "type": "plain", "text": "The Cautioner hereby attaches the following documents is support of the application*:-" },
    { "type": "plain", "text": "{{supporting_documents}}" },
    { "type": "plain", "text": "*Copies of Sale Agreement, Letters of Administration, Letter of Offer etc" },
    { "type": "witness", "text": "IN WITNESS the Cautioner has signed this Caution." }
  ],
  "execution": { "mode": "witnessed", "signer": "transferor", "signer_label": "Cautioner", "verification": true },
  "registry_block": "default",
  "annex": [
    {
      "type": "statutory_declaration",
      "heading": "STATUTORY DECLARATION",
      "intro": "I, {{declarant_name}} (in support of this caution) do hereby sincerely declare as follows:-",
      "closing": "I make this declaration conscientiously believing the same to be true and according to the Oaths and Statutory Declaration Act.",
      "jurat": "DECLARED before me at",
      "jurat_signatory": "Signature of Advocate or Land Registrar"
    }
  ],
  "custom_fields": [
    { "name": "cautioner_address", "label": "Address of the Cautioner", "prompt": "Postal address within Kenya for service of notice on the cautioner", "required": true },
    { "name": "interest_claimed", "label": "Interest claimed", "prompt": "The interest the cautioner claims in the land, for example purchaser under a sale agreement dated 1st September 2026", "required": true },
    { "name": "declarant_name", "label": "Name of the declarant", "prompt": "Full name of the person swearing the statutory declaration in support of the caution", "required": true }
  ],
  "pairs_with_lra9": true
}
```

The `custom_fields` list above is shortened for the page. The file itself declares every
fact the form leaves a blank for. Note the body: `documents is support` is the official
form's own wording, kept as the Ministry prints it.
