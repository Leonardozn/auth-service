const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const AuthenticationService = require('../../../src/services/authentication')

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
	assert.notEqual(result.user.password, 'Sup3rSecret!')
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
