const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'session' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"user": "64b0c0ffee1234567890abcd",
			"accessToken": "item-1",
			"accessTokenExpiresAt": "2024-01-01T00:00:00.000Z",
			"refreshToken": "sample text",
			"refreshTokenExpiresAt": "2024-01-01T00:00:00.000Z"
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"accessToken": "item-2",
			"accessTokenExpiresAt": "2024-01-01T00:00:00.000Z",
			"refreshToken": "sample text",
			"refreshTokenExpiresAt": "2024-01-01T00:00:00.000Z"
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"accessToken": "item-3",
			"accessTokenExpiresAt": "2024-01-01T00:00:00.000Z",
			"refreshToken": "sample text",
			"refreshTokenExpiresAt": "2024-01-01T00:00:00.000Z"
		}
	]

test('session create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/session`, RECORDS[0])

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

test('session list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record)

		const res = await app.request('GET', `${app.path}/session`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('session list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record)

		const res = await app.request('GET', `${app.path}/session?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('session list — equality filter on accessToken (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record)

		const res = await app.request('GET', `${app.path}/session?query[accessToken]=${RECORDS[1].accessToken}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].accessToken, RECORDS[1].accessToken)
	} finally {
		await app.stop()
	}
})

test('session list — sort by accessToken (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record)

		const res = await app.request('GET', `${app.path}/session?sort[accessToken]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.accessToken)
		assert.deepEqual(values, [...RECORDS].map(r => r.accessToken).sort().reverse())
	} finally {
		await app.stop()
	}
})

