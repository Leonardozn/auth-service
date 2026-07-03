const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const FindUserById = require('../../../../src/services/commands/findUserById')

beforeEach(() => {
	MockRepository.reset()
})

test('FindUserById — returns the raw user, including the password hash', async () => {
	const repository = MockRepository.getInstance()
	const created = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hashed-value', role: '64b0c0ffee1234567890abcd' } })
	const command = FindUserById.getInstance()

	const user = await command.execute({ repository, id: created._id })

	assert.equal(user.email, 'ada@example.com')
	assert.equal(user.password, 'hashed-value')
})

test('FindUserById — throws when no user matches the id', async () => {
	const repository = MockRepository.getInstance()
	const command = FindUserById.getInstance()

	await assert.rejects(
		() => command.execute({ repository, id: '64b0c0ffee1234567890abcd' }),
		{ name: 'BadRequestError' }
	)
})
