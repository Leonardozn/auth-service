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

// PATCH /user/:id is wired to AccountManagementService.editProfile (self, or an admin on
// anyone) instead of a plain update - these tests seed a session directly via POST /session
// rather than the single-schema MOCK_SEED_* mechanism, since a valid Authorization token is
// required to resolve the caller's identity.
function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

test('user routes — PATCH updates the caller\'s own profile', async () => {
	const app = await runApp(seededEnv())

	try {
		await app.request('POST', `${app.path}/session`, {
			user: SEED_ID,
			accessToken: 'self-access-token',
			accessTokenExpiresAt: futureDate(),
			refreshToken: 'self-refresh-token',
			refreshTokenExpiresAt: futureDate(5)
		})

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
	const app = await runApp(seededEnv())

	try {
		await app.request('POST', `${app.path}/session`, {
			user: SEED_ID,
			accessToken: 'self-access-token',
			accessTokenExpiresAt: futureDate(),
			refreshToken: 'self-refresh-token',
			refreshTokenExpiresAt: futureDate(5)
		})
		const otherRes = await app.request('POST', `${app.path}/user`, {
			name: 'Bob',
			email: 'bob@example.com',
			password: 'hash',
			role: '64b0c0ffee1234567890abcd',
			active: true
		})
		const otherId = otherRes.body.content._id

		const res = await app.request(
			'PATCH',
			`${app.path}/user/${otherId}`,
			{ name: 'Hijacked' },
			{ Authorization: 'Bearer self-access-token' }
		)

		assert.equal(res.status, 403)
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH allows an admin to change another account\'s active flag', async () => {
	// The Role contract never exposes _id, so a role created through POST /role can't hand back
	// an id to reference - seed it with a known id instead (same trick as auth.test.js's
	// seededRoleEnv()).
	const ADMIN_ROLE_ID = '64b0c0ffee1234567890adcd'
	const app = await runApp({
		MOCK_SEED_SCHEMA: 'role',
		MOCK_SEED_ID: ADMIN_ROLE_ID,
		MOCK_SEED_RECORD: JSON.stringify({ name: 'admin', active: true })
	})

	try {
		const adminRes = await app.request('POST', `${app.path}/user`, {
			name: 'Root',
			email: 'root@example.com',
			password: 'hash',
			role: ADMIN_ROLE_ID,
			active: true
		})
		await app.request('POST', `${app.path}/session`, {
			user: adminRes.body.content._id,
			accessToken: 'admin-access-token',
			accessTokenExpiresAt: futureDate(),
			refreshToken: 'admin-refresh-token',
			refreshTokenExpiresAt: futureDate(5)
		})

		const targetRes = await app.request('POST', `${app.path}/user`, {
			name: 'Bob',
			email: 'bob@example.com',
			password: 'hash',
			role: '64b0c0ffee1234567890abcd',
			active: true
		})
		const targetId = targetRes.body.content._id

		const res = await app.request(
			'PATCH',
			`${app.path}/user/${targetId}`,
			{ active: false },
			{ Authorization: 'Bearer admin-access-token' }
		)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.active, false)
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
