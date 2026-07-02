const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'user' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/user.test.js).
const SAMPLE = {
		"name": "sample text",
		"email": "sample text",
		"password": "sample text",
		"role": "64b0c0ffee1234567890abcd"
	}

// The User contract never exposes password (security: even hashed, it must never leave the
// API) - this is what every response is expected to look like.
const EXPECTED = { name: SAMPLE.name, email: SAMPLE.email, role: SAMPLE.role }

const SEED_ID = '64b0c0ffee1234567890abcf'

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

test('user routes — POST creates a record', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/user`, SAMPLE)

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('user routes — GET by id returns the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/user/${SEED_ID}`)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp()

	try {
		const res = await app.request('GET', `${app.path}/user/${SEED_ID}`)

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('user routes — GET list returns the envelope shape', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/user`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [EXPECTED])
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH updates the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/user/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — PUT replaces the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/user/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — DELETE removes the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const del = await app.request('DELETE', `${app.path}/user/${SEED_ID}`)
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/user/${SEED_ID}`)
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})
