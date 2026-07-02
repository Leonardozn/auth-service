---
title: Analyze the codebase before drafting any requirement or section
impact: CRITICAL
impactDescription: A PRD or README invented or assumed rather than derived from the actual code documents an imagined system, not the real one — every requirement, scenario, or install/usage instruction built on it is wrong from the start, and a tester (or a new developer following the README) gets false confidence or broken steps.
tags: process, analysis, prd, readme, source-of-truth
---

# Analyze the codebase before drafting any requirement or section

## Why it matters

The whole point of `PRD.md` is to be a **verifiable contract**, and of `README.md` to be
**accurate usage instructions** — both traced back to what the project actually does. Writing
either from the project's name, existing-doc claims, or general assumptions about "what a
typical app like this does" produces a document that looks plausible but doesn't match
reality — a test derived from a wrong FR passes vacuously or fails against correct code, and an
install/usage step that doesn't exist breaks the first time someone follows the README.

Before writing a single FR or README section, inspect:

- **Entry points** — `package.json` `scripts`/`main`/`bin`, the framework's routing/bootstrap
  file (`app.js`, `main.ts`, `src/index.*`, Next.js/Nuxt page/route conventions, etc.).
- **Backend**: routes/controllers (what endpoints exist, methods, params), data models/schemas
  (required fields, types, validation rules), middleware (auth, error handling), and the
  response shape actually returned (not an assumed envelope).
- **Frontend**: routes/pages, the component tree for each route, forms and the fields they
  render, client-side state/data-fetching, and what a route renders when data is empty/loading/error.
- **Install/run/config surface** (for `README.md`) — `package.json` `scripts` and `engines`,
  `.env.example` or config-loading code, Dockerfiles/compose files — only document a step that
  actually exists.
- **Existing tests**, if any — they often encode requirements the code doesn't state anywhere
  else; reconcile rather than ignore them.
- **Existing docs** (`README.md`, `CLAUDE.md`, other `*.md`) — use them for *intent*, but verify
  each claim against the code; a stale doc is a finding to flag, not a requirement to copy (see
  `struct-self-contained`).

## Incorrect Example

```markdown
<!-- Written from the project name "shop-api" alone, no code read -->
## FR-1 Users can register and log in with email/password.
## FR-2 Products support reviews and ratings.
```

No file was opened. If the project has no reviews feature at all, this FR is fiction.

## Correct Example

```markdown
<!-- After reading src/routes/auth.js and src/models/User.js -->
## FR-A1 `POST /auth/register` requires `email` (unique, validated format) and `password`
  (min 8 chars per `User.js` schema); on success returns `201` with `{ id, email }` (no
  password field); on duplicate email returns `409` with `{ error: "email already in use" }`
  (`src/routes/auth.js:34`).
```

Each clause is backed by a specific file/line, and only states what the code does.

## Key Rules

1. Open and read the relevant source before writing each FR or section — don't write from the
   project/file name or general framework conventions alone.
2. When the code and an existing doc disagree, note the discrepancy in that document's
   Overview/intro instead of silently picking one.
3. If a behavior is ambiguous or only partially implemented, say so explicitly (e.g. "partially
   implemented — see TODO at `file:line`") rather than rounding it up to a clean requirement or
   a confident usage instruction.
4. Cite file paths (and line numbers where useful) for non-obvious requirements so `PRD.md`
   stays checkable against the code later.
