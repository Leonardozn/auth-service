const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const AuthorizeAccountAccess = require('../../../../src/services/commands/authorizeAccountAccess')

beforeEach(() => {
	MockRepository.reset()
})

test('AuthorizeAccountAccess — allows the account owner', async () => {
	const repository = MockRepository.getInstance()
	const command = AuthorizeAccountAccess.getInstance()

	await assert.doesNotReject(() => command.execute({ repository, sessionUserId: 'user-1', targetUserId: 'user-1' }))
})

test('AuthorizeAccountAccess — allows a user with the admin role acting on someone else', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'admin', active: true } })
	const admin = await repository.add('user', { data: { name: 'Root', email: 'root@example.com', password: 'hash', role: String(role._id) } })
	const command = AuthorizeAccountAccess.getInstance()

	await assert.doesNotReject(() => command.execute({ repository, sessionUserId: String(admin._id), targetUserId: 'someone-else' }))
})

test('AuthorizeAccountAccess — throws for a non-owner without the admin role', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	const command = AuthorizeAccountAccess.getInstance()

	await assert.rejects(
		() => command.execute({ repository, sessionUserId: String(user._id), targetUserId: 'someone-else' }),
		{ name: 'ForbiddenError' }
	)
})

test('AuthorizeAccountAccess — throws when the session user no longer exists', async () => {
	const repository = MockRepository.getInstance()
	const command = AuthorizeAccountAccess.getInstance()

	await assert.rejects(
		() => command.execute({ repository, sessionUserId: 'missing-user', targetUserId: 'someone-else' }),
		{ name: 'ForbiddenError' }
	)
})
