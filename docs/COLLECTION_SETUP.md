# Collection setup

This is separate from the Returns Manager. It only creates the Google Drive folders and local registries.

## Google account

There is no Google login stored in this repository. Connect Drive once:

```sh
composio link googledrive
```

That opens Google’s own consent screen. Do not paste a token into the chat or into git.

## Create the one collection

```sh
npm run collection:create
```

This creates `CUBE 2026 — RTN PRODUCT COLLECTION`, product folders 01 through 50, the detail and photo folders, the status and detail documents, and `00 — READ ME FIRST`.

Running it again reuses those folders. It does not create `PRODUCT 01 (1)`.

The root is not shared by create. It stays private to your Google account. `npm run collection:publish` shares that folder as view-only, and only if every product folder has limited access. Do not publish, and do not send the link to all 50 people, until two Google accounts have confirmed that account A can edit Product 01 and cannot edit Product 02, and account B can edit Product 02 and cannot edit Product 01.

A dry run prints the plan and changes nothing:

```sh
npx ts-node collection/cli.ts create --dry-run
```

## Assign someone

```sh
npm run collection:assign -- RTN-001 deepika@example.com Deepika
npm run collection:assign -- RTN-002 akshita@example.com Akshita --dry-run
```

The dry run does not change Drive or the registry.

## Check and export

```sh
npm run collection:status
npm run collection:validate
npm run collection:verify-permissions
npm run collection:export
```

Export writes `collection/export`. Photo files are not downloaded automatically. The export says `NOT_DOWNLOADED` rather than inventing images.
