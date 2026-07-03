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

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// PasswordResetToken is an internal recovery record - every raw CRUD operation on it is
// admin-only, unconditionally. Seeds a ready-to-use admin (role + user + session).
const ADMIN_ROLE_ID = '64b0c0ffee1234567890adcd'
const ADMIN_ID = '64b0c0ffee1234567890adce'
const ADMIN_TOKEN = 'admin-access-token'

function adminSeedEnv() {
	return {
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: ADMIN_ROLE_ID, record: { name: 'admin', active: true } },
			{ schema: 'user', id: ADMIN_ID, record: { name: 'Root', email: 'root@example.com', password: 'hash', role: ADMIN_ROLE_ID, active: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: ADMIN_ID, accessToken: ADMIN_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: 'admin-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	}
}

test('password_reset_token routes — POST creates a record, as an admin', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/password_reset_token`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — POST rejects a missing Authorization header', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/password_reset_token`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET by id returns the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET by id rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET list returns the envelope shape, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [SAMPLE])
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — GET list rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/password_reset_token`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PATCH updates the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('PATCH', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PATCH rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PUT replaces the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('PUT', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — PUT rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/password_reset_token/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — DELETE removes the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const del = await app.request('DELETE', `${app.path}/password_reset_token/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/password_reset_token/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})

test('password_reset_token routes — DELETE rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('DELETE', `${app.path}/password_reset_token/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})
