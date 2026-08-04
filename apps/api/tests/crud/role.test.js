const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// Exhaustive list/filter/sort/pagination coverage for 'role' (DB mocked, L4-style) -
// records are created through the real POST endpoint (contracts hide '_id', so identifying
// records by a known field value - not a learned id - is what makes these assertions possible).
const RECORDS = [
		{
			"name": "item-1",
			"active": true
		},
		{
			"name": "item-2",
			"active": true
		},
		{
			"name": "item-3",
			"active": true
		}
	]

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Role is a platform-wide RBAC primitive - every mutation on it is admin-only. Seeds a
// ready-to-use admin (role + user + session) so RECORDS can be created through the real endpoint.
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

test('role create — complete payload round-trips through the full envelope', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/role`, RECORDS[0], ADMIN_HEADERS)

		assert.equal(res.status, 200)
		// El contrato de Role expone _id: sin él, PUT/PATCH/DELETE de /role no se pueden invocar
		// desde ningún cliente. Lo genera el servidor al crear, así que se compara contra el que
		// devolvió y no contra un valor fijo.
		assert.equal(typeof res.body.content._id, 'string')
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: { ...RECORDS[0], _id: res.body.content._id }
		})
	} finally {
		await app.stop()
	}
})

test('role list — count reflects every created record', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/role`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		// +1 for the seeded admin role itself.
		assert.equal(res.body.content.count, RECORDS.length + 1)
	} finally {
		await app.stop()
	}
})

test('role list — pagination slices the result set', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/role?size=2&page=1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, RECORDS.length + 1)
		assert.equal(res.body.content.records.length, 2)
	} finally {
		await app.stop()
	}
})

test('role list — equality filter on name (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/role?query[name]=${RECORDS[1].name}`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.count, 1)
		assert.equal(res.body.content.records[0].name, RECORDS[1].name)
	} finally {
		await app.stop()
	}
})

test('role list — sort by name (FR-G8)', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		for (const record of RECORDS) await app.request('POST', `${app.path}/role`, record, ADMIN_HEADERS)

		const res = await app.request('GET', `${app.path}/role?sort[name]=-1`, undefined, ADMIN_HEADERS)

		assert.equal(res.status, 200)
		const names = res.body.content.records.map(r => r.name)
		assert.deepEqual(names, [...RECORDS.map(r => r.name), 'admin'].sort().reverse())
	} finally {
		await app.stop()
	}
})
