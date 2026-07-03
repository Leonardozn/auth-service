const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const RequireAdminUser = require('../../../../src/services/commands/requireAdminUser')

beforeEach(() => {
	MockRepository.reset()
})

test('RequireAdminUser — resolves when the given user has the admin role', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'admin', active: true } })
	const user = await repository.add('user', { data: { name: 'Admin', email: 'admin@test.com', password: 'hash', role: String(role._id), active: true } })
	const command = RequireAdminUser.getInstance()

	await assert.doesNotReject(() => command.execute({ repository, userId: String(user._id) }))
})

test('RequireAdminUser — throws when the given user has a non-admin role', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true } })
	const user = await repository.add('user', { data: { name: 'Regular', email: 'user@test.com', password: 'hash', role: String(role._id), active: true } })
	const command = RequireAdminUser.getInstance()

	await assert.rejects(() => command.execute({ repository, userId: String(user._id) }), { name: 'ForbiddenError' })
})

test('RequireAdminUser — throws when the given user does not exist', async () => {
	const repository = MockRepository.getInstance()
	const command = RequireAdminUser.getInstance()

	await assert.rejects(() => command.execute({ repository, userId: '507f1f77bcf86cd799439011' }), { name: 'ForbiddenError' })
})
