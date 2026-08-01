const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'login_record' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/login_record.test.js).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"email": "sample text",
		"result": "sample text",
		"method": "sample text",
		"ip": "sample text",
		"userAgent": "sample text"
	}

const SEED_ID = '64b0c0ffee1234567890abcf'

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'login_record',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

test('login_record routes — POST creates a record', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/login_record`, SAMPLE)

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('login_record routes — GET by id returns the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/login_record/${SEED_ID}`)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('login_record routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp()

	try {
		const res = await app.request('GET', `${app.path}/login_record/${SEED_ID}`)

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('login_record routes — GET list returns the envelope shape', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/login_record`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [SAMPLE])
	} finally {
		await app.stop()
	}
})

test('login_record routes — PATCH updates the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/login_record/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('login_record routes — PUT replaces the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/login_record/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('login_record routes — DELETE removes the seeded record', async () => {
	const app = await runApp(seededEnv())

	try {
		const del = await app.request('DELETE', `${app.path}/login_record/${SEED_ID}`)
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/login_record/${SEED_ID}`)
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})
