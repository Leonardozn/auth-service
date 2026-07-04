const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const AuthenticationService = require('../../../src/services/authentication')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('AuthenticationService.register() — creates a user with the default role and a hashed password', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	const service = AuthenticationService.getInstance()

	const result = await service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } })

	assert.equal(result.user.name, 'Ada')
	assert.equal(result.user.email, 'ada@example.com')
	assert.equal(result.user.password, undefined)
	assert.ok(result.user.role)
})

test('AuthenticationService.register() — throws when the email is already registered', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	await repository.add('user', { data: { name: 'Existing', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const service = AuthenticationService.getInstance()

	await assert.rejects(
		() => service.register({ body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }),
		{ name: 'BadRequestError' }
	)
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
