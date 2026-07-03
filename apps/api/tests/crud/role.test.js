const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'role' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"name": "item-1",
			"active": true
		},
		{
			"name": "item-2",
			"active": true
		},
		{
			"name": "item-3",
			"active": true
		}
	]

test('role create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/role`, RECORDS[0])

		assert.equal(res.status, 200)
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: RECORDS[0]
		})
	} finally {
		await app.stop()
	}
})

test('role list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record)

		const res = await app.request('GET', `${app.path}/role`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('role list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record)

		const res = await app.request('GET', `${app.path}/role?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('role list — equality filter on name (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record)

		const res = await app.request('GET', `${app.path}/role?query[name]=${RECORDS[1].name}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].name, RECORDS[1].name)
	} finally {
		await app.stop()
	}
})

test('role list — sort by name (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record)

		const res = await app.request('GET', `${app.path}/role?sort[name]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.name)
		assert.deepEqual(values, [...RECORDS].map(r => r.name).sort().reverse())
	} finally {
		await app.stop()
	}
})

