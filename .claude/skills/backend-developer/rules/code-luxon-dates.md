---
title: Handle dates with luxon (zone=utc)
impact: MEDIUM-HIGH
impactDescription: All dates are handled with luxon, served by the data-validator package, passing at least the zone=utc option to avoid working with local time zones.
tags: code, dates, luxon, data-validator, utc
---

# Handle dates with luxon (zone=utc)

## Why it matters

When handling dates you must use **luxon**, which the `data-validator` package
provides. Always pass at least the **`zone=utc`** option (or `{ zone: 'UTC' }`) to
avoid working with the local time zone: this keeps dates deterministic and
consistent across the whole system (in fact, `data-validator` itself normalizes
dates with `{ zone: 'UTC' }`).

Also, luxon must be obtained **through the handler** of `data-validator`
(`getLuxon()`), not by importing `luxon` directly (see `arch-use-handlers`).

## Incorrect Example

```javascript
// ❌ Direct luxon import and no UTC zone (uses the server's local zone)
const { DateTime } = require('luxon')
const now = DateTime.now()
const parsed = DateTime.fromISO('2024-06-16T10:00:00')

// ❌ Even worse: native Date
const d = new Date('2024-06-16')
```

## Correct Example

```javascript
// services/data_model.js
const DataValidatorHandler = require('../handlers/dataValidator')

const { DateTime } = DataValidatorHandler.getInstance().getLuxon() // luxon through the handler

// At least zone=utc on every construction
const now = DateTime.now().setZone('utc')
const fromIso = DateTime.fromISO('2024-06-16T10:00:00', { zone: 'utc' })
const fromJs = DateTime.fromJSDate(someDate, { zone: 'utc' })
```

## Key Rules

1. Use **luxon from `data-validator`**, obtained via the handler's `getLuxon()`.
2. **Always** pass at least `{ zone: 'utc' }` (or `.setZone('utc')`).
3. Do not use native `Date` or import `luxon` directly.
