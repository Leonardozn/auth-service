const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'user' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/user.test.js).
const SAMPLE = {
		"name": "sample text",
		"email": "sample text",
		"password": "sample text",
		"role": "64b0c0ffee1234567890abcd",
		"active": true
	}

const SEED_ID = '64b0c0ffee1234567890abcf'

// The User contract never exposes password (security), and does expose _id (self-service
// account management needs the client to know its own id).
const EXPECTED = { _id: SEED_ID, name: SAMPLE.name, email: SAMPLE.email, role: SAMPLE.role, active: SAMPLE.active }

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Assigning a `role` through POST/PUT /user is admin-only - seeds a ready-to-use admin
// (role + user + session) so tests can authenticate as one without going through the API
// (which would itself require an admin, chicken-and-egg).
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

test('user routes — POST creates a record, as an admin', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('POST', `${app.path}/user`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 200)
	} finally {
		await app.stop()
	}
})

test('user routes — POST rejects assigning a role without an admin session', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/user`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('user routes — GET by id returns the seeded record, for any authenticated session', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/user/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — GET by id rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/user/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('user routes — GET by id returns 400 when the record does not exist', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const res = await app.request('GET', `${app.path}/user/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 400)
		assert.equal(res.body.success, false)
	} finally {
		await app.stop()
	}
})

test('user routes — GET list returns the envelope shape, for any authenticated session', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('GET', `${app.path}/user`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		// +1 for the seeded admin's own account, alongside the SEED_ID record.
		assert.equal(res.body.content.count, 2)
		assert.deepEqual(res.body.content.records.find(r => r._id === SEED_ID), EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — GET list rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('GET', `${app.path}/user`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

// PATCH /user/:id is wired to AccountManagementService.editProfile (self, or an admin on
// anyone) instead of a plain update - these tests seed the caller's session directly via
// MOCK_SEED_RECORDS, since POST /session is now itself admin-only.
function selfSessionEnv() {
	return {
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'session', id: '64b0c0ffee1234567890abcc', record: { user: SEED_ID, accessToken: 'self-access-token', accessTokenExpiresAt: futureDate(), refreshToken: 'self-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	}
}

test('user routes — PATCH updates the caller\'s own profile', async () => {
	const app = await runApp({ ...seededEnv(), ...selfSessionEnv() })

	try {
		const res = await app.request(
			'PATCH',
			`${app.path}/user/${SEED_ID}`,
			{ name: 'Updated Name', email: 'updated@example.com' },
			{ Authorization: 'Bearer self-access-token' }
		)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.name, 'Updated Name')
		assert.equal(res.body.content.email, 'updated@example.com')
		assert.equal(res.body.content.active, true)
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/user/${SEED_ID}`, { name: 'Hijacked' })

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Missing or malformed Authorization header.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH forbids editing another account without admin', async () => {
	const BOB_ID = '64b0c0ffee1234567890abda'
	const app = await runApp({
		...seededEnv(),
		MOCK_SEED_RECORDS: JSON.stringify([
			...JSON.parse(selfSessionEnv().MOCK_SEED_RECORDS),
			{ schema: 'user', id: BOB_ID, record: { name: 'Bob', email: 'bob@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd', active: true } }
		])
	})

	try {
		const res = await app.request(
			'PATCH',
			`${app.path}/user/${BOB_ID}`,
			{ name: 'Hijacked' },
			{ Authorization: 'Bearer self-access-token' }
		)

		assert.equal(res.status, 403)
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH allows an admin to change another account\'s active flag', async () => {
	const app = await runApp(adminSeedEnv())

	try {
		const targetRes = await app.request('POST', `${app.path}/user`, {
			name: 'Bob',
			email: 'bob@example.com',
			password: 'hash',
			role: '64b0c0ffee1234567890abcd',
			active: true
		}, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		const targetId = targetRes.body.content._id

		const res = await app.request(
			'PATCH',
			`${app.path}/user/${targetId}`,
			{ active: false },
			{ Authorization: `Bearer ${ADMIN_TOKEN}` }
		)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.active, false)
	} finally {
		await app.stop()
	}
})

test('user routes — PUT replaces the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const res = await app.request('PUT', `${app.path}/user/${SEED_ID}`, SAMPLE, { Authorization: `Bearer ${ADMIN_TOKEN}` })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body.content, EXPECTED)
	} finally {
		await app.stop()
	}
})

test('user routes — PUT rejects assigning a role without an admin session', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PUT', `${app.path}/user/${SEED_ID}`, SAMPLE)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('user routes — DELETE removes the seeded record, as an admin', async () => {
	const app = await runApp({ ...seededEnv(), ...adminSeedEnv() })

	try {
		const del = await app.request('DELETE', `${app.path}/user/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/user/${SEED_ID}`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		assert.equal(after.status, 400)
	} finally {
		await app.stop()
	}
})

test('user routes — DELETE rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('DELETE', `${app.path}/user/${SEED_ID}`)

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})
