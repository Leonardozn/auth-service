const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'confirmation_code' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"user": "64b0c0ffee1234567890abcd",
			"purpose": "sample text",
			"codeHash": "sample text",
			"medium": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 10
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"purpose": "sample text",
			"codeHash": "sample text",
			"medium": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 20
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"purpose": "sample text",
			"codeHash": "sample text",
			"medium": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 30
		}
	]

test('confirmation_code create — complete payload round-trips through the full envelope, minus codeHash', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/confirmation_code`, RECORDS[0])

		assert.equal(res.status, 200)
		// codeHash is deliberately excluded from the contract - it must never leave the API, not
		// even through the generic admin CRUD (see contracts/confirmation_code.js).
		const { codeHash: _codeHash, ...expectedWithoutCodeHash } = RECORDS[0]
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: expectedWithoutCodeHash
		})
	} finally {
		await app.stop()
	}
})

test('confirmation_code — codeHash never appears in a list response either', async () => {
	const app = await runApp()

	try {
		await app.request('POST', `${app.path}/confirmation_code`, RECORDS[0])

		const res = await app.request('GET', `${app.path}/confirmation_code`)

		assert.equal(res.status, 200)
		assert.ok(res.body.content.records.every(record => !('codeHash' in record)))
	} finally {
		await app.stop()
	}
})

test('confirmation_code list — count reflects every created record', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/confirmation_code`, record)

		const res = await app.request('GET', `${app.path}/confirmation_code`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('confirmation_code list — pagination slices the result set', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/confirmation_code`, record)

		const res = await app.request('GET', `${app.path}/confirmation_code?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('confirmation_code list — equality filter on attempts (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/confirmation_code`, record)

		const res = await app.request('GET', `${app.path}/confirmation_code?query[attempts]=${RECORDS[1].attempts}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].attempts, RECORDS[1].attempts)
	} finally {
		await app.stop()
	}
})

test('confirmation_code list — sort by attempts (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/confirmation_code`, record)

		const res = await app.request('GET', `${app.path}/confirmation_code?sort[attempts]=-1`)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.attempts)
		assert.deepEqual(values, [...RECORDS].map(r => r.attempts).sort().reverse())
	} finally {
		await app.stop()
	}
})

test('confirmation_code list — gt operator on attempts (FR-G8)', async () => {
	const app = await runApp()

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/confirmation_code`, record)

		const res = await app.request('GET', `${app.path}/confirmation_code?query[attempts][gt]=${RECORDS[0].attempts}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 2)
	} finally {
		await app.stop()
	}
})

