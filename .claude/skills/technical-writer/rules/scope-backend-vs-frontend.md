---
title: Adapt FR/test-tier categories and README content to the project kind
impact: HIGH
impactDescription: Backend and frontend projects fail in different ways, need different verification tiers, and are installed/used differently; forcing one generic template onto both produces a PRD with requirements that don't match what needs checking and a README with steps that don't apply.
tags: scope, backend, frontend, tiers
---

# Adapt FR/test-tier categories and README content to the project kind

## Why it matters

This skill always lives inside a single microservice (see `proc-doc-naming-location`), so the
project it analyzes is always either **backend** or **frontend** — never both at once. Determine
which one it is and shape both documents accordingly instead of reusing one fixed checklist for
every kind: in `PRD.md`, §3 (functional requirements) and §6 (test strategy); in `README.md`,
the Usage and API/route/component reference sections.

**Backend** — `PRD.md` FR categories: routing/dispatch, request validation, data model/schema
constraints, auth/authorization, error handling & response shape, business logic. Test tiers:
unit (pure logic), integration (DB/services, possibly mocked), E2E (HTTP surface against a
running instance), boot/health smoke. `README.md`: document how to start the server/API, the env
vars it reads, and an **API reference** (endpoints/methods/shapes) — no component/UI section.

**Frontend** — `PRD.md` FR categories: routing/navigation, component rendering per state
(loading/empty/error/populated), forms (fields, validation, submit payload), data
fetching/state management. Test tiers: unit (components/hooks in isolation), generation/build
smoke (compiles, bundles), E2E in a real browser (navigation, forms, tables) — often the tier
that needs the most manual/TestSprite coverage since it needs a real DOM. `README.md`: document
how to run the dev server/build, and a **routes/components reference** — no backend API section.

If this microservice calls another microservice or a third-party service, document that call as
part of its own business logic/FRs (the request it sends and the response it expects) — it does
not need its own "integration" category, since the contract on the other end belongs to that
other microservice's own `PRD.md`, not this one's.

## Incorrect Example

```markdown
<!-- Frontend microservice, but the PRD still has -->
## FR-S2 Database schema enforces unique port/host per app.
```

Copied from a backend checklist into a project that has no backend at all.

## Correct Example

```markdown
<!-- Frontend microservice -->
## FR-F1 The `/products` route renders a `DataTable` with one row per product; an empty
  API response renders an empty-state message instead of an empty table (`src/pages/Products.jsx:18`).
## FR-F2 The product creation form requires `name` and `price`; submitting without `price`
  shows an inline error and does not call the API (`src/components/ProductForm.jsx:42`).
```

## Key Rules

1. Identify the project kind first (check for a server entry point/framework vs. a
   client-side framework/router) — state which kind it is in §1 Overview.
2. Only include FR categories and test tiers that apply; don't pad the document with an empty
   "Backend" section for a frontend microservice, or vice versa.
3. Document any call this microservice makes to another service inline, as part of its own
   business logic/FRs — never as a separate cross-service "integration" section, since this skill
   never sees more than one microservice at a time.
