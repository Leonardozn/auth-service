---
title: Do not install or create packages (unless told)
impact: CRITICAL
impactDescription: Never install external packages or create new packages unless explicitly told to. If a new package is authorized, it must mirror the structure of the existing packages.
tags: process, packages, dependencies, structure
---

# Do not install or create packages (unless told)

## Why it matters

- **Never install external packages** (npm) unless explicitly told to.
- **Never create new packages** in `packages/` unless explicitly told to.

First solve the requirement with the already available packages
(`resources/PACKAGE-LIST.md`) and with the services layer logic. Adding
dependencies or packages without authorization introduces unnecessary risk and
debt.

## Incorrect Example

Installing an external library for something a project package already covers.

```bash
# ❌ Not authorized; besides, data-validator already serves luxon for dates
npm install dayjs
```

```javascript
// ❌ Creating a new package without being told to
// packages/my-utils/index.js
module.exports = { /* ... */ }
```

## Correct Example

Reuse what exists; and, only if a new package is authorized, mirror the structure
of the current packages.

```javascript
// ✅ Use the existing package through its handler
const luxon = require('../handlers/dataValidator').getInstance().getLuxon()
```

If (and only if) creating a new package is requested, first analyze how the
packages in `packages/` are structured and replicate that pattern:

```
packages/<new-package>/
├── package.json        # name: "@backend/<new-package>", main: "index"
├── index.js            # re-exports the public API from ./src
└── src/
    └── <newPackage>.js   # singleton class with getInstance()
```

## Key Rules

1. By default: **no `npm install`** and **no new packages**.
2. Before considering a package, exhaust the existing packages and handlers.
3. If a new one is authorized, mirror `name`/`main`, the `index.js` that re-exports
   from `src/`, and the singleton pattern (`getInstance()`) of the current packages.
