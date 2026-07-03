const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const MockEmailResend = require('../../support/mock-email-resend-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const AccountManagementService = require('../../../src/services/accountManagement')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

async function seedUserWithSession(repository, { password = 'Sup3rSecret!' } = {}) {
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: dataEncryptHandler.encrypt(password), role: '64b0c0ffee1234567890abcd' } })
	const session = await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	return { user, session }
}

test('AccountManagementService.changePassword() — updates the password and revokes other sessions', async () => {
	const repository = MockRepository.getInstance()
	const { user, session } = await seedUserWithSession(repository)
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'other-access-token',
			accessTokenExpiresAt: new Date(),
			refreshToken: 'other-refresh-token',
			refreshTokenExpiresAt: new Date()
		}
	})
	const service = AccountManagementService.getInstance()

	const result = await service.changePassword({
		body: { currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret!' },
		authorizationHeader: 'Bearer current-access-token'
	})

	assert.equal(result, null)

	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const updatedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(dataEncryptHandler.verify('NewSecret!', updatedUser.records[0].password), true)

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0]._id, session._id)
})

test('AccountManagementService.changePassword() — throws when the current password is wrong', async () => {
	const repository = MockRepository.getInstance()
	await seedUserWithSession(repository)
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.changePassword({
			body: { currentPassword: 'WrongPassword!', newPassword: 'NewSecret!' },
			authorizationHeader: 'Bearer current-access-token'
		}),
		{ name: 'UnauthorizedError' }
	)
})

test('AccountManagementService.changePassword() — throws when the Authorization header is missing', async () => {
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.changePassword({ body: { currentPassword: 'a', newPassword: 'b' }, authorizationHeader: undefined }),
		{ name: 'UnauthorizedError' }
	)
})

test('AccountManagementService.changePassword() — throws when the access token is invalid', async () => {
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.changePassword({ body: { currentPassword: 'a', newPassword: 'b' }, authorizationHeader: 'Bearer missing-token' }),
		{ name: 'UnauthorizedError' }
	)
})

test('AccountManagementService.forgotPassword() — creates a reset token and emails it when the user exists', async () => {
	const repository = MockRepository.getInstance()
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const mockEmail = MockEmailResend.getInstance()
	let capturedSend
	mockEmail.send = async (config) => { capturedSend = config; return { id: 'mock-email-id' } }
	const service = AccountManagementService.getInstance()

	const result = await service.forgotPassword({ body: { email: 'ada@example.com' } })

	assert.equal(result, null)
	assert.equal(capturedSend.to, 'ada@example.com')
	assert.match(capturedSend.html, /reset-password\?token=/)

	const tokens = await repository.list('password_reset_token', { query: {} })
	assert.equal(tokens.count, 1)
	assert.equal(tokens.records[0].user, String(user._id))
	assert.equal(tokens.records[0].used, false)
})

test('AccountManagementService.forgotPassword() — responds successfully without creating a token when the email is unknown', async () => {
	const repository = MockRepository.getInstance()
	const mockEmail = MockEmailResend.getInstance()
	let sendCalled = false
	mockEmail.send = async () => { sendCalled = true; return { id: 'mock-email-id' } }
	const service = AccountManagementService.getInstance()

	const result = await service.forgotPassword({ body: { email: 'missing@example.com' } })

	assert.equal(result, null)
	assert.equal(sendCalled, false)
	const tokens = await repository.list('password_reset_token', { query: {} })
	assert.equal(tokens.count, 0)
})

test('AccountManagementService.forgotPassword() — still responds successfully when the email fails to send', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const mockEmail = MockEmailResend.getInstance()
	mockEmail.send = async () => { throw new Error('Resend is down') }
	const service = AccountManagementService.getInstance()

	const result = await service.forgotPassword({ body: { email: 'ada@example.com' } })

	assert.equal(result, null)
	const tokens = await repository.list('password_reset_token', { query: {} })
	assert.equal(tokens.count, 1)
})
