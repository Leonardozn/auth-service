---
name: technical-writer
description: Guidelines and rules for analyzing a backend or frontend project's codebase and writing its `PRD.md` testing contract and `README.md` user-facing documentation — what to inspect before writing, the fixed naming/location convention, the canonical structure for each document, which content belongs in which doc, and how to derive verifiable functional requirements and Given/When/Then scenarios. Use whenever asked to document a project, write a PRD, write/update a README, or define what should be tested to verify a project works correctly.
license: MIT
metadata:
  author: System
  version: "1.1.0"
---

# Technical Writer (Project PRD & README)

Guide for **analyzing an existing backend or frontend project** and producing two documents,
both derived from the actual code — not invented alongside it:

- **`PRD.md`** — a testing contract: what the software must do and how to verify it, for a
  tester/agent (e.g. TestSprite) to derive tests from.
- **`README.md`** — user-facing technical documentation: what the project is and how to
  install, configure, and use it, for a developer or end user.

> This skill is about *documenting* a project. It does not write or run tests itself — see this
> repo's own **`qa`** skill for an example of a skill that consumes a PRD to write tests.

## When to use this skill

- Asked to **document a project**, **write a PRD**, or **write/update a README** for a backend
  or frontend codebase.
- Asked to define **what should be tested** to verify a project "works correctly."
- Handed an unfamiliar repo and asked to produce its documentation/testing contract.

## Response language

**Always respond in the same language the user's prompt is written in.**

## Output

Two files, both at the **root of the backend/frontend project this skill lives inside** (the
same convention as `backend-developer`/`frontend-developer`: this skill is expected to sit in
that project's own `.claude/skills/`, not at a workspace root wrapping several services):
`PRD.md` and `README.md` (see `proc-doc-naming-location`). Use `resources/PRD-TEMPLATE.md` and
`resources/README-TEMPLATE.md` as the section skeletons. A given task may call for one or both —
only produce the one(s) actually requested.

Each microservice gets its own independent `PRD.md`/`README.md` — this skill never produces one
combined pair covering several services at once. If a single document spanning the whole
system is ever needed, that is a separate, not-yet-built skill's job, not this one's.

## Rule categories by priority

| Priority | Category            | Impact   | Prefix    |
| -------- | -------------------- | -------- | --------- |
| 1        | Workflow & Process   | CRITICAL | `proc-`   |
| 2        | Document Structure   | HIGH     | `struct-` |
| 3        | Scope                | HIGH     | `scope-`  |

## Quick reference

### 1. Workflow & Process (CRITICAL)
- `proc-analyze-before-writing` — Read the actual codebase (entry points, routes/controllers,
  data models, UI routes/components, scripts, env handling) before drafting a single
  requirement or doc section; never invent content unsupported by the code.
- `proc-doc-naming-location` — Output files are always exactly `PRD.md` and `README.md`, at the
  **root of the microservice this skill lives inside** — no project-name prefix, and never one
  shared pair covering more than one service.
- `proc-traceability` — (`PRD.md` only) Every functional requirement gets a stable ID and at
  least one Given/When/Then scenario referencing it; success metrics reference FR IDs too.

### 2. Document Structure (HIGH)
- `struct-self-contained` — Neither doc defers its own essential content to the other (or to
  `CLAUDE.md`) — each must stand alone for its own audience; verify shared facts against the
  code independently in each place rather than copying between docs.
- `struct-prd-sections` — `PRD.md`'s canonical skeleton: Overview, Scope (in/out), Functional
  Requirements by category, NFRs, Success metrics, Test strategy/tiers, Scenarios table, How to
  run the tests.
- `struct-readme-sections` — `README.md`'s canonical skeleton: title/description, Features,
  Prerequisites, Installation, Configuration, Usage, API/route/component reference, Project
  structure, Testing (if applicable), optional Contributing/License.

### 3. Scope (HIGH)
- `scope-backend-vs-frontend` — Adapt FR categories and test tiers (`PRD.md`) and the
  install/usage/reference content (`README.md`) to whether the microservice this skill lives
  inside is backend or frontend.
- `scope-doc-audience` — Route each piece of content to the document matching its audience: FR
  ids/NFRs/scenarios → `PRD.md` only; install/config/usage/narrative → `README.md` only.

## How to use

Read each rule for the explanation and examples:

```
rules/proc-analyze-before-writing.md
rules/proc-doc-naming-location.md
rules/proc-traceability.md
rules/struct-self-contained.md
rules/struct-prd-sections.md
rules/struct-readme-sections.md
rules/scope-backend-vs-frontend.md
rules/scope-doc-audience.md
```

Then copy `resources/PRD-TEMPLATE.md` to `PRD.md` and/or `resources/README-TEMPLATE.md` to
`README.md` at **this microservice's own root**, and fill them in from the codebase analysis of
this project.
