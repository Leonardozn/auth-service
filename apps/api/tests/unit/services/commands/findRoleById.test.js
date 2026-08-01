const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const FindRoleById = require('../../../../src/services/commands/findRoleById')

beforeEach(() => {
	MockRepository.reset()
})

test('FindRoleById — returns the full role document, including permissions', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', {
		data: { name: 'editor', active: true, permissions: [{ resource: 'curriculum', read: true, write: false }] }
	})
	const command = FindRoleById.getInstance()

	const result = await command.execute({ repository, roleId: String(role._id) })

	assert.equal(result.name, 'editor')
	assert.deepEqual(result.permissions, [{ resource: 'curriculum', read: true, write: false }])
})

test('FindRoleById — returns null when roleId is unset', async () => {
	const repository = MockRepository.getInstance()
	const command = FindRoleById.getInstance()

	const result = await command.execute({ repository, roleId: undefined })

	assert.equal(result, null)
})

test('FindRoleById — returns null when the role no longer exists', async () => {
	const repository = MockRepository.getInstance()
	const command = FindRoleById.getInstance()

	const result = await command.execute({ repository, roleId: '64b0c0ffee1234567890abcd' })

	assert.equal(result, null)
})
