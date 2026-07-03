const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'password_reset_token' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/password_reset_token.test.js).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"token": "sample text",
		"expiresAt": "2024-01-01T00:00:00.000Z",
		"used": true
	}

const SEED_ID = '64b0c0ffee1234567890abcf'

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'password_reset_token',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

test('password_reset_token routes — POST creates a record', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/password_reset_token`, SAMPLE)

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET by id returns the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp()

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`)

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET list returns the envelope shape', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [SAMPLE])
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PATCH updates the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PUT replaces the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — DELETE removes the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const del = await app.request('DELETE', `${app.path}/password_reset_token/${SEED_ID}`)
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`)
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})
