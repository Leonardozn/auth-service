---
title: Route content to the document that matches its audience
impact: HIGH
impactDescription: Mixing audiences inside one doc makes both worse — a README cluttered with Given/When/Then scenarios is unreadable for a new user, and a PRD padded with installation prose buries the requirements a tester needs.
tags: scope, audience, readme, prd
---

# Route content to the document that matches its audience

## Why it matters

`PRD.md` and `README.md` answer different questions for different readers:

| | `PRD.md` | `README.md` |
| - | -------- | ----------- |
| Audience | Tester / agent / TestSprite | Developer / end user |
| Question it answers | "What must this do, and how do I verify it?" | "What is this, and how do I install/run/use it?" |
| Content | FRs with stable ids, NFRs, success metrics, Given/When/Then scenarios, test tiers | Description, features, install/config/usage steps, API or component reference, project structure |
| Style | Verifiable assertions, file:line citations | Task-oriented prose and examples a newcomer can follow |

When analyzing a project, sort what you find into the right bucket as you go: a validation rule
or error-message contract is a PRD requirement; an install step or env var's purpose is a README
section. The same underlying fact (e.g. "the API returns `{ success, message, statusCode,
content }`") can legitimately appear in both, stated in the style each document needs — a
testable FR with an id in `PRD.md`, plain explanatory prose with an example in `README.md` — see
`struct-self-contained` for why neither should just point at the other for it.

## Incorrect Example

```markdown
<!-- In README.md -->
## API Behavior
- **FR-A2** `POST /auth/register` with a duplicate email returns 409 (`src/routes/auth.js:41`).

| # | Given | When | Then | FR |
| 4 | duplicate email | POST /auth/register | 409 | FR-A2 |
```

A Given/When/Then scenario table and FR ids belong in `PRD.md`; a README reader doesn't need
(or want) to parse a requirements-traceability table to learn how to use the API.

## Correct Example

```markdown
<!-- In README.md -->
## API Reference
`POST /auth/register` — registers a user. Returns `409` if the email is already taken.

<!-- In PRD.md -->
## 3.1 Auth
- **FR-A2** `POST /auth/register` with an already-registered `email` returns `409` and
  `{ error: "email already in use" }` (`src/routes/auth.js:41`).
```

## Key Rules

1. FR ids, NFRs, success metrics, and Given/When/Then tables belong only in `PRD.md`.
2. Install/config/usage steps, and narrative "how this works" explanations belong only in
   `README.md`.
3. Shared facts (response shapes, command syntax) may appear in both, each phrased for that
   document's audience and verified independently against the code.
