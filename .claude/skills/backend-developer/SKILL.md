---
name: backend-developer
description: Guidelines and rules for adding or editing code in the backend project (layered architecture, services, commands, repository, and packages).
license: MIT
metadata:
  author: System
  version: "1.0.0"
---

# Backend Developer

Guide for adding or editing code in the `backend` project of this workspace.
Every new feature or change must respect the layered architecture, service
granularity, the command pattern, and consuming packages through their handlers.

## When to use this skill

Reference these guidelines whenever:

- You need to **add or edit code** in the backend project.
- You implement a new feature or business process.
- You create a service, a command, or modify data access.
- You handle dates, packages, or responses that contain data models.
- You start, commit, push, or open a PR for any task from this project's `DOCUMENTATION.md`.

## Response language

**Always respond in the same language the user's prompt is written in.**

## Resources

Before starting, review the resources to orient yourself in the project:

- `resources/ARCHITECTURE.md` — Layered architecture and the purpose of each layer.
- `resources/PACKAGE-LIST.md` — List and description of the available packages.

## Rule categories by priority

| Priority | Category           | Impact      | Prefix  |
| -------- | ------------------ | ----------- | ------- |
| 1        | Workflow & Process | CRITICAL    | `proc-` |
| 2        | Architecture       | CRITICAL    | `arch-` |
| 3        | Data Access        | HIGH        | `data-` |
| 4        | Testing            | HIGH        | `test-` |
| 5        | Coding Standards   | MEDIUM-HIGH | `code-` |

## Quick reference

### 1. Workflow & Process (CRITICAL)

- `proc-reuse-commands` — Before creating a command, check for a reusable one to use without modifying it; design commands to be reusable.
- `proc-no-new-packages` — Never install external packages or create new packages unless explicitly told; if you create one, mirror the `packages/` structure.
- `proc-mcp-scaffolding` — Scaffold via `easy-node-mcp` in the right order (app → model → business logic): create the app, generate all models, then implement the processes. The project itself is created by `technical-leader`, before this skill runs. A model's shape is defined by hand in `settings.json`/`ui-settings.json`, never by a tool.
- `proc-git-task-workflow` — For every task: sync `develop`, branch `feature/<abbreviation>-<number>` from it, implement, commit/push, then `gh pr create --base develop` with a skimmable, grouped summary of the changes.

### 2. Architecture (CRITICAL)

- `arch-services-layer` — Every task is implemented in the services layer, unless stated otherwise.
- `arch-service-granularity` — One model = one service. Single-model process → its service; multi-model process → a service exclusive to the process.
- `arch-command-steps` — Structure each process as a sequence of steps; each step is a single-method class in `services/commands`, invoked inside the main process method, and each step invocation carries a brief one-line comment.
- `arch-controller-route-wiring` — Every new or changed service method needs a controller method and a route entry; which of the 3 wiring cases applies depends on whether you're extending a generated CRUD action, adding a sibling action to the same model, or serving a different consumer.
- `arch-use-handlers` — Always use packages through their corresponding handler.
- `arch-contract-filtering` — Filter every data model present in a process response with its contract.

### 3. Data Access (HIGH)

- `data-model-field-shapes` — Define a model's fields by hand in `settings.json` (types, `contentType`, `structure`, `ref`, nesting) before generating it.
- `data-file-fields` — A file field is plain `String` in `settings.json`; the upload actually works through `API_FILE_FIELDS`/`API_UPLOAD_INCLUDE_PATHS`, not a settings.json type.
- `data-repository-queries` — Fetch data with `findOne` and `list` from the `entity-queries` package through the repository.
- `data-transactions-multi-write` — Wrap writes in a transaction (shared session) whenever a process writes to two or more collections.

### 4. Testing (HIGH)

- `test-method-coverage` — Every service method and command's `execute` method needs its own `node:test` unit test; treat it with the same priority as controller/route wiring.
- `test-mirror-and-mock` — Test paths mirror `src/` 1:1 under `tests/unit/`; mock external dependencies (repository, storage, network) completely via `tests/support/mock-repository-preload.js`; assert the full returned value in every tier — service (deepEqual on result), controller (full `{ success, message, statusCode, content }` envelope with actual content values), and crud (complete round-trip payload for every operation, not just status codes).

### 5. Coding Standards (MEDIUM-HIGH)

- `code-luxon-dates` — Handle dates with `luxon` (served by `data-validator`), passing at least `zone=utc`.

## How to use

Read each rule file for the explanation and code examples:

```
rules/proc-reuse-commands.md
rules/proc-mcp-scaffolding.md
rules/proc-git-task-workflow.md
rules/arch-services-layer.md
rules/arch-command-steps.md
rules/arch-controller-route-wiring.md
rules/arch-contract-filtering.md
rules/data-model-field-shapes.md
rules/data-file-fields.md
rules/data-repository-queries.md
rules/data-transactions-multi-write.md
rules/test-method-coverage.md
rules/test-mirror-and-mock.md
rules/code-luxon-dates.md
```

Each rule file contains:

- A brief explanation of why it matters.
- An incorrect example with its explanation.
- A correct example with its explanation.

Complete examples in `examples/`:

```
examples/repository-queries.js   — using findOne and list through the repository
examples/command-process.js      — multi-model process with steps in commands
```
