const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { runApp } = require('../../support/run-app')

function futureDate(days = 1) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

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

// Already confirmed - covers login()'s own tests, which are about credentials/session, not the
// confirmation flow itself.
function seededUserEnv() {
	return {
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: '64b0c0ffee1234567890abef',
		MOCK_SEED_RECORD: JSON.stringify({
			name: 'Ada',
			email: 'ada@example.com',
			password: LOGIN_PASSWORD_HASH,
			role: '64b0c0ffee1234567890abcd',
			active: true,
			emailConfirmed: true
		})
	}
}

// A ready-to-use confirmed identity (role + user + one session) - for tests where the session is
// only setup to exercise a *different* endpoint (refresh, validate, logout, reset-password,
// deactivate). Registering-then-logging-in for these would now fail (a fresh registration is
// unconfirmed), and isn't the point of these tests anyway.
const USER_ROLE_ID = '64b0c0ffee1234567890abee'
const USER_ID = '64b0c0ffee1234567890abef'
const USER_TOKEN = 'user-access-token'
const USER_REFRESH_TOKEN = 'user-refresh-token'

function seededUserWithSessionEnv() {
	return {
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: USER_ROLE_ID, record: { name: 'user', active: true } },
			{ schema: 'user', id: USER_ID, record: { name: 'Ada', email: 'ada@example.com', password: LOGIN_PASSWORD_HASH, role: USER_ROLE_ID, active: true, emailConfirmed: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: USER_ID, accessToken: USER_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: USER_REFRESH_TOKEN, refreshTokenExpiresAt: futureDate(5) } }
		])
	}
}

// Same identity, two independent sessions - for change-password/verify's "the other session gets
// revoked, the current one survives" assertion.
const SECOND_TOKEN = 'second-access-token'

function seededUserWithTwoSessionsEnv() {
	return {
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: USER_ROLE_ID, record: { name: 'user', active: true } },
			{ schema: 'user', id: USER_ID, record: { name: 'Ada', email: 'ada@example.com', password: LOGIN_PASSWORD_HASH, role: USER_ROLE_ID, active: true, emailConfirmed: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: USER_ID, accessToken: USER_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: USER_REFRESH_TOKEN, refreshTokenExpiresAt: futureDate(5) } },
			{ schema: 'session', id: '64b0c0ffee1234567890adc0', record: { user: USER_ID, accessToken: SECOND_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: 'second-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	}
}

test('auth routes — POST /auth/register creates an unconfirmed user, emails a code, and opens no session', async () => {
	const captureFile = path.join(os.tmpdir(), `register-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

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
		assert.equal(res.body.content.user.emailConfirmed, false)
		assert.equal(typeof res.body.content.expiresInSeconds, 'number')
		assert.ok(res.body.content.expiresInSeconds > 0)

		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		assert.equal(sent.to, 'ada@example.com')
		assert.match(sent.html, /\b\d{6}\b/)

		// Unconfirmed - cannot log in yet
		const loginRes = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(loginRes.status, 403)
		assert.equal(loginRes.body.message, 'Email not confirmed.')
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/register rejects an email that already belongs to a confirmed account', async () => {
	// MOCK_SEED_SCHEMA/ID/RECORD only seed one record - role and user both need to exist here, so
	// MOCK_SEED_RECORDS (an array) is required instead of combining seededRoleEnv()+seededUserEnv()
	// (the second single-record env would silently overwrite the first).
	const app = await runApp({
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: '64b0c0ffee1234567890abee', record: { name: 'user', active: true } },
			{ schema: 'user', id: '64b0c0ffee1234567890abef', record: { name: 'Ada', email: 'ada@example.com', password: LOGIN_PASSWORD_HASH, role: '64b0c0ffee1234567890abcd', active: true, emailConfirmed: true } }
		])
	})

	try {
		const res = await app.request('POST', `${app.path}/auth/register`, {
			name: 'Ada 2',
			email: 'ada@example.com',
			password: 'AnotherSecret1!'
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

test('auth routes — POST /auth/register replaces an unconfirmed account with the same email', async () => {
	// Bypasses the resend cooldown for this one test only, so a second register() right after the
	// first isn't rejected with 429 - the behavior under test is the replacement itself.
	const app = await runApp({ ...seededRoleEnv(), CONFIRMATION_CODE_RESEND_COOLDOWN: '0s' })

	try {
		const first = await app.request('POST', `${app.path}/auth/register`, {
			name: 'First Try', email: 'ada@example.com', password: 'Sup3rSecret!'
		})
		const second = await app.request('POST', `${app.path}/auth/register`, {
			name: 'Second Try', email: 'ada@example.com', password: 'AnotherSecret1!'
		})

		assert.equal(second.status, 201)
		assert.notEqual(second.body.content.user._id, first.body.content.user._id)
		assert.equal(second.body.content.user.name, 'Second Try')
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/email-status reports whether an email is registered', async () => {
	const app = await runApp(seededUserEnv())

	try {
		const known = await app.request('POST', `${app.path}/auth/email-status`, { email: 'ada@example.com' })
		assert.equal(known.status, 200)
		assert.deepEqual(known.body.content, { registered: true })

		const unknown = await app.request('POST', `${app.path}/auth/email-status`, { email: 'nobody@example.com' })
		assert.equal(unknown.status, 200)
		assert.deepEqual(unknown.body.content, { registered: false })
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/send-confirmation-code resends a code and 404s for an unknown email', async () => {
	const captureFile = path.join(os.tmpdir(), `send-confirmation-code-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), CONFIRMATION_CODE_RESEND_COOLDOWN: '0s', MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' })

		const res = await app.request('POST', `${app.path}/auth/send-confirmation-code`, { email: 'ada@example.com' })

		assert.equal(res.status, 200)
		assert.equal(typeof res.body.content.expiresInSeconds, 'number')
		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		assert.equal(sent.to, 'ada@example.com')

		const missing = await app.request('POST', `${app.path}/auth/send-confirmation-code`, { email: 'nobody@example.com' })
		assert.equal(missing.status, 404)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/verify-confirmation-code confirms the email and starts a session; the account can then log in normally', async () => {
	const captureFile = path.join(os.tmpdir(), `verify-confirmation-code-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' })
		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		const code = sent.html.match(/\b(\d{6})\b/)[1]

		const res = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, { email: 'ada@example.com', code })

		assert.equal(res.status, 200)
		assert.equal(typeof res.body.content.token, 'string')
		assert.equal(typeof res.body.content.refreshToken, 'string')
		assert.equal(res.body.content.user.emailConfirmed, true)

		// Response shape matches POST /auth/login exactly
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token: res.body.content.token })
		assert.equal(validateRes.status, 200)

		// Now that it's confirmed, plain login works too
		const loginRes = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(loginRes.status, 200)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/verify-confirmation-code rejects a wrong code', async () => {
	const captureFile = path.join(os.tmpdir(), `verify-confirmation-code-wrong-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededRoleEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request('POST', `${app.path}/auth/register`, { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' })

		const res = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, { email: 'ada@example.com', code: '000000' })

		assert.equal(res.status, 401)
		assert.equal(res.body.message, 'Invalid confirmation code.')
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/verify-confirmation-code rejects when there is no pending code', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, { email: 'nobody@example.com', code: '000000' })

		assert.equal(res.status, 400)
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

test('auth routes — POST /auth/login rejects an unconfirmed account with a distinct message', async () => {
	const app = await runApp({
		MOCK_SEED_SCHEMA: 'user',
		MOCK_SEED_ID: '64b0c0ffee1234567890abef',
		MOCK_SEED_RECORD: JSON.stringify({ name: 'Ada', email: 'ada@example.com', password: LOGIN_PASSWORD_HASH, role: '64b0c0ffee1234567890abcd', active: true, emailConfirmed: false })
	})

	try {
		const res = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })

		assert.equal(res.status, 403)
		assert.equal(res.body.message, 'Email not confirmed.')
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/refresh rotates tokens for a valid refresh token', async () => {
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/refresh`, { refreshToken: USER_REFRESH_TOKEN })

		assert.equal(res.status, 200)
		assert.equal(res.body.success, true)
		assert.equal(typeof res.body.content.token, 'string')
		assert.equal(typeof res.body.content.refreshToken, 'string')
		assert.notEqual(res.body.content.refreshToken, USER_REFRESH_TOKEN)
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
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const res = await app.request('POST', `${app.path}/auth/validate`, { token: USER_TOKEN })

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
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const logoutRes = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${USER_TOKEN}` })

		assert.equal(logoutRes.status, 200)
		assert.deepEqual(logoutRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token: USER_TOKEN })
		assert.equal(validateRes.status, 401)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/logout is idempotent when called twice', async () => {
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const first = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${USER_TOKEN}` })
		const second = await app.request('POST', `${app.path}/auth/logout`, undefined, { Authorization: `Bearer ${USER_TOKEN}` })

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
	const app = await runApp({ ...seededUserWithSessionEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		const changeRes = await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret1!' },
			{ Authorization: `Bearer ${USER_TOKEN}` }
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
	const app = await runApp({ ...seededUserWithTwoSessionsEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret1!' },
			{ Authorization: `Bearer ${USER_TOKEN}` }
		)
		const sent = JSON.parse(fs.readFileSync(captureFile, 'utf8'))
		const code = sent.html.match(/\b(\d{6})\b/)[1]

		const verifyRes = await app.request(
			'POST',
			`${app.path}/auth/change-password/verify`,
			{ code },
			{ Authorization: `Bearer ${USER_TOKEN}` }
		)

		assert.equal(verifyRes.status, 200)
		assert.deepEqual(verifyRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		// the other session must be revoked
		const otherValidate = await app.request('POST', `${app.path}/auth/validate`, { token: SECOND_TOKEN })
		assert.equal(otherValidate.status, 401)

		// the current session survives the change
		const currentValidate = await app.request('POST', `${app.path}/auth/validate`, { token: USER_TOKEN })
		assert.equal(currentValidate.status, 200)

		// old password no longer works, new one does
		const oldLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(oldLogin.status, 401)
		const newLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'NewSecret1!' })
		assert.equal(newLogin.status, 200)
	} finally {
		await app.stop()
		fs.rmSync(captureFile, { force: true })
	}
})

test('auth routes — POST /auth/change-password/verify rejects a wrong code', async () => {
	const captureFile = path.join(os.tmpdir(), `change-password-verify-wrong-capture-${Date.now()}.json`)
	const app = await runApp({ ...seededUserWithSessionEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
		await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret1!' },
			{ Authorization: `Bearer ${USER_TOKEN}` }
		)

		const res = await app.request(
			'POST',
			`${app.path}/auth/change-password/verify`,
			{ code: '000000' },
			{ Authorization: `Bearer ${USER_TOKEN}` }
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
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const res = await app.request(
			'POST',
			`${app.path}/auth/change-password`,
			{ currentPassword: 'WrongPassword!', newPassword: 'NewSecret1!' },
			{ Authorization: `Bearer ${USER_TOKEN}` }
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
	const app = await runApp({ ...seededUserEnv(), MOCK_EMAIL_CAPTURE_FILE: captureFile })

	try {
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
	const app = await runApp()

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
	const app = await runApp({
		MOCK_SEED_RECORDS: JSON.stringify([
			{ schema: 'role', id: USER_ROLE_ID, record: { name: 'user', active: true } },
			{ schema: 'user', id: USER_ID, record: { name: 'Ada', email: 'ada@example.com', password: LOGIN_PASSWORD_HASH, role: USER_ROLE_ID, active: true, emailConfirmed: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcf', record: { user: USER_ID, accessToken: USER_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: USER_REFRESH_TOKEN, refreshTokenExpiresAt: futureDate(5) } },
			{ schema: 'role', id: ADMIN_ROLE_ID, record: { name: 'admin', active: true } },
			{ schema: 'user', id: ADMIN_ID, record: { name: 'Root', email: 'root@example.com', password: 'hash', role: ADMIN_ROLE_ID, active: true } },
			{ schema: 'session', id: '64b0c0ffee1234567890adcc', record: { user: ADMIN_ID, accessToken: ADMIN_TOKEN, accessTokenExpiresAt: futureDate(), refreshToken: 'admin-refresh-token', refreshTokenExpiresAt: futureDate(5) } }
		])
	})

	try {
		await app.request('POST', `${app.path}/auth/forgot-password`, { email: 'ada@example.com' })

		const tokensRes = await app.request('GET', `${app.path}/password_reset_token`, undefined, { Authorization: `Bearer ${ADMIN_TOKEN}` })
		const resetToken = tokensRes.body.content.records[0].token

		const resetRes = await app.request('POST', `${app.path}/auth/reset-password`, { token: resetToken, newPassword: 'NewSecret1!' })

		assert.equal(resetRes.status, 200)
		assert.deepEqual(resetRes.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})

		// the session that existed before the reset must be revoked
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token: USER_TOKEN })
		assert.equal(validateRes.status, 401)

		// old password no longer works, new one does
		const oldLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'Sup3rSecret!' })
		assert.equal(oldLogin.status, 401)
		const newLogin = await app.request('POST', `${app.path}/auth/login`, { email: 'ada@example.com', password: 'NewSecret1!' })
		assert.equal(newLogin.status, 200)

		// the token is single-use - reusing it must fail
		const reuseRes = await app.request('POST', `${app.path}/auth/reset-password`, { token: resetToken, newPassword: 'AnotherSecret1!' })
		assert.equal(reuseRes.status, 400)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/reset-password rejects an invalid token', async () => {
	const app = await runApp()

	try {
		const res = await app.request('POST', `${app.path}/auth/reset-password`, { token: 'not-a-real-token', newPassword: 'NewSecret1!' })

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
	const app = await runApp(seededUserWithSessionEnv())

	try {
		const deactivateRes = await app.request('POST', `${app.path}/auth/deactivate`, undefined, { Authorization: `Bearer ${USER_TOKEN}` })

		assert.equal(deactivateRes.status, 200)
		assert.equal(deactivateRes.body.success, true)
		assert.equal(deactivateRes.body.content.active, false)

		// the session used to deactivate is itself revoked
		const validateRes = await app.request('POST', `${app.path}/auth/validate`, { token: USER_TOKEN })
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
