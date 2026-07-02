---
title: Fixed names `PRD.md` / `README.md`, always at this microservice's own root
impact: CRITICAL
impactDescription: An inconsistent name or location defeats the convention's purpose — other skills/tools (and humans) that look for "the PRD" or "the README" expect one predictable, discoverable file at the root of the specific service they're working on, independent of any other service in the same workspace.
tags: process, naming, location, convention
---

# Fixed names `PRD.md` / `README.md`, always at this microservice's own root

## Why it matters

This skill is expected to live **inside a single backend or frontend microservice's own
`.claude/skills/`** — the same convention as `backend-developer`/`frontend-developer` — not at an
outer workspace root that wraps several services. There is exactly one project being documented
per microservice, so the output files don't need a project-name prefix to disambiguate them. The
deliverables are always:

- **`PRD.md`** — the testing contract (see `struct-prd-sections`).
- **`README.md`** — the user-facing technical documentation (see `struct-readme-sections`).

Both go at **the root of the microservice this skill lives inside** — sibling to its own
`package.json` — never at an outer workspace root, and never shared across more than one
microservice. If the workspace contains a backend and a frontend microservice, each one gets its
own independent `PRD.md`/`README.md`; this skill never produces a single combined pair covering
both. Do not prefix either filename with the project's name — the fixed names are the whole
point: anyone opening that microservice knows exactly where to look.

## Incorrect Example

```
workspace/
  backend/
    .claude/skills/technical-writer/
    package.json
  frontend/
    package.json
  PRD.md                     # ❌ at the outer workspace root, not inside the backend microservice
  README.md                  # ❌ same problem — and it would have to cover both services at once
```

## Correct Example

```
workspace/
  backend/
    .claude/skills/technical-writer/
    package.json
    PRD.md                   # ✅ this microservice's own contract, at its own root
    README.md                # ✅ this microservice's own docs, at its own root
  frontend/
    .claude/skills/technical-writer/
    package.json
    PRD.md                   # ✅ a separate, independent pair for the frontend microservice
    README.md
```

## Key Rules

1. Output filenames are always exactly `PRD.md` and `README.md` — never prefixed or suffixed
   with a project name.
2. Both files land at **the root of the microservice this skill lives inside**, sibling to its
   `package.json` — never at an outer workspace root wrapping several services.
3. Each microservice gets its own independent pair — never one shared `PRD.md`/`README.md`
   covering more than one service.
4. If `PRD.md` or `README.md` already exists at this microservice's root, update it in place
   (preserve any sections the user has hand-edited that still match the code) rather than
   creating a second file or renaming the existing one.
