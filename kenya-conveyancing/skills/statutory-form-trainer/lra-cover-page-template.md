# MAK LRA Cover Page Template

Reference analysed: `TSAVO RISING TRANSFER FORM TEMPLATE.docx` supplied by MAK.

## Fixed layout

- A4 page with 1-inch margins; plain white page with no correspondence header, footer, or page number.
- Default cover typeface: Maiandra GD, 12 pt; centered, bold text throughout the title sheet.
- Opening sequence: transferor name, `(as Transferor)`, `AND`, transferee name, `(as Transferee)`.
- A full-width thin horizontal rule separates the parties from the instrument title.
- Instrument block: `TRANSFER`, `(Sectional Title)`, `in respect of`, followed by the property description in centered lines.
- A second full-width thin rule separates the property description from the drafter identification.
- Closing block: underlined `DRAWN BY:` followed by the exact MAK logo image used in the supplied template, centered at approximately 1.15 inches wide.
- A hard page break follows the logo. The statutory form begins on page 2.

## Filing-page identity block

The reference's second page begins with a centered, bold five-line MAK address block:

```text
4th Floor, Victoria at Two Rivers,
Two Rivers Development, Limuru Road,
P.O Box 10644 - 00100, Nairobi, Kenya
E: mak@makadvocates.com
www.makadvocates.com
```

This block is followed by the statutory form heading and registry receipt row. The sample has no footer or page number.

## Data fields

The generator accepts these optional cover-specific fields:

- `cover_property_description` for a single description string.
- `cover_property_description_lines` for exact line breaks from an approved reference.
- `apartment_number`, `property_location`, and `property_lr_no` as fallback property fields.
- `title_no` or `title_number` as fallback title-number fields.

The transferor and transferee names are taken from the same flat or array party data used by the statutory form. LRA 58 maps chargee and chargor names into the same cover positions; LRA 84 uses a title-only cover.

## Reference discrepancy

The supplied filename describes an LRA 33 transfer, but its statutory page is labelled `Form LRA-63` and cites regulations 76(2)(g) and 77(2)(g). The cover template is therefore kept instrument-driven, while the statutory form number remains controlled by `doc_type` and its trained schema.
