const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
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
		assert.equal(res.body.content.user.password, undefined)
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
		assert.equal(res.body.content.user.password, undefined)
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

test('auth routes — POST /auth/refresh rotates tokens for a valid refresh token', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const { refreshToken } = loginRes.body.content

		const res = await app.request('POST', `${app.path}/auth/refresh`, { refreshToken })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(typeof res.body.content.token, 'string')
		assert.equal(typeof res.body.content.refreshToken, 'string')
		assert.notEqual(res.body.content.refreshToken, refreshToken)
		assert.equal(res.body.content.user.name, 'Ada')
		assert.equal(res.body.content.user.password, undefined)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/refresh rejects an invalid refresh token', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/refresh`, { refreshToken: 'not-a-real-token' })

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Invalid or expired token.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/validate returns the user for a valid access token', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const { token } = loginRes.body.content

		const res = await app.request('POST', `${app.path}/auth/validate`, { token })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(res.body.content.user.name, 'Ada')
		assert.equal(res.body.content.user.email, 'ada@example.com')
		// role must resolve to the Role's name (what cv-service and other consumers authorize
		// off), never the raw ObjectId the User document actually stores
		assert.equal(res.body.content.user.role, 'user')
		assert.equal(res.body.content.user.password, undefined)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/validate rejects an invalid access token', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/validate`, { token: 'not-a-real-token' })

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Invalid or expired token.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/logout revokes the session and future validation returns 401', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const { token } = loginRes.body.content

		const logoutRes = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${token}` })

		assert.equal(logoutRes.status, 200)
		assert.deepEqual(logoutRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token })
		assert.equal(validateRes.status, 401)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/logout is idempotent when called twice', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const { token } = loginRes.body.content

		const first = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${token}` })
		const second = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${token}` })

		assert.equal(first.status, 200)
		assert.equal(second.status, 200)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/logout rejects a missing Authorization header', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/logout`)

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

test('auth routes — POST /auth/change-password emails a verification code without changing the password yet', async () => {
	const captureFile = path.join(os.tmpdir(), `change-password-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		const changeRes = await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret!' },
			{ Authorization: `Bearer ${loginRes.body.content.token}` }
		)

		assert.equal(changeRes.status, 200)
		assert.deepEqual(changeRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		assert.equal(sent.to, 'ada@example.com')
		assert.match(sent.html, /\b\d{6}\b/)

		// the password has not changed yet
		const oldLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(oldLogin.status, 200)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/change-password/verify applies the pending password and revokes other sessions', async () => {
	const captureFile = path.join(os.tmpdir(), `change-password-verify-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const firstLogin = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const secondLogin = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret!' },
			{ Authorization: `Bearer ${firstLogin.body.content.token}` }
		)
		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		const code = sent.html.match(/\b(\d{6})\b/)[1]

		const verifyRes = await app.request(
			'POST',
			`${app.path}/auth/change-password/verify`,
			{ code },
			{ Authorization: `Bearer ${firstLogin.body.content.token}` }
		)

		assert.equal(verifyRes.status, 200)
		assert.deepEqual(verifyRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		// the other session (from the second login) must be revoked
		const otherValidate = await app.request('POST', `${app.path}/auth/validate`, { token: secondLogin.body.content.token })
		assert.equal(otherValidate.status, 401)

		// the current session survives the change
		const currentValidate = await app.request('POST', `${app.path}/auth/validate`, { token: firstLogin.body.content.token })
		assert.equal(currentValidate.status, 200)

		// old password no longer works, new one does
		const oldLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(oldLogin.status, 401)
		const newLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'NewSecret!' })
		assert.equal(newLogin.status, 200)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/change-password/verify rejects a wrong code', async () => {
	const captureFile = path.join(os.tmpdir(), `change-password-verify-wrong-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret!' },
			{ Authorization: `Bearer ${loginRes.body.content.token}` }
		)

		const res = await app.request(
			'POST',
			`${app.path}/auth/change-password/verify`,
			{ code: '000000' },
			{ Authorization: `Bearer ${loginRes.body.content.token}` }
		)

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Invalid verification code.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/change-password rejects the wrong current password', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		const res = await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'WrongPassword!', newPassword: 'NewSecret!' },
			{ Authorization: `Bearer ${loginRes.body.content.token}` }
		)

		assert.equal(res.status, 401)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Current password does not match.',
			statusCode: 401,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/forgot-password creates a reset token and emails it when the user exists', async () => {
	const captureFile = path.join(os.tmpdir(), `forgot-password-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})

		const res = await app.request('POST', `${app.path}/auth/forgot-password`, { email: 'ada@example.com' })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		assert.equal(sent.to, 'ada@example.com')
		assert.match(sent.html, /reset-password\?token=/)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/forgot-password responds successfully even when the email is unknown', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/forgot-password`, { email: 'missing@example.com' })

		assert.equal(res.status, 200)
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/reset-password updates the password and revokes all sessions', async () => {
	// GET /password_reset_token is admin-only - seed an admin session to read back the token
	// forgot-password created (the endpoint itself never returns the token, by design).
	const ADMIN_ROLE_ID = '64b0c0ffee1234567890adcd'
	const ADMIN_ID = '64b0c0ffee1234567890adce'
	const ADMIN_TOKEN = 'admin-access-token'
	const futureDate = (days = 1) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
	const app = await runApp({
		...seededRoleEnv(),
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: ADMIN_ROLE_ID, record: { name: 'admin', active: true } },
			{ schema: 'user', id: ADMIN_ID, record: { name: 'Root', email: 'root@example.com', password: 'hash', role: ADMIN_ROLE_ID, active: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: ADMIN_ID, accessToken: ADMIN_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: 'admin-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	})

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		await app.request('POST', `${app.path}/auth/forgot-password`, { email: 'ada@example.com' })

		const tokensRes = await app.request('GET', `${app.path}/password_reset_token`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		const resetToken = tokensRes.body.content.records[0].token

		const resetRes = await app.request('POST', `${app.path}/auth/reset-password`, { token: resetToken, newPassword: 'NewSecret!' })

		assert.equal(resetRes.status, 200)
		assert.deepEqual(resetRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		// the session that existed before the reset must be revoked
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token: loginRes.body.content.token })
		assert.equal(validateRes.status, 401)

		// old password no longer works, new one does
		const oldLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(oldLogin.status, 401)
		const newLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'NewSecret!' })
		assert.equal(newLogin.status, 200)

		// the token is single-use - reusing it must fail
		const reuseRes = await app.request('POST', `${app.path}/auth/reset-password`, { token: resetToken, newPassword: 'AnotherSecret!' })
		assert.equal(reuseRes.status, 400)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/reset-password rejects an invalid token', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/reset-password`, { token: 'not-a-real-token', newPassword: 'NewSecret!' })

		assert.equal(res.status, 400)
		assert.deepEqual(res.body, {
			success: false,
			message: 'Invalid or expired reset token.',
			statusCode: 400,
			content: null
		})
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/deactivate deactivates the account and a subsequent login is rejected', async () => {
	const app = await runApp(seededRoleEnv())

	try {
		await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada',
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const loginRes = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		const { token } = loginRes.body.content

		const deactivateRes = await app.request('POST', `${app.path}/auth/deactivate`, undefined, { Authorization: `Bearer ${token}` })

		assert.equal(deactivateRes.status, 200)
		assert.equal(deactivateRes.body.success, true)
		assert.equal(deactivateRes.body.content.active, false)

		// the session used to deactivate is itself revoked
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token })
		assert.equal(validateRes.status, 401)

		// a deactivated account can no longer log in
		const secondLogin = await app.request('POST', `${app.path}/auth/login`, {
			email: 'ada@example.com',
			password: 'Sup3rSecret!'
		})
		assert.equal(secondLogin.status, 403)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/deactivate rejects a missing Authorization header', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/deactivate`)

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
