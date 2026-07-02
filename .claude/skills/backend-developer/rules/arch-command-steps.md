---
title: Processes as a sequence of steps (commands)
impact: CRITICAL
impactDescription: Structuring every process as a sequence of steps, where each step is a single-method class in services/commands, makes the flow explicit, testable, and reusable.
tags: architecture, services, commands, steps, process, reuse
---

# Processes as a sequence of steps (commands)

## Why it matters

Every process implemented in a service must be structured as a **sequence of
steps**. Each step:

1. Is a **class with a single method** (the step itself).
2. Lives in the `services/commands/` directory.
3. Is **invoked inside the main process method** of the service.

This way the main method reads like the recipe of the process (step 1, step 2, …),
each step is isolated and reusable, and the logic is not crammed into a single
giant method.

**Every step invocation in the main process method must carry a brief comment**
describing what that step does in plain business language. The main method is the
readable summary of the process, and the comments are what make it readable at a
glance — without them the reader has to open each command to know what the sequence
actually does. Keep each comment short (one line, the intent — not a restatement of
the code).

## Incorrect Example

The whole process in a single monolithic method, with no steps or commands.

```javascript
// services/checkout.js
async execute(config = {}) {
	// ❌ Everything mixed in one method; nothing reusable or isolated
	const data_model = await this.repository.add('data_model', { data: config.data })
	let total = 0
	for (const item of config.items) total += item.price
	await this.repository.update('data_model', { id: data_model._id, data: { amount: total } })
	// ...more and more logic
	return data_model
}
```

## Correct Example

One command per step, each a single-method class, composed in the main process
method.

```javascript
// services/commands/createDataModel.js
class CreateDataModel {
	static getInstance() {
		if (!this.instance) this.instance = new CreateDataModel()
		return this.instance
	}

	// single method = the step
	async execute({ repository, data, options = {} }) {
		return await repository.add('data_model', { data, options })
	}
}
module.exports = CreateDataModel
```

```javascript
// services/commands/calculateTotal.js
class CalculateTotal {
	static getInstance() {
		if (!this.instance) this.instance = new CalculateTotal()
		return this.instance
	}

	async execute({ items = [] }) {
		return items.reduce((total, item) => total + item.price, 0)
	}
}
module.exports = CalculateTotal
```

```javascript
// services/checkout.js
const Repository = require('../repositories')
const CreateDataModel = require('./commands/createDataModel')
const CalculateTotal = require('./commands/calculateTotal')

class CheckoutService {
	constructor() {
		this.repository = Repository.getInstance()
		this.createDataModel = CreateDataModel.getInstance()
		this.calculateTotal = CalculateTotal.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new CheckoutService()
		return this.instance
	}

	// The main process reads as the sequence of steps
	async execute(config = {}) {
		// Step 1: create the base record
		const data_model = await this.createDataModel.execute({ repository: this.repository, data: config.data })
		// Step 2: compute the total from the submitted items
		const total = await this.calculateTotal.execute({ items: config.items })
		// Step 3: persist the computed total on the record
		const updated = await this.repository.update('data_model', { id: data_model._id, data: { amount: total } })
		return updated
	}
}
module.exports = CheckoutService
```

## Key Rules

1. **One step = one class = one method.** Do not group several steps in one class.
2. Commands **always** live in `services/commands/`.
3. The **main process** method only orchestrates: it invokes the steps in order.
4. Design each command to be **reusable** (see `proc-reuse-commands`): take its
   dependencies as parameters and do not assume the context of a single process.
5. **Every step in the main process method carries a brief, one-line comment** in plain
   business language describing what the step does.
