---
title: Each generated doc is self-contained for its own audience
impact: HIGH
impactDescription: PRD.md and README.md are read by different audiences, often separately — PRD.md alone by a tester/agent (e.g. TestSprite), README.md alone by a new developer or end user. A doc that defers its own essential content to the other (or to CLAUDE.md) is silently incomplete the moment it's read alone.
tags: structure, self-contained, readme, prd, claude-md, traceability
---

# Each generated doc is self-contained for its own audience

## Why it matters

`PRD.md` (testing contract, for testers/agents) and `README.md` (usage docs, for developers/end
users) serve **different audiences** and are frequently consumed **alone**, without the other
file — or `CLAUDE.md` — present. Anything a requirement, scenario, or usage instruction needs
must be written **inline** in the document that needs it, not "see README.md for the exact
format" (from `PRD.md`) or "see PRD.md for the full contract" (from `README.md`).

This does not forbid either doc from **mentioning** the other for genuinely supplementary
material the reader doesn't strictly need (e.g. README.md's intro can say "see PRD.md for the
full testing contract" as a pointer for the curious). The test is: *if the other file were
deleted right now, would this document still be complete for its own purpose?* If not, inline
whatever is missing instead of pointing elsewhere.

Some factual content legitimately appears in both (e.g. the API request/response shape) — that
overlap is fine and expected; what's not fine is one document depending on the other to *state*
that content for the first time. When the same fact appears in both, verify it against the
actual code in each place rather than copying one into the other uncritically
(`proc-analyze-before-writing`) — a stale copy in one doc is exactly the kind of bug this
produces.

## Incorrect Example

```markdown
<!-- In PRD.md -->
## 9. Testing with TestSprite
- validating the filtering/pagination/sorting contract from the README

<!-- In README.md -->
## API Reference
- See PRD.md §3.3 for the exact list of supported filter operators.
```

Neither document is testable/usable on its own — each one is missing content it actually needs.

## Correct Example

```markdown
<!-- In PRD.md -->
## 3.3 Generation
- **FR-G8** Generated `list` endpoints accept bracket-notation query params... Supported
  operators: `eq`, `ne`, `like`, ... (verified against `packages/entity-queries/operators-template.js`).

<!-- In README.md -->
### Filtering, Pagination, and Sorting
Each filter is sent as `query[<field>][<operator>]=<value>`. Supported operators: `eq`, `ne`,
`like`, ...
```

Both documents state the contract fully, independently — verified against the same source code,
not copied from one doc into the other.

## Key Rules

1. Never write "see README.md"/"see PRD.md"/"see CLAUDE.md" for content the reader actually
   needs to use or test the project — inline it in the document that needs it.
2. Pointers to the other doc are fine only for genuinely optional, supplementary reading.
3. When the same fact must appear in both docs, verify it against the code independently in
   each place rather than copy-pasting between them.
4. Ask, for each doc: "would this still work if every other generated doc were deleted?" If no,
   fix it before shipping.
