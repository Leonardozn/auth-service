const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'password_reset_token' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"user": "64b0c0ffee1234567890abcd",
			"token": "item-1",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"token": "item-2",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"token": "item-3",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true
		}
	]

test('password_reset_token create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/password_reset_token`, RECORDS[0])

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

test('password_reset_token list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record)

		const res = await app.request('GET', `${app.path}/password_reset_token`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record)

		const res = await app.request('GET', `${app.path}/password_reset_token?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — equality filter on token (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record)

		const res = await app.request('GET', `${app.path}/password_reset_token?query[token]=${RECORDS[1].token}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].token, RECORDS[1].token)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — sort by token (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record)

		const res = await app.request('GET', `${app.path}/password_reset_token?sort[token]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.token)
		assert.deepEqual(values, [...RECORDS].map(r => r.token).sort().reverse())
	} finally {
		await app.stop()
	}
})

