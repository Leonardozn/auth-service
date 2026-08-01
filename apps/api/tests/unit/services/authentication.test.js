const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const MockEmailManager = require('../../support/mock-email-manager-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const AuthenticationService = require('../../../src/services/authentication')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
	MockEmailManager.getInstance().send = async () => ({ id: 'mock-email-id' })
})

test('AuthenticationService.register() — creates an unconfirmed user, emails a code, and never opens a session', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	let capturedSend
	MockEmailManager.getInstance().send = async (config) => { capturedSend = config; return { id: 'mock-email-id' } }
	const service = AuthenticationService.getInstance()

	const result = await service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } })

	assert.equal(result.user.name, 'Ada')
	assert.equal(result.user.email, 'ada@example.com')
	assert.equal(result.user.password, undefined)
	assert.equal(result.user.emailConfirmed, false)
	assert.ok(result.user.role)
	assert.equal(typeof result.expiresInSeconds, 'number')
	assert.ok(result.expiresInSeconds > 0)

	assert.equal(capturedSend.to, 'ada@example.com')
	assert.match(capturedSend.html, /\b\d{6}\b/)

	const codes = await repository.list('confirmation_code', { query: { user: String(result.user._id), purpose: 'registration' } })
	assert.equal(codes.count, 1)
	assert.equal(codes.records[0].used, false)
	assert.equal(codes.records[0].medium, 'email')

	// Registering never opens a session - that only happens on verify-confirmation-code
	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 0)
})

test('AuthenticationService.register() — throws when the email already belongs to a confirmed account', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	await repository.add('user', { data: { name: 'Existing', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd', emailConfirmed: true } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'BadRequestError' }
	)
})

test('AuthenticationService.register() — throws when the email already belongs to a legacy account (no emailConfirmed field)', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	// Predates this feature - emailConfirmed is absent, not false, and must be treated as confirmed
	await repository.add('user', { data: { name: 'Existing', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'BadRequestError' }
	)
})

test('AuthenticationService.register() — replaces an unconfirmed account with the same email instead of rejecting it', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	const oldUser = await repository.add('user', {
		data: { name: 'First Try', email: 'ada@example.com', password: 'old-hash', role: '64b0c0ffee1234567890abcd', emailConfirmed: false }
	})
	const oldCode = await repository.add('confirmation_code', {
		data: {
			user: String(oldUser._id), purpose: 'registration', codeHash: 'irrelevant', medium: 'email',
			expiresAt: luxon.DateTime.now().setZone('utc').minus({ minutes: 10 }).toJSDate(),
			used: false, attempts: 0
		}
	})
	// Mock add() always stamps createdAt to "now" - backdate it past the cooldown via update()
	await repository.update('confirmation_code', { id: oldCode._id, data: { createdAt: luxon.DateTime.now().setZone('utc').minus({ hours: 1 }).toJSDate() } })
	const service = AuthenticationService.getInstance()

	const result = await service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } })

	assert.notEqual(String(result.user._id), String(oldUser._id))

	const users = await repository.list('user', { query: { email: 'ada@example.com' } })
	assert.equal(users.count, 1)
	assert.equal(String(users.records[0]._id), String(result.user._id))

	// The old account's confirmation codes are gone with it
	const oldCodes = await repository.list('confirmation_code', { query: { user: String(oldUser._id) } })
	assert.equal(oldCodes.count, 0)
})

test('AuthenticationService.register() — throws 429 when replacing an unconfirmed account too soon after its last code', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	const oldUser = await repository.add('user', {
		data: { name: 'First Try', email: 'ada@example.com', password: 'old-hash', role: '64b0c0ffee1234567890abcd', emailConfirmed: false }
	})
	// createdAt just now - well within CONFIRMATION_CODE_RESEND_COOLDOWN's 60s default
	await repository.add('confirmation_code', {
		data: {
			user: String(oldUser._id), purpose: 'registration', codeHash: 'irrelevant', medium: 'email',
			expiresAt: luxon.DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false, attempts: 0
		}
	})
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'TooManyRequestsError' }
	)

	// Nothing was replaced - the old account is still there, untouched
	const users = await repository.list('user', { query: { email: 'ada@example.com' } })
	assert.equal(users.count, 1)
	assert.equal(String(users.records[0]._id), String(oldUser._id))
})

test('AuthenticationService.register() — throws when no default role is configured', async () => {
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'InternalServerError' }
	)
})

test('AuthenticationService.login() — returns tokens and the user on valid credentials', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const service = AuthenticationService.getInstance()

	const result = await service.login({ body: { email: 'ada@example.com', password: 'Sup3rSecret!' } })

	assert.equal(typeof result.token, 'string')
	assert.equal(typeof result.refreshToken, 'string')
	assert.notEqual(result.token, result.refreshToken)
	assert.equal(result.user.name, 'Ada')
	assert.equal(result.user.email, 'ada@example.com')
	assert.equal(result.user.password, undefined)

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, result.token)
	assert.equal(sessions.records[0].refreshToken, result.refreshToken)
})

test('AuthenticationService.login() — throws when the email does not exist', async () => {
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.login({ body: { email: 'missing@example.com', password: 'whatever' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.login() — throws when the password is wrong', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.login({ body: { email: 'ada@example.com', password: 'WrongPassword!' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.login() — evicts the oldest session once the role\'s maxSessions is reached', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	const role = await repository.add('role', { data: { name: 'user', active: true, maxSessions: 1 } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: String(role._id) } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'old-access-token',
			accessTokenExpiresAt: luxon.DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'old-refresh-token',
			refreshTokenExpiresAt: luxon.DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	const result = await service.login({ body: { email: 'ada@example.com', password: 'Sup3rSecret!' } })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, result.token)
})

test('AuthenticationService.login() — throws 403 when the account is deactivated', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd', active: false } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.login({ body: { email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'ForbiddenError' }
	)
})

test('AuthenticationService.login() — throws 403 with a distinct message when the email is not confirmed', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd', emailConfirmed: false } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.login({ body: { email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		(error) => {
			assert.equal(error.name, 'ForbiddenError')
			assert.notEqual(error.message, 'Account is deactivated.')
			return true
		}
	)
})

test('AuthenticationService.login() — writes a LoginRecord on success', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const service = AuthenticationService.getInstance()

	await service.login({ body: { email: 'ada@example.com', password: 'Sup3rSecret!' }, ip: '127.0.0.1', userAgent: 'test-agent' })

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 1)
	assert.equal(records.records[0].result, 'success')
	assert.equal(records.records[0].method, 'password')
	assert.equal(String(records.records[0].user), String(user._id))
	assert.equal(records.records[0].ip, '127.0.0.1')
	assert.equal(records.records[0].userAgent, 'test-agent')
})

test('AuthenticationService.login() — writes a LoginRecord on failure, even against an email with no account', async () => {
	const repository = MockRepository.getInstance()
	const service = AuthenticationService.getInstance()

	await assert.rejects(() => service.login({ body: { email: 'missing@example.com', password: 'whatever' } }))

	const records = await repository.list('login_record', { query: { email: 'missing@example.com' } })
	assert.equal(records.count, 1)
	assert.equal(records.records[0].result, 'failed')
	assert.equal(records.records[0].user, undefined)
})

test('AuthenticationService.login() — caps LoginRecords per email at LOGIN_RECORD_MAX_PER_EMAIL', async () => {
	const repository = MockRepository.getInstance()
	const service = AuthenticationService.getInstance()

	for (let i = 0; i < 12; i++) {
		await assert.rejects(() => service.login({ body: { email: 'flood@example.com', password: 'whatever' } }))
	}

	const records = await repository.list('login_record', { query: { email: 'flood@example.com' } })
	assert.equal(records.count, 10)
})

test('AuthenticationService.refresh() — rotates the tokens and returns the user on a valid refresh token', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'old-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'old-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	const result = await service.refresh({ body: { refreshToken: 'old-refresh-token' } })

	assert.equal(typeof result.token, 'string')
	assert.equal(typeof result.refreshToken, 'string')
	assert.notEqual(result.refreshToken, 'old-refresh-token')
	assert.equal(result.user.name, 'Ada')
	assert.equal(result.user.email, 'ada@example.com')
	assert.equal(result.user.password, undefined)

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, result.token)
	assert.equal(sessions.records[0].refreshToken, result.refreshToken)
})

test('AuthenticationService.refresh() — throws when the refresh token does not exist', async () => {
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.refresh({ body: { refreshToken: 'missing-token' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.refresh() — throws when the refresh token has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'old-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').minus({ days: 1 }).toJSDate(),
			refreshToken: 'expired-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').minus({ days: 1 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.refresh({ body: { refreshToken: 'expired-refresh-token' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.validate() — returns the user for a valid, non-expired access token', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const role = await repository.add('role', { data: { name: 'admin', active: true } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'valid-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'some-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	const result = await service.validate({ body: { token: 'valid-access-token' } })

	assert.equal(result.user.name, 'Ada')
	assert.equal(result.user.email, 'ada@example.com')
	// role must resolve to its name, not the raw id stored on the User document - this is the
	// contract other services (e.g. cv-service) authorize off
	assert.equal(result.user.role, 'admin')
	assert.equal(result.user.password, undefined)
})

test('AuthenticationService.validate() — throws when the access token does not exist', async () => {
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.validate({ body: { token: 'missing-token' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.validate() — throws when the access token has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'expired-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').minus({ minutes: 1 }).toJSDate(),
			refreshToken: 'some-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.validate({ body: { token: 'expired-access-token' } }),
		{ name: 'UnauthorizedError' }
	)
})

test('AuthenticationService.logout() — revokes the session matching the access token', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'active-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'active-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AuthenticationService.getInstance()

	const result = await service.logout({ authorizationHeader: 'Bearer active-access-token' })

	assert.equal(result, null)
	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 0)
})

test('AuthenticationService.logout() — is idempotent when the session is already gone', async () => {
	const service = AuthenticationService.getInstance()

	const result = await service.logout({ authorizationHeader: 'Bearer already-revoked-token' })

	assert.equal(result, null)
})

test('AuthenticationService.logout() — throws when the Authorization header is missing', async () => {
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.logout({ authorizationHeader: undefined }),
		{ name: 'UnauthorizedError' }
	)
})
