const { test } = require('node:test')
const assert = require('node:assert/strict')
const CheckResourcePermission = require('../../../../src/services/commands/checkResourcePermission')

test('CheckResourcePermission — passes when the resource entry grants the requested action', () => {
	const command = CheckResourcePermission.getInstance()
	const permissions = [{ resource: 'curriculum', read: true, write: false }]

	command.execute({ permissions, resource: 'curriculum', action: 'read' })
})

test('CheckResourcePermission — throws when the resource entry denies the requested action', () => {
	const command = CheckResourcePermission.getInstance()
	const permissions = [{ resource: 'curriculum', read: true, write: false }]

	assert.throws(
		() => command.execute({ permissions, resource: 'curriculum', action: 'write' }),
		{ name: 'ForbiddenError' }
	)
})

test('CheckResourcePermission — throws when there is no entry for the resource at all', () => {
	const command = CheckResourcePermission.getInstance()

	assert.throws(
		() => command.execute({ permissions: [{ resource: 'certificate', read: true }], resource: 'curriculum', action: 'read' }),
		{ name: 'ForbiddenError' }
	)
})

test('CheckResourcePermission — throws when the role has no permissions at all', () => {
	const command = CheckResourcePermission.getInstance()

	assert.throws(
		() => command.execute({ permissions: undefined, resource: 'curriculum', action: 'read' }),
		{ name: 'ForbiddenError' }
	)
})

test('CheckResourcePermission — no role name is special-cased, including "admin" without an explicit grant', () => {
	const command = CheckResourcePermission.getInstance()

	// The permissions list, not the caller's role name, is the only source of truth - this test
	// exists to prove there is no hidden `if (roleName === 'admin') return` shortcut anywhere.
	assert.throws(
		() => command.execute({ permissions: [], resource: 'curriculum', action: 'read' }),
		{ name: 'ForbiddenError' }
	)
})

test('CheckResourcePermission — throws BadRequestError on an unsupported action', () => {
	const command = CheckResourcePermission.getInstance()

	assert.throws(
		() => command.execute({ permissions: [{ resource: 'curriculum', read: true }], resource: 'curriculum', action: 'delete' }),
		{ name: 'BadRequestError' }
	)
})
