---
title: A file field is a plain String, wired through env vars — not a settings.json type
impact: HIGH
impactDescription: There is no "file" type in settings.json's validator — a field meant to hold an uploaded file's name is plain String. Forgetting the env-var wiring leaves the field looking identical in settings.json while silently never receiving an uploaded file.
tags: data, model, settings, file, upload, file-manager, env-vars
---

# A file field is a plain String, wired through env vars — not a settings.json type

## Why it matters

`data-model-field-shapes`'s type table has no `file`/`upload` type, and there isn't one to add —
`validateSettings()` only knows `String`, `Number`, `Boolean`, `Date`, `Dateonly`, `Array`,
`Object`, `ObjectId`. A field that stores an uploaded file is **always `"type": "String"`** — it
holds the filename the `file-manager` package (`@backend/file-manager`, Multer-based) returns
after saving the upload to disk, not the file itself.

What actually turns a plain `String` field into a working upload field is **three env vars on the
app**, not anything in the field's own `settings.json` definition:

- **`API_FILE_FIELDS`** — a comma-separated list of **field names** (bare key, not a path) that the
  generated service treats as files. Every generated service (`services/<model>.js`) already
  contains the save-on-write/delete-on-replace logic generically — it's driven entirely by whether
  the field's key name appears in this list, not by anything per-model. Matching is by **bare key
  name at any nesting depth**, so two unrelated fields that happen to share a name (e.g. `url` used
  in two different nested objects) would *both* be treated as files — keep file-field names unique
  across the whole model to avoid that.
- **`API_UPLOAD_INCLUDE_PATHS`** — a comma-separated list of route base paths (e.g.
  `/data_model,/sub_data_model`) that get the Multer middleware applied. A field listed in
  `API_FILE_FIELDS` whose model's route isn't here never actually receives `req.files` — the
  upload silently never arrives.
- **`API_UPLOAD_PATH`** (optional) — the disk destination for saved files; defaults to
  `<cwd>/<app>-uploads` when empty.

These three already exist as standard env vars on a generated `api-rest` app (see
`backend/settings.json` → `environmentVariables` and `backend/.env` in the example project) — you
**edit their existing value**, you don't create a new env var for this.

Saved files are served statically at `<API_PATH>/files/<storedFilename>` (the app wires this once,
in `apps/api/index.js`, via `server.setStaticPublicFolder`). The frontend builds the displayable
URL from that — see `frontend-developer`'s `data-ui-model-field-shapes` `file` type
(`apiHost`/`imageHost`/`apiPath`) — building that URL is never the backend's job.

## Incorrect Example

Inventing a backend type, or adding the field without wiring the env vars:

```jsonc
// ❌ "file" is not a settings.json type — validateSettings() doesn't recognize it
"image_url": { "type": "file" }
```

```bash
// ❌ Field added to settings.json as String, but never added to API_FILE_FIELDS —
// uploads will silently be ignored; the field just stays empty/whatever was sent as text
API_FILE_FIELDS=other_field
```

```javascript
// ❌ Writing save/delete-file logic by hand inside a model's own service —
// this already exists generically in every generated service
async add(config) {
	const saved = await this.storageProvider.saveFile(config.files[0], newName) // duplicate logic
	// ...
}
```

## Correct Example

A `String` field, wired through the env vars, exactly as the example project does it:

```jsonc
// settings.json — plain String, nothing special
"image_url": { "type": "String" }
```

```bash
# .env (or settings.json's environmentVariables) — edit the EXISTING values
API_FILE_FIELDS=image_url,nested_url,sub_nested_url
API_UPLOAD_INCLUDE_PATHS=/data_model,/sub_data_model
API_UPLOAD_PATH=
```

Nothing else to write — `services/data_model.js`'s generated `add`/`update`/`replace`/`remove`
already call `FileManagerHandler` to save the new file and delete the stale one whenever the
field's key name is in `API_FILE_FIELDS`.

## Key Rules

1. **A file field's `settings.json` type is always plain `String`** — never invent a `file` type
   on the backend side; that label only exists in `ui-settings.json` (`data-ui-model-field-shapes`).
2. **Add the field's bare name to `API_FILE_FIELDS`** (edit the existing env var's value) — keep
   file-field names unique across the model, since matching is by key name only, at any nesting
   depth.
3. **Add the model's route base path to `API_UPLOAD_INCLUDE_PATHS`** — without it, Multer never
   parses the multipart body on that route and the field never receives an uploaded file.
4. **Don't write save/delete-file code by hand** in a model's own service — the generated
   `add`/`update`/`replace`/`remove` already do this generically through `FileManagerHandler`,
   driven by the env vars above.
5. **Building the displayable URL is the frontend's job**, not the backend's — the backend only
   ever stores and returns the bare filename.
