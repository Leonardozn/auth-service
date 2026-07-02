---
title: Use packages through their handler
impact: CRITICAL
impactDescription: Consuming every @backend/* package through its handler (a singleton in handlers/) centralizes configuration, allows swapping the underlying library, and makes testing easier.
tags: architecture, handlers, packages, abstraction
---

# Use packages through their handler

## Why it matters

Every available package is consumed **always through its handler** in
`apps/api/src/handlers/` (see `resources/PACKAGE-LIST.md`). Handlers are singletons
that wrap the package, expose its utilities, and centralize its configuration.
Importing the `@backend/*` package directly in a service breaks that
centralization and makes swapping the implementation and testing harder.

> Exception: `entity-queries` is consumed from the `repositories/` layer, which is
> its established access point (it has no handler of its own).

## Incorrect Example

Importing the package directly in the service.

```javascript
// services/data_model.js
const { DataValidator, luxon } = require('@backend/data-validator') // ❌ direct package import
const { BadRequestError } = require('@backend/handle-errors')        // ❌ direct package import
```

## Correct Example

Consume the package through its handler.

```javascript
// services/data_model.js
const DataValidatorHandler = require('../handlers/dataValidator')
const { BadRequestError } = require('../handlers/handleErrors')

const dataValidatorHandler = DataValidatorHandler.getInstance()
const luxon = dataValidatorHandler.getLuxon()   // ✅ luxon through the handler
const types = dataValidatorHandler.getTypes()
```

## Key Rules

1. One package = its handler. Look for the handler in `handlers/` before importing anything.
2. If a package you are going to use **has no handler**, create one following the
   singleton pattern of the existing handlers, and consume it from there.
3. Do not import `@backend/*` directly in services, controllers, or interfaces.
