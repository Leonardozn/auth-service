const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// Generic request/response wiring for every 'user' route (DB mocked) - this tier checks
// the envelope and routing, not exhaustive field coverage (that's tests/crud/user.test.js).
const SAMPLE = {
		"name": "sample text",
		"email": "sample text",
		"password": "sample text",
		"role": "64b0c0ffee1234567890abcd"
	}

// The User contract never exposes password (security: even hashed, it must never leave the
// API). _id IS exposed (unlike other models) since self-service account management needs the
// client to know its own id - see PATCH/DELETE below, which go through AccountManagementService
// (auth-service tasks 14+23) rather than the raw generated CRUD action.
const SEED_ID = '64b0c0ffee1234567890abcf'
const EXPECTED = { _id: SEED_ID, name: SAMPLE.name, email: SAMPLE.email, role: SAMPLE.role }

function seededEnv() {
	return {
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: SEED_ID,
		MOCK_SEED_RECORD: JSON.stringify(SAMPLE)
	}
}

function seededRoleEnv() {
	return {
		MOCK_SEED_SCHEMA: 'role',
		MOCK_SEED_ID: '64b0c0ffee1234567890abee',
		MOCK_SEED_RECORD: JSON.stringify({ name: 'user', active: true })
	}
}

async function registerAndLogin(app, { name = 'Ada', email = 'ada@example.com', password = 'Sup3rSecret!' } = {}) {
	await app.request('POST', `${app.path}/auth/register`, { name, email, password })
	const loginRes = await app.request('POST', `${app.path}/auth/login`, { email, password })
	return loginRes.body.content
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

// PATCH and DELETE /user/:id are wired through AccountManagementService (tasks 14+23), not the
// raw generated CRUD action - they require Authorization and an owner-or-admin check, so these
// need a real authenticated session rather than the plain seed used above.

test('user routes — PATCH updates the caller\'s own profile', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const { token, user } = await registerAndLogin(app)

		const res = await app.request(
			'PATCH',
			`${app.path}/user/${user._id}`,
			{ name: 'Ada Updated' },
			{ Authorization: `Bearer ${token}` }
		)

		assert.equal(res.status, 200)
		assert.equal(res.body.content.name, 'Ada Updated')
		assert.equal(res.body.content.email, 'ada@example.com')
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH rejects editing another account without an admin role', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const { token } = await registerAndLogin(app, { email: 'ada@example.com' })
		const other = await registerAndLogin(app, { name: 'Bob', email: 'bob@example.com' })

		const res = await app.request(
			'PATCH',
			`${app.path}/user/${other.user._id}`,
			{ name: 'Hijacked' },
			{ Authorization: `Bearer ${token}` }
		)

		assert.equal(res.status, 403)
	} finally {
		await app.stop()
	}
})

test('user routes — PATCH rejects a missing Authorization header', async () => {
	const app = await runApp(seededEnv())

	try {
		const res = await app.request('PATCH', `${app.path}/user/${SEED_ID}`, { name: 'New Name' })

		assert.equal(res.status, 401)
	} finally {
		await app.stop()
	}
})

test('user routes — DELETE removes the caller\'s own account, cascading sessions', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const { token, user } = await registerAndLogin(app)

		const del = await app.request('DELETE', `${app.path}/user/${user._id}`, undefined, { Authorization: `Bearer ${token}` })
		assert.equal(del.status, 200)

		const after = await app.request('GET', `${app.path}/user/${user._id}`)
		assert.equal(after.status, 400)

		// the deleted account's own session must be gone too (cascade), not just left orphaned
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token })
		assert.equal(validateRes.status, 401)
	} finally {
		await app.stop()
	}
})

test('user routes — DELETE rejects deleting another account without an admin role', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const { token } = await registerAndLogin(app, { email: 'ada@example.com' })
		const other = await registerAndLogin(app, { name: 'Bob', email: 'bob@example.com' })

		const res = await app.request('DELETE', `${app.path}/user/${other.user._id}`, undefined, { Authorization: `Bearer ${token}` })

		assert.equal(res.status, 403)
	} finally {
		await app.stop()
	}
})
