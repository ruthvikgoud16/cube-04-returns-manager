# Export workflow

Drive stays the place people upload. The Returns Manager model, policy, and scoring are not run from this step.

```sh
npm run collection:validate
npm run collection:export
```

`collection/export/manifest.csv` lists the 50 slots and the assignment status.

`collection/export/cases/RTN-001/metadata.json` stores the identifiers.

`collection/export/cases/RTN-001/photos/` is created empty until a Drive download is added. The manifest column `photo_bytes` stays `NOT_DOWNLOADED`. Empty folders are not treated as submitted photographs.

To place that tree where the evaluation set will live, copy `collection/export` into `eval` only after the photos exist. Do not copy it over `eval/labels.csv`.
