const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'login_record' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"user": "64b0c0ffee1234567890abcd",
			"email": "item-1",
			"result": "sample text",
			"method": "sample text",
			"ip": "sample text",
			"userAgent": "sample text"
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"email": "item-2",
			"result": "sample text",
			"method": "sample text",
			"ip": "sample text",
			"userAgent": "sample text"
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"email": "item-3",
			"result": "sample text",
			"method": "sample text",
			"ip": "sample text",
			"userAgent": "sample text"
		}
	]

test('login_record create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/login_record`, RECORDS[0])

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

test('login_record list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/login_record`, record)

		const res = await app.request('GET', `${app.path}/login_record`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('login_record list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/login_record`, record)

		const res = await app.request('GET', `${app.path}/login_record?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('login_record list — equality filter on email (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/login_record`, record)

		const res = await app.request('GET', `${app.path}/login_record?query[email]=${RECORDS[1].email}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].email, RECORDS[1].email)
	} finally {
		await app.stop()
	}
})

test('login_record list — sort by email (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/login_record`, record)

		const res = await app.request('GET', `${app.path}/login_record?sort[email]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.email)
		assert.deepEqual(values, [...RECORDS].map(r => r.email).sort().reverse())
	} finally {
		await app.stop()
	}
})

