---
title: Follow the canonical README section skeleton
impact: HIGH
impactDescription: A README with ad-hoc sections forces every new reader to hunt for installation/usage steps. A predictable skeleton lets a developer or end user find what they need without reading the whole file.
tags: structure, sections, readme, template
---

# Follow the canonical README section skeleton

## Why it matters

`README.md` is **user-facing**: written for a developer or end user who wants to understand,
install, run, and use the project — not for a tester deriving assertions (that's `PRD.md`, see
`scope-doc-audience`). Use `resources/README-TEMPLATE.md` as the starting skeleton and fill in
each section from the codebase analysis (`proc-analyze-before-writing`); don't invent a
different structure per project, and don't pad sections that don't apply.

The skeleton, in order:

1. **Title & description** — what the project is and does, one or two sentences.
2. **Features** — a short bullet list of what it actually does (derived from the code, not
   aspirational).
3. **Prerequisites** — runtime/tooling versions actually required (check `engines` in
   `package.json`, Dockerfiles, etc.).
4. **Installation** — the real install steps (`npm install`, env setup, DB/service
   dependencies) — only steps that exist, not generic boilerplate.
5. **Configuration** — environment variables / config files the project actually reads, with
   their purpose (check `.env.example`, config-loading code).
6. **Usage** — how to run it: scripts (`npm run ...`), CLI commands, or how to start the dev
   server, with real examples.
7. **API / route / component reference** (whichever applies) — for a backend: endpoints,
   methods, request/response shape; for a frontend: routes/pages and the components that back
   them. Keep this in sync with what `PRD.md` independently verifies (`struct-self-contained`).
8. **Project structure** — a short directory tree of the meaningful top-level folders, with a
   one-line purpose each.
9. **Testing** (if a test setup exists) — how to run it; if none exists, omit the section rather
   than inventing commands.
10. *(Optional)* **Contributing** / **License** — only if the project already has a contribution
    workflow or license file to point to; don't invent one.

## Incorrect Example

```markdown
# my-project

A project.

## Contributing
We love PRs!
## License
MIT
```

No description of what it does, no install/usage steps, and a license section pointing at
nothing if there's no `LICENSE` file in the repo.

## Correct Example

```markdown
# shop-api

A REST API for managing a product catalog with CRUD operations and JWT auth.

## Features
- Product CRUD with filtering/pagination/sorting
- JWT-based authentication

## Prerequisites
- Node.js >= 18 (see `package.json` `engines`)

## Installation
\`\`\`bash
npm install
cp .env.example .env
\`\`\`

## Usage
\`\`\`bash
npm run dev   # starts the API on PORT (default 3000)
\`\`\`
```

## Key Rules

1. Use `resources/README-TEMPLATE.md` as the skeleton; omit a section entirely rather than
   filling it with invented/generic content when it doesn't apply to this project.
2. Every claim (a script, an env var, an endpoint) must be backed by something you found in the
   code — see `proc-analyze-before-writing`.
3. Don't add a Contributing/License section unless the repo already has the corresponding
   workflow/file.
