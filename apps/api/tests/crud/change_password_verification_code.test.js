const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'change_password_verification_code' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"user": "64b0c0ffee1234567890abcd",
			"code": "sample text",
			"newPasswordHash": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 10
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"code": "sample text",
			"newPasswordHash": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 20
		},
		{
			"user": "64b0c0ffee1234567890abcd",
			"code": "sample text",
			"newPasswordHash": "sample text",
			"expiresAt": "2024-01-01T00:00:00.000Z",
			"used": true,
			"attempts": 30
		}
	]

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// ChangePasswordVerificationCode is an internal record (holds the pending code and the pre-hashed
// new password) - every raw CRUD operation on it is admin-only. Seeds a ready-to-use admin
// (role + user + session) so RECORDS can be created through the real endpoint.
const ADMIN_ROLE_ID = '64b0c0ffee1234567890adcd'
const ADMIN_ID = '64b0c0ffee1234567890adce'
const ADMIN_TOKEN = 'admin-access-token'
const ADMIN_HEADERS = { Authorization: `Bearer ${ADMIN_TOKEN}` }

function adminSeedEnv() {
	return {
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: ADMIN_ROLE_ID, record: { name: 'admin', active: true } },
			{ schema: 'user', id: ADMIN_ID, record: { name: 'Root', email: 'root@example.com', password: 'hash', role: ADMIN_ROLE_ID, active: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: ADMIN_ID, accessToken: ADMIN_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: 'admin-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	}
}

test('change_password_verification_code create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/change_password_verification_code`, RECORDS[0], ADMIN_HEADERS)

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

test('change_password_verification_code list — count reflects every created record', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/change_password_verification_code`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/change_password_verification_code`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code list — pagination slices the result set', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/change_password_verification_code`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/change_password_verification_code?size=2&page=1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code list — equality filter on attempts (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/change_password_verification_code`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/change_password_verification_code?query[attempts]=${RECORDS[1].attempts}`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].attempts, RECORDS[1].attempts)
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code list — sort by attempts (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/change_password_verification_code`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/change_password_verification_code?sort[attempts]=-1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.attempts)
		assert.deepEqual(values, [...RECORDS].map(r => r.attempts).sort().reverse())
	} finally {
		await app.stop()
	}
})

test('change_password_verification_code list — gt operator on attempts (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/change_password_verification_code`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/change_password_verification_code?query[attempts][gt]=${RECORDS[0].attempts}`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 2)
	} finally {
		await app.stop()
	}
})
