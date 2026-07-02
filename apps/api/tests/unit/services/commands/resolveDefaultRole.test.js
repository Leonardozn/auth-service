const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const ResolveDefaultRole = require('../../../../src/services/commands/resolveDefaultRole')

beforeEach(() => {
	MockRepository.reset()
})

test('ResolveDefaultRole — returns the active role matching the given name', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	const command = ResolveDefaultRole.getInstance()

	const role = await command.execute({ repository, roleName: 'user' })

	assert.equal(role.name, 'user')
	assert.equal(role.active, true)
})

test('ResolveDefaultRole — throws when no role matches the given name', async () => {
	const repository = MockRepository.getInstance()
	const command = ResolveDefaultRole.getInstance()

	await assert.rejects(() => command.execute({ repository, roleName: 'user' }), { name: 'InternalServerError' })
})

test('ResolveDefaultRole — ignores an inactive role with the same name', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: false } })
	const command = ResolveDefaultRole.getInstance()

	await assert.rejects(() => command.execute({ repository, roleName: 'user' }), { name: 'InternalServerError' })
})
