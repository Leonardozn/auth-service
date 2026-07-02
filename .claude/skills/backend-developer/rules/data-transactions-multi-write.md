---
title: Use a transaction whenever a process writes to several collections
impact: HIGH
impactDescription: A process that writes to more than one collection must run inside a transaction. Without a shared session, a failure after the first write leaves the database in an inconsistent state (orphaned or partially-applied records) that cannot be rolled back.
tags: data, transactions, session, atomicity, multi-collection, write, repository
---

# Use a transaction whenever a process writes to several collections

## Why it matters

Whenever a process performs **more than one write** (`add` / `update` / `replace` /
`remove`) across **two or more collections**, all of those writes must run inside a
**single transaction**. If they don't and a later write fails, the earlier writes are
already committed: you get half-applied processes, orphaned sub-documents, and data
that no longer satisfies the model invariants — with no way to undo it.

The repository write methods forward `config.options` straight to Mongoose, so a
transaction is enabled by sharing the same **session** across every write:

```javascript
repository.add('schema',    { data, options: { session } })
repository.update('schema', { id, data, options: { session } })
repository.remove('schema', { id, options: { session } })
```

The session comes from the Mongoose connection, which is exposed through the
`DbConnectionHandler` (see `arch-use-handlers`) — never import `mongoose` directly.

> A **single-collection** process (one write, or several writes to the *same*
> collection that Mongoose already applies atomically) does **not** require a manual
> transaction.

## Incorrect Example

Two writes to different collections with no shared session: if the second `add`
throws, the first record is already persisted and orphaned.

```javascript
// services/checkout.js
async execute(config = {}) {
	// ❌ no transaction: writes are independent and cannot be rolled back together
	const data_model = await this.repository.add('data_model', { data: config.data })
	// if this fails, data_model above is left committed and orphaned
	await this.repository.add('sub_data_model', {
		data: { ...config.sub, data_model: data_model._id }
	})
	return data_model
}
```

## Correct Example

Open a session from the connection handler and share it (via `options.session`)
across every write inside `withTransaction`, which commits on success and aborts on
any thrown error.

```javascript
// services/checkout.js
const Repository = require('../repositories')
const DbConnectionHandler = require('../handlers/dbConnections')

class CheckoutService {
	constructor() {
		this.repository = Repository.getInstance()
		this.dbConnectionHandler = DbConnectionHandler.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new CheckoutService()
		return this.instance
	}

	async execute(config = {}) {
		// the Mongoose connection is reached through its handler, never imported directly
		const { testingMongodb } = this.dbConnectionHandler.getConnection()
		const session = await testingMongodb.startSession()

		let result
		try {
			// commits if the callback resolves, aborts (rolls back) if it throws
			await session.withTransaction(async () => {
				const data_model = await this.repository.add('data_model', {
					data: config.data,
					options: { session } // ✅ same session
				})
				await this.repository.add('sub_data_model', {
					data: { ...config.sub, data_model: data_model._id },
					options: { session } // ✅ same session
				})
				result = data_model
			})
		} finally {
			session.endSession() // always release the session
		}

		return result
	}
}
module.exports = CheckoutService
```

When the process is split into steps (see `arch-command-steps`), pass the `session`
down to each command so every write joins the same transaction:

```javascript
// services/commands/createSubModels.js
async execute({ repository, dataModelId, subModelsData = [], session }) {
	for (const subData of subModelsData) {
		await repository.add('sub_data_model', {
			data: { ...subData, data_model: dataModelId },
			options: { session } // ✅ the step receives and forwards the session
		})
	}
}
```

## Key Rules

1. **More than one write across two or more collections → wrap them in a transaction.**
2. Get the session from the **connection handler** (`DbConnectionHandler.getConnection()`),
   then `connection.startSession()`; never `require('mongoose')` directly (`arch-use-handlers`).
3. Prefer `session.withTransaction(cb)` — it commits on success and aborts on any
   thrown error — and always `session.endSession()` in a `finally`.
4. **Every** write in the process must receive `options: { session }`; a write that
   omits it does not participate in the transaction and will not roll back.
5. When using steps/commands, pass the `session` as a parameter so each step forwards it.
6. A single-collection process does not need a manual transaction.
