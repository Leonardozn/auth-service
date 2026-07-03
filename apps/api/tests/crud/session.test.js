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

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Session is an internal identity record - every raw CRUD operation on it is admin-only. Seeds
// a ready-to-use admin (role + user + session) so RECORDS can be created through the real endpoint.
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

test('session create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/session`, RECORDS[0], ADMIN_HEADERS)

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
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/session`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		// +1 for the seeded admin's own session.
		assert.equal(res.body.content.count, RECORDS.length + 1)
	} finally {
		await app.stop()
	}
})

test('session list — pagination slices the result set', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/session?size=2&page=1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length + 1)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('session list — equality filter on accessToken (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/session?query[accessToken]=${RECORDS[1].accessToken}`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].accessToken, RECORDS[1].accessToken)
	} finally {
		await app.stop()
	}
})

test('session list — sort by accessToken (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/session`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/session?sort[accessToken]=-1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		const values = res.body.content.records.map(r => r.accessToken)
		assert.deepEqual(values, [...RECORDS.map(r => r.accessToken), ADMIN_TOKEN].sort().reverse())
	} finally {
		await app.stop()
	}
})
