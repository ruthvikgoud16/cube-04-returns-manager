# CLAUDE.md

Durable rules for this fork. Work items do not belong here.

- One model call per return. It grades identity, completeness, and condition together. It does not choose disposition.
- `policy_v1` runs after Zod validation. Confidence never turns UNCERTAIN into PASS.
- A model error, timeout, bad schema, or unusable photo still saves the capture as `pending_review`.
- Identity is visual likeness to the named product. A missing SKU or ASIN stays UNKNOWN. Do not invent one. Likeness can pass without a barcode. If the name, brand, and model are all blank, identity stays UNCERTAIN.
- Do not invent parts, damage, or identifiers that are not in the photographs.
- A required part that is simply not in frame is UNCERTAIN, not FAIL.
- `dispose` is not produced by `policy_v1`.
- Every stored row and image key is scoped to `organization_id`. Demo orgs are `org_demo_alpha` and `org_demo_bravo`.
- `content_hash` is SHA-256 of the canonical JSON. Do not describe it as tamper-proof or immutable.
- Amazon condition names follow https://www.amazon.com/gp/help/customer/display.html?nodeId=201889720 . Do not invent a scale. Do not claim function from a photo.
- Do not print accuracy, false positives, or false negatives unless two different labelers have filled `eval/labels.csv`.
- No API keys in git. Use `.env`.
- Do not open a pull request into the organiser repository.
