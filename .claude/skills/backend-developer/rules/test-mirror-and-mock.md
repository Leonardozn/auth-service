---
title: Mirror src/ in tests/, and mock every external dependency completely
impact: HIGH
impactDescription: A test suite that doesn't mirror src/ becomes impossible to navigate as the project grows, and a partial/incomplete mock produces tests that pass for the wrong reason — both defeat the point of having tests at all.
tags: testing, unit-tests, mocking, structure, node-test
---

# Mirror `src/` in `tests/`, and mock every external dependency completely

## Why it matters

`easy-node` already generates the test tree this way for every model — copy the same
conventions for anything you add by hand:

1. **Path mirroring.** A test's path under `tests/unit/` is the source file's path
   under `src/`, verbatim. `src/services/data_model.js` →
   `tests/unit/services/data_model.test.js`. `src/services/commands/calculateTotal.js`
   → `tests/unit/services/commands/calculateTotal.test.js`. No flat `tests/` dump, no
   ad-hoc grouping by feature instead of by layer.
2. **Mock every external dependency, completely.** "External" means the repository
   (database), `file-manager`'s storage provider, or any outbound HTTP call — never the
   model's own contract/interface/validation, which are deterministic and meant to run
   for real. A mock that returns a partial shape (missing fields a real response would
   have) lets a test pass while hiding a bug the real shape would have caught.
3. **Exhaustive assertions in every test tier.** "Complete" means the same thing whether
   you're in `tests/unit/services/`, `tests/unit/controllers/`, or `tests/crud/`:
   assert the **entire** returned/emitted value, not the one field you care about right
   now. A test that only checks `result.id` or `response.statusCode` is not complete —
   it lets the rest of the shape silently regress.

The repository mock to reuse already exists: `tests/support/mock-repository-preload.js`
(generated once per app the first time a model is created). It intercepts
`require('../repositories')` and hands back an in-memory store — `require` it *before*
the module under test, exactly like `tests/unit/services/<model>.test.js` does.

## Incorrect Example

Flat file location, a mock that only returns enough to make the assertion pass, and an
e2e/crud test that only checks the status code.

```javascript
// ❌ tests/calculateTotal.test.js — doesn't mirror src/services/commands/calculateTotal.js

// ❌ partial mock — real repository.add() returns the full record (_id, createdAt, updatedAt, …)
const repository = { add: async () => ({ price: 10 }) }

// ❌ controller test — only checks the status, not the envelope or content
assert.equal(response.statusCode, 200)

// ❌ crud test — only checks that create returned 201, ignores the saved fields
assert.equal(createResponse.body.statusCode, 201)
```

## Correct Example

### `tests/unit/services/` — service / command tests

```javascript
// tests/unit/services/commands/calculateTotal.test.js
const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload') // required first
const DataModelService = require('../../../../src/services/data_model')

beforeEach(() => {
	MockRepository.reset() // clears in-memory data without breaking the service's cached reference
})

test('data_model service add() — stores the complete record', async () => {
	const service = DataModelService.getInstance()
	const complete = { text: 'sample', amount: 10, active: true } // every declared field, not a subset

	const result = await service.add({ body: complete })

	assert.deepEqual(result, complete) // exhaustive — the whole object, not just one key
})
```

### `tests/unit/controllers/` — controller tests

Assert the complete `{ success, message, statusCode, content }` envelope, including the
actual field values inside `content` — not just that the call succeeded.

```javascript
// tests/unit/controllers/health.test.js
const { test } = require('node:test')
const assert = require('node:assert/strict')
const HealthController = require('../../../../src/controllers/health')

test('health controller — returns the full success envelope', async () => {
	const req = {}
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	HealthController.getInstance().health(req, res)

	assert.equal(capturedStatus, 200)
	assert.deepEqual(capturedBody, {     // full envelope, not just statusCode
		success:    true,
		message:    'Success!',
		statusCode: 200,
		content:    null,
	})
})
```

### `tests/crud/` — CRUD round-trip tests

Assert the complete response payload for every operation — content fields, counts,
pagination shape — the same level of completeness as the service-layer tests.

```javascript
// tests/crud/product.test.js  (uses run-app.js to boot the real app with DB mocked)
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const runApp = require('../support/run-app')

let app

before(async () => { app = await runApp({ MOCK_SEED_RECORD: JSON.stringify({ name: 'Widget', price: 9.99, active: true }) }) })
after(async () => app.stop())

test('product CRUD — create', async () => {
	const res = await app.request('POST', '/product', { body: { name: 'Widget', price: 9.99, active: true } })

	assert.equal(res.statusCode, 201)
	assert.deepEqual(res.body, {          // full envelope — every field of content, not just id
		success:    true,
		message:    'Success!',
		statusCode: 201,
		content:    { name: 'Widget', price: 9.99, active: true, id: res.body.content.id },
	})
})

test('product CRUD — list with filter', async () => {
	const res = await app.request('GET', '/product?query[active]=true')

	assert.equal(res.statusCode, 200)
	assert.deepEqual(res.body, {
		success:    true,
		message:    'Success!',
		statusCode: 200,
		content: {
			count:   1,
			records: [{ name: 'Widget', price: 9.99, active: true, id: res.body.content.records[0].id }],
		},
	})
})
```

## Key Rules

1. `tests/unit/<path>` mirrors `src/<path>` exactly — same folder names, same nesting.
2. Mock the repository via `tests/support/mock-repository-preload.js`, required *before* the
   service/command under test — never write a second, ad-hoc mock for the same dependency.
3. A mock's returned/seeded data must include every field the real dependency would return,
   not just the ones the current test happens to check.
4. **Assert the whole returned value in every tier** — `assert.deepEqual` on the full result in
   service tests; the full `{ success, message, statusCode, content }` envelope (with actual
   `content` field values) in controller and e2e tests; the complete round-trip payload in crud
   tests. A narrow assertion (`result.id`, `response.statusCode`) is not a complete test.
5. **CRUD tests cover every standard operation** (create, read, update/PATCH, replace/PUT,
   delete, list — including at least one filter variant) with full field assertions, not just
   status codes. Each operation is its own `test()` block.
6. **Controller tests assert the full envelope** — `{ success, message, statusCode, content }`
   with actual values, not just that the HTTP status matched.
7. Never mock the contract, interface/validation, or anything else that's pure/deterministic
   in-process logic — only mock what would otherwise touch a database, the filesystem, or the
   network.
