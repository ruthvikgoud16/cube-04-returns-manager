# Google Drive permissions

## Intended model

One root link. The root folder is view-only. It is not an editable workspace for every contributor.

```
ONE ROOT LINK  (view the list)
      │
      ├── Product 01 → assigned person only
      ├── Product 02 → assigned person only
      └── Product 50 → assigned person only
```

Each product folder turns on Google’s limited access (`inheritedPermissionsDisabled`), so a visitor of the root does not inherit access into that product. The assigned Google account gets writer on that one product folder. The account that created the collection remains the owner. `collection:create` does not share the root. `collection:publish` sets the link permission to `anyone` + `reader` and is rejected if that role is anything else. Publish waits until two accounts have tested the isolation.

## What is not claimed

A second Google account has not clicked into Product 01 and Product 02 from this environment. `npm run collection:verify-permissions` can read permission metadata. It cannot prove that Deepika is unable to edit Product 02. That line is reported as `NOT_VERIFIABLE` until two accounts actually try it.

## If limited access cannot be set

The script does not share the root with everyone. Sharing the root as a viewer while children still inherit that viewer role would let every contributor open every product. That weaker mode is not used silently. Each person would then be given only their own product folder link.

## What a contributor can do after a successful setup

They open the one root link, open only their product, and edit it. Another product folder should show that they need access. They are not given writer on any other product.
