---
title: Reuse and design reusable commands
impact: CRITICAL
impactDescription: Before creating a command you must check whether a reusable one already exists that can be used without modifying it; and every new command must be designed with future reuse in mind.
tags: process, commands, reuse, dry
---

# Reuse and design reusable commands

## Why it matters

Commands (`services/commands/`) are the building blocks that processes are
composed of. Before writing a new one:

1. **First check whether a command you can reuse without modifying it already
   exists.** If so, use it.
2. If you must create one, **design it to be reusable** by other processes.

This avoids duplicating logic and keeps the commands directory as a catalog of
composable steps.

## Incorrect Example

Creating a command almost identical to an existing one, coupled to a specific
process.

```javascript
// ❌ commands/calculateTotal.js already exists, but another one coupled to checkout is created
// services/commands/calculateCheckoutTotalForData.js
class CalculateCheckoutTotalForData {
	async execute() {
		// assumes this.checkoutItems from the Checkout service → not reusable
		return this.checkoutItems.reduce((t, i) => t + i.price, 0)
	}
}
```

## Correct Example

Reuse the existing command; and, when creating one, take dependencies as
parameters so any process can use it.

```javascript
// ✅ Reuse what already exists, without modifying it
const CalculateTotal = require('./commands/calculateTotal')
const total = await CalculateTotal.getInstance().execute({ items: config.items })
```

```javascript
// ✅ New command, generic and reusable: nothing coupled to a specific process
// services/commands/calculateTotal.js
class CalculateTotal {
	static getInstance() {
		if (!this.instance) this.instance = new CalculateTotal()
		return this.instance
	}

	async execute({ items = [], priceField = 'price' }) {
		return items.reduce((total, item) => total + (item[priceField] ?? 0), 0)
	}
}
module.exports = CalculateTotal
```

## Key Rules

1. **Search before creating:** check `services/commands/` for an applicable command.
2. **Do not modify** an existing command to force reuse; if it does not fit as-is,
   create a new, generic one.
3. **Parameterize** dependencies (repository, data, options) instead of assuming
   the state of a specific service.
