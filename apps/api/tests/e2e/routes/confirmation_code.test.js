const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'confirmation_code' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/confirmation_code.test.js).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"purpose": "sample text",
		"codeHash": "sample text",
		"medium": "sample text",
		"expiresAt": "2024-01-01T00:00:00.000Z",
		"used": true,
		"attempts": 1
	}

const SEED_ID = '64b0c0ffee1234567890abcf'

// codeHash is deliberately excluded from the contract - it must never leave the API, not even
// through the generic admin CRUD (see contracts/confirmation_code.js).
const { codeHash: _codeHash, ...EXPECTED } = SAMPLE

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'confirmation_code',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

test('confirmation_code routes — POST creates a record', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/confirmation_code`, SAMPLE)

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — GET by id returns the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/confirmation_code/${SEED_ID}`)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp()

	try {
		const res = await app.request('GET', `${app.path}/confirmation_code/${SEED_ID}`)

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — GET list returns the envelope shape', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/confirmation_code`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [EXPECTED])
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — PATCH updates the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/confirmation_code/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — PUT replaces the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/confirmation_code/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('confirmation_code routes — DELETE removes the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const del = await app.request('DELETE', `${app.path}/confirmation_code/${SEED_ID}`)
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/confirmation_code/${SEED_ID}`)
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})
