---
title: Scaffold with the easy-node-mcp tools in the right order
impact: CRITICAL
impactDescription: The MCP tools only materialize files for state that already exists in settings.json/ui-settings.json; calling them out of order, or assuming a tool defines a model's schema, fails or silently no-ops.
tags: process, mcp, scaffolding, settings, sequencing
---

# Scaffold with the easy-node-mcp tools in the right order

## Why it matters

`easy-node-mcp` exposes the `enode` CLI as tools (`create_app`, `generate_model`,
`generate_evar`, `generate_process_manage`, etc.). Their JSON schemas only tell
you the parameter names and types — not the order they must be called in, or
the project state they assume already exists. Calling them out of order, or
expecting one to define something it only materializes, fails with a CLI
error or does nothing useful.

**`create_project`/`create_ui_project`/`init_ui_project` are not this skill's tools.**
The project shell itself is created once by `technical-leader`, which also hands this
skill a scoped `DOCUMENTATION.md` at the project's own root (see `technical-leader`'s
`proc-genesis-scope`/`doc-scoped-handoff`) before any of the rules below ever apply.

## Sequencing rules

1. **App → model**, always in that order: `create_app` before any
   `generate_model`/`generate_models`. Mirror this for the frontend:
   `create_ui_app` before `generate_ui_model`/`generate_ui_models`.
2. **Models → business logic**, always in that order: define and generate **every**
   model the work needs (each defined by hand in `settings.json`, then materialized
   with `generate_model`/`generate_models`) **before** implementing any business-logic
   process in the services layer. A process references models, repositories, and
   interfaces that only exist once their model is generated — writing the logic first
   means coding against files that aren't there yet. This mirrors the order of the
   `DOCUMENTATION.md` Task List, which lists all models first, then the processes.
3. **There is no `create_model` tool, on purpose.** `generate_model` /
   `generate_models` / `generate_ui_model` / `generate_ui_models` only
   materialize files for a model that must already exist as an object under
   `settings.json` → `apps[].models` (or `ui-settings.json` → `apps[].models`).
   Define the model's shape yourself by editing that JSON file directly
   (see `data-model-field-shapes` for the full field-type reference and
   worked examples), then call the generate tool to produce the layered
   files for it.
4. **`generate_process_manage` only succeeds while the project has zero
   apps** (a known inverted-condition bug in the CLI, not a design choice).
   If you need a process manager (pm2), call it right after `technical-leader`
   hands you the new project, before your first `create_app` — calling it
   after apps exist will fail.
5. The `confirm`/`-y` flag on `delete_app`, `delete_ui_app`, `generate_model(s)`,
   `generate_ui_model(s)`, and `delete_process_manage` only has an effect when
   the target name (and `appName`, where applicable) is also supplied in the
   same call. It does not mean "skip whatever confirmation comes next" — passing
   it alone without a name throws a validation error instead of bypassing a
   prompt.

## Gotchas the schema can't show you

- **Evar names must be unique across the whole project, not just the target
  app.** `generate_evar` rejects a name already used by *any* app's
  `environmentVariables`, even a different one than the `appName` you passed.
- **`preserveEvar`/`preserveModel` don't delete — they mark
  `generated: false`.** An item already preserved this way can no longer be
  removed by name through the plain delete tool afterward (it's filtered out
  of what counts as deletable). If you actually want it gone, delete it
  without the preserve flag the first time.
- **A model object needs more than `fields` to generate successfully**, and
  the CLI validates the *entire* `settings.json` shape before running any
  backend command — a malformed model anywhere in the file blocks
  `generate_model` even for an unrelated app. See `data-model-field-shapes`
  for the full field-type reference and worked examples.

## Key Rules

1. Create the app (backend and/or UI) before touching models — the project
   itself was already created by `technical-leader`, before this skill runs.
2. Define a model's shape by hand in `settings.json`/`ui-settings.json` first;
   only then call the matching `generate_*` tool to produce its files.
3. Generate **all** the models first; only then implement the business-logic
   processes in the services layer (models before logic).
4. Set up `process-manage` before creating apps, not after.
5. Pass `confirm`/`-y` together with the target name, never alone.
6. Check existing env var names project-wide before generating a new one, and
   don't expect a `preserve`-deleted item to be deletable again by name.
