const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// The "user" default role must already exist for register() to resolve it - seeded here
// the same way the model-generated e2e tests seed a starting record.
function seededRoleEnv() {
	return {
		MOCK_SEED_SCHEMA: 'role',
		MOCK_SEED_ID: '64b0c0ffee1234567890abee',
		MOCK_SEED_RECORD: JSON.stringify({ name: 'user', active: true })
	}
}

// Pre-computed bcrypt hash of "Sup3rSecret!" (data-encrypt.encrypt), so login() has a known
// plain-text password to verify against without hashing at test time.
const LOGIN_PASSWORD_HASH = '$2b$12$Wos8EoR27Wt.iVQPlNfeh.soV4ybBAujGZQS6M0GjROaYFRo1yzWG'

function seededUserEnv() {
	return {
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: '64b0c0ffee1234567890abef',
		MOCK_SEED_RECORD: JSON.stringify({
			name: 'Ada',
			email: 'ada@example.com',
			password: LOGIN_PASSWORD_HASH,
			role: '64b0c0ffee1234567890abcd'
		})
	}
}

test('auth routes — POST /auth/register creates a user with the default role', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		assert.equal(res.status, 201)
		assert.equal(res.body.success, true)
		assert.equal(res.body.statusCode, 201)
		assert.equal(res.body.content.user.name, 'Ada')
		assert.equal(res.body.content.user.email, 'ada@example.com')
		assert.equal(res.body.content.user.role, '64b0c0ffee1234567890abee')
		assert.notEqual(res.body.content.user.password, 'Sup3rSecret!')
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/register rejects a duplicate email', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		const res = await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada 2',
			email: 'ada@example.com',
			password: 'AnotherSecret!'
		})

		assert.equal(res.status, 400)
		assert.deepEqual(res.body, {
			success: false,
			message: 'This email is already registered.',
			statusCode: 400,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/login returns tokens and the user on valid credentials', async () => {
	const app = await runApp(seededUserEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(typeof res.body.content.token, 'string')
		assert.equal(typeof res.body.content.refreshToken, 'string')
		assert.equal(res.body.content.user.name, 'Ada')
		assert.equal(res.body.content.user.email, 'ada@example.com')
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/login rejects invalid credentials', async () => {
	const app = await runApp(seededUserEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'WrongPassword!'
		})

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Invalid email or password.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
	}
})
