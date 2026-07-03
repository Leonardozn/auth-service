const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'user' (DB mocked, L4-style). Unlike other
// models, the User contract exposes _id (self-service account management needs the client to
// know its own id - see tests/e2e/routes/user.test.js's PATCH coverage).
const RECORDS = [
		{
			"name": "item-1",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd",
			"active": true
		},
		{
			"name": "item-2",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd",
			"active": true
		},
		{
			"name": "item-3",
			"email": "sample text",
			"password": "sample text",
			"role": "64b0c0ffee1234567890abcd",
			"active": true
		}
	]

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Assigning a `role` through POST /user is admin-only - seeds a ready-to-use admin
// (role + user + session) so every record in RECORDS can be created through the real endpoint.
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

test('user create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/user`, RECORDS[0], ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(typeof res.body.content._id, 'string')
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			// The User contract never exposes password (security), even though it was submitted.
			content: { _id: res.body.content._id, name: RECORDS[0].name, email: RECORDS[0].email, role: RECORDS[0].role, active: RECORDS[0].active }
		})
	} finally {
		await app.stop()
	}
})

test('user list — count reflects every created record', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/user`)

		assert.equal(res.status, 200)
		// +1 for the seeded admin itself.
		assert.equal(res.body.content.count, RECORDS.length + 1)
	} finally {
		await app.stop()
	}
})

test('user list — pagination slices the result set', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/user?size=2&page=1`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length + 1)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('user list — equality filter on name (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/user?query[name]=${RECORDS[1].name}`)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].name, RECORDS[1].name)
	} finally {
		await app.stop()
	}
})

test('user list — sort by name (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/user`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/user?sort[name]=-1`)

		assert.equal(res.status, 200)
		const names = res.body.content.records.map(r => r.name)
		// The seeded admin ("Root") sorts last in descending order alongside item-1..3.
		assert.deepEqual(names, [...RECORDS.map(r => r.name), 'Root'].sort().reverse())
	} finally {
		await app.stop()
	}
})
