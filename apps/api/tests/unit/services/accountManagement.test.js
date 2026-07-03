const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const MockEmailManager = require('../../support/mock-email-manager-preload')
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
	const mockEmail = MockEmailManager.getInstance()
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
	const mockEmail = MockEmailManager.getInstance()
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
	const mockEmail = MockEmailManager.getInstance()
	mockEmail.send = async () => { throw new Error('Resend is down') }
	const service = AccountManagementService.getInstance()

	const result = await service.forgotPassword({ body: { email: 'ada@example.com' } })

	assert.equal(result, null)
	const tokens = await repository.list('password_reset_token', { query: {} })
	assert.equal(tokens.count, 1)
})

test('AccountManagementService.resetPassword() — updates the password, marks the token used, and revokes all sessions', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'old-hash', role: '64b0c0ffee1234567890abcd' } })
	const resetToken = await repository.add('password_reset_token', {
		data: {
			user: String(user._id),
			token: 'valid-reset-token',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 30 }).toJSDate(),
			used: false
		}
	})
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'active-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'active-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = AccountManagementService.getInstance()

	const result = await service.resetPassword({ body: { token: 'valid-reset-token', newPassword: 'NewSecret!' } })

	assert.equal(result, null)

	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const updatedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(dataEncryptHandler.verify('NewSecret!', updatedUser.records[0].password), true)

	const updatedToken = await repository.list('password_reset_token', { query: { _id: resetToken._id } })
	assert.equal(updatedToken.records[0].used, true)

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 0)
})

test('AccountManagementService.resetPassword() — throws when the token does not exist', async () => {
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.resetPassword({ body: { token: 'missing-token', newPassword: 'NewSecret!' } }),
		{ name: 'BadRequestError' }
	)
})

test('AccountManagementService.resetPassword() — throws when the token was already used', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'old-hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('password_reset_token', {
		data: {
			user: String(user._id),
			token: 'used-reset-token',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 30 }).toJSDate(),
			used: true
		}
	})
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.resetPassword({ body: { token: 'used-reset-token', newPassword: 'NewSecret!' } }),
		{ name: 'BadRequestError' }
	)
})

test('AccountManagementService.editProfile() — updates name/email for the account owner', async () => {
	const repository = MockRepository.getInstance()
	const { user } = await seedUserWithSession(repository)
	const service = AccountManagementService.getInstance()

	const result = await service.editProfile({
		id: String(user._id),
		body: { name: 'Ada Updated', email: 'ada-updated@example.com' },
		authorizationHeader: 'Bearer current-access-token'
	})

	assert.equal(result.name, 'Ada Updated')
	assert.equal(result.email, 'ada-updated@example.com')
})

test('AccountManagementService.editProfile() — allows an admin to edit another account', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	await repository.add('role', { data: { name: 'admin', active: true } })
	const adminRole = await repository.list('role', { query: { name: 'admin' } })
	const admin = await repository.add('user', { data: { name: 'Root', email: 'root@example.com', password: dataEncryptHandler.encrypt('AdminSecret!'), role: String(adminRole.records[0]._id) } })
	await repository.add('session', {
		data: {
			user: String(admin._id),
			accessToken: 'admin-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'admin-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const { user } = await seedUserWithSession(repository)
	const service = AccountManagementService.getInstance()

	const result = await service.editProfile({
		id: String(user._id),
		body: { name: 'Edited By Admin' },
		authorizationHeader: 'Bearer admin-access-token'
	})

	assert.equal(result.name, 'Edited By Admin')
})

test('AccountManagementService.editProfile() — throws 403 when editing another account without admin', async () => {
	const repository = MockRepository.getInstance()
	const { user } = await seedUserWithSession(repository)
	const other = await repository.add('user', { data: { name: 'Bob', email: 'bob@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	assert.notEqual(String(user._id), String(other._id))
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.editProfile({
			id: String(other._id),
			body: { name: 'Hijacked' },
			authorizationHeader: 'Bearer current-access-token'
		}),
		{ name: 'ForbiddenError' }
	)
})

test('AccountManagementService.editProfile() — throws when the new email is already taken', async () => {
	const repository = MockRepository.getInstance()
	const { user } = await seedUserWithSession(repository)
	await repository.add('user', { data: { name: 'Bob', email: 'bob@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.editProfile({
			id: String(user._id),
			body: { email: 'bob@example.com' },
			authorizationHeader: 'Bearer current-access-token'
		}),
		{ name: 'BadRequestError' }
	)
})

test('AccountManagementService.editProfile() — ignores an "active" change from a non-admin editing themselves', async () => {
	const repository = MockRepository.getInstance()
	const { user } = await seedUserWithSession(repository)
	const service = AccountManagementService.getInstance()

	const result = await service.editProfile({
		id: String(user._id),
		body: { active: false },
		authorizationHeader: 'Bearer current-access-token'
	})

	assert.equal(result.active, undefined)
})

test('AccountManagementService.editProfile() — allows an admin to reactivate another account', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	await repository.add('role', { data: { name: 'admin', active: true } })
	const adminRole = await repository.list('role', { query: { name: 'admin' } })
	const admin = await repository.add('user', { data: { name: 'Root', email: 'root@example.com', password: dataEncryptHandler.encrypt('AdminSecret!'), role: String(adminRole.records[0]._id) } })
	await repository.add('session', {
		data: {
			user: String(admin._id),
			accessToken: 'admin-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'admin-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const other = await repository.add('user', { data: { name: 'Bob', email: 'bob@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd', active: false } })
	const service = AccountManagementService.getInstance()

	const result = await service.editProfile({
		id: String(other._id),
		body: { active: true },
		authorizationHeader: 'Bearer admin-access-token'
	})

	assert.equal(result.active, true)
})

test('AccountManagementService.deactivateAccount() — deactivates the caller\'s own account and revokes its sessions/reset tokens', async () => {
	const repository = MockRepository.getInstance()
	const { user } = await seedUserWithSession(repository)
	await repository.add('password_reset_token', { data: { user: String(user._id), token: 'leftover-token', expiresAt: new Date(), used: false } })
	const service = AccountManagementService.getInstance()

	const result = await service.deactivateAccount({ authorizationHeader: 'Bearer current-access-token' })

	assert.equal(result.active, false)

	const remainingSessions = await repository.list('session', { query: { user: String(user._id) } })
	assert.equal(remainingSessions.count, 0)
	const remainingTokens = await repository.list('password_reset_token', { query: { user: String(user._id) } })
	assert.equal(remainingTokens.count, 0)
})

test('AccountManagementService.deactivateAccount() — throws when the Authorization header is missing', async () => {
	const service = AccountManagementService.getInstance()

	await assert.rejects(
		() => service.deactivateAccount({ authorizationHeader: undefined }),
		{ name: 'UnauthorizedError' }
	)
})
