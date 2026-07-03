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

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// PasswordResetToken is an internal recovery record - every raw CRUD operation on it is
// admin-only. Seeds a ready-to-use admin (role + user + session) so RECORDS can be created
// through the real endpoint.
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

test('password_reset_token create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/password_reset_token`, RECORDS[0], ADMIN_HEADERS)

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
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/password_reset_token`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — pagination slices the result set', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/password_reset_token?size=2&page=1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — equality filter on token (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/password_reset_token?query[token]=${RECORDS[1].token}`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].token, RECORDS[1].token)
	} finally {
		await app.stop()
	}
})

test('password_reset_token list — sort by token (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/password_reset_token`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/password_reset_token?sort[token]=-1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.token)
		assert.deepEqual(values, [...RECORDS].map(r => r.token).sort().reverse())
	} finally {
		await app.stop()
	}
})
