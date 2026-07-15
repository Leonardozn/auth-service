const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'change_password_verification_code' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/change_password_verification_code.test.js).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"code": "sample text",
		"newPasswordHash": "sample text",
		"expiresAt": "2024-01-01T00:00:00.000Z",
		"used": true,
		"attempts": 1
	}

const SEED_ID = '64b0c0ffee1234567890abcf'

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'change_password_verification_code',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// ChangePasswordVerificationCode is an internal record (holds the pending code and the pre-hashed
// new password) - every raw CRUD operation on it is admin-only, unconditionally. Seeds a
// ready-to-use admin (role + user + session).
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

test('change_password_verification_code routes — POST creates a record, as an admin', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/change_password_verification_code`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — POST rejects a missing Authorization header', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/change_password_verification_code`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — GET by id returns the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/change_password_verification_code/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — GET by id rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/change_password_verification_code/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('GET', `${app.path}/change_password_verification_code/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — GET list returns the envelope shape, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/change_password_verification_code`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.deepEqual(res.body.content.records, [SAMPLE])
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — GET list rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/change_password_verification_code`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — PATCH updates the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('PATCH', `${app.path}/change_password_verification_code/${SEED_ID}`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — PATCH rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/change_password_verification_code/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — PUT replaces the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('PUT', `${app.path}/change_password_verification_code/${SEED_ID}`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, SAMPLE)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — PUT rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/change_password_verification_code/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — DELETE removes the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const del = await app.request('DELETE', `${app.path}/change_password_verification_code/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/change_password_verification_code/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code routes — DELETE rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('DELETE', `${app.path}/change_password_verification_code/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})
