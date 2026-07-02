---
title: Follow the canonical PRD section skeleton
impact: HIGH
impactDescription: A PRD with ad-hoc sections is hard to consume consistently across projects — tools and humans that read "the PRD" expect overview, scope, requirements, metrics and scenarios in a predictable place.
tags: structure, sections, prd, template
---

# Follow the canonical PRD section skeleton

## Why it matters

Every PRD produced by this skill should use the same section skeleton, so it reads the same way
regardless of which project it documents. Use `resources/PRD-TEMPLATE.md` as the starting point
and fill in each section from the codebase analysis (`proc-analyze-before-writing`); don't
invent a different structure per project.

The skeleton, in order:

1. **Overview & purpose** — what the project is, in one or two paragraphs, plus any
   code/README discrepancy found during analysis.
2. **Scope** — what this contract tests (in scope) and what it explicitly does not (out of
   scope, e.g. third-party services, manual-only UI behavior).
3. **Functional requirements (FR)** — grouped by category (e.g. routing/dispatch, data
   validation, auth, UI rendering), each with a stable id (`proc-traceability`).
4. **Non-functional requirements (NFR)** — performance, security, cross-platform, error-handling
   conventions that aren't a single feature but apply broadly.
5. **Success metrics** — a short numbered list of "the product is working when…" statements,
   referencing FR ids.
6. **Test strategy / tiers** — the layers of verification (e.g. unit, integration, E2E,
   build/boot smoke, manual/browser) and which is hermetic vs. needs network/DB/a browser.
7. **Test scenarios (Given/When/Then)** — a table, each row citing the FR(s) it exercises.
8. **How to run the tests** — the actual commands, if the project already has a test setup; if
   it doesn't yet, state that explicitly instead of inventing scripts that don't exist.

## Incorrect Example

```markdown
# My Project

It's an API. Here's how it works: ...

(no scope, no FR ids, no scenarios table, no success metrics)
```

## Correct Example

```markdown
# 📋 PRD — `shop-api` (Testing Contract)

## 1. Overview & purpose
## 2. Scope
## 3. Functional requirements (FR)
### 3.1 Routing & validation
### 3.2 Data model
## 4. Non-functional requirements
## 5. Success metrics
## 6. Test strategy
## 7. Test scenarios (Given/When/Then)
## 8. How to run the tests
```

## Key Rules

1. Use `resources/PRD-TEMPLATE.md` as the skeleton; keep section numbers/order even if a
   section ends up short (e.g. "no NFRs identified beyond X").
2. Split §3 into subcategories that match the project's own domain (don't force unrelated
   projects into the same subcategories).
3. Never ship a PRD missing §5 (success metrics) or §7 (scenarios) — those are what make the
   document testable rather than descriptive.
