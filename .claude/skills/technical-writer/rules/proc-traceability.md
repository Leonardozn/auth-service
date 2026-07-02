---
title: Every requirement has an ID and a Given/When/Then scenario (PRD.md only)
impact: HIGH
impactDescription: An FR with no scenario is unverifiable prose; a scenario with no FR id is a test with no contract behind it. IDs are what let tests, success metrics and requirements stay linked as the code evolves.
tags: process, traceability, requirements, scenarios, prd
---

# Every requirement has an ID and a Given/When/Then scenario (`PRD.md` only)

## Why it matters

This rule applies to `PRD.md` — `README.md` has no FR ids or scenario table (see
`scope-doc-audience`); a usage doc shouldn't read like a requirements-traceability matrix.

`PRD.md` exists to be **derived from** when writing tests, not paraphrased loosely. That only
works if every functional requirement (FR) has a stable, referenceable ID, and every scenario
in the Given/When/Then table cites the FR(s) it exercises. Success metrics should likewise
reference FR ids rather than restate them in different words.

ID scheme: short category prefix + number, e.g. `FR-A1` (auth), `FR-D2` (dispatch), `FR-UI-3`
(frontend) — pick prefixes that match the project's own domain language, and keep them stable
once written (a later rename breaks every scenario/test that cites the old id).

## Incorrect Example

```markdown
## Functional Requirements
- Registration validates the email format and rejects duplicates.

## Scenarios
| Given | When | Then |
| signup form | submit duplicate email | shows an error |
```

No id anywhere — a test can't say *which* requirement it proves, and the scenario can't be
traced back when the requirement's wording changes later.

## Correct Example

```markdown
## Functional Requirements
- **FR-A2** `POST /auth/register` with an already-registered `email` returns `409` and
  `{ error: "email already in use" }`, without creating a row (`src/routes/auth.js:41`).

## Scenarios
| # | Given | When | Then | FR |
| - | ----- | ---- | ---- | -- |
| 4 | a user already registered with `a@b.com` | `POST /auth/register` with the same email | `409`, `{ error: "email already in use" }`, no new row | FR-A2 |
```

## Key Rules

1. Give every FR a stable id; never renumber existing ids once a scenario or test cites them
   — add new ones instead.
2. Every scenario row cites at least one FR id; every FR has at least one scenario that
   exercises it (an FR with zero scenarios is incomplete).
3. Success metrics reference FR ids (e.g. "100% of FR-D* combinations dispatch correctly")
   instead of duplicating the requirement text.
