const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'user' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"name": "item-1",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd"
		},
		{
			"name": "item-2",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd"
		},
		{
			"name": "item-3",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd"
		}
	]

test('user create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/user`, RECORDS[0])

		assert.equal(res.status, 200)
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			// The User contract never exposes password (security), even though it was submitted.
			content: { name: RECORDS[0].name, email: RECORDS[0].email, role: RECORDS[0].role }
		})
	} finally {
		await app.stop()
	}
})

test('user list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record)

		const res = await app.request('GET', `${app.path}/user`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('user list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record)

		const res = await app.request('GET', `${app.path}/user?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('user list — equality filter on name (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record)

		const res = await app.request('GET', `${app.path}/user?query[name]=${RECORDS[1].name}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].name, RECORDS[1].name)
	} finally {
		await app.stop()
	}
})

test('user list — sort by name (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record)

		const res = await app.request('GET', `${app.path}/user?sort[name]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.name)
		assert.deepEqual(values, [...RECORDS].map(r => r.name).sort().reverse())
	} finally {
		await app.stop()
	}
})

