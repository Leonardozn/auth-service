const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const CheckEmailAvailable = require('../../../../src/services/commands/checkEmailAvailable')

beforeEach(() => {
	MockRepository.reset()
})

test('CheckEmailAvailable — resolves when no user has the email', async () => {
	const repository = MockRepository.getInstance()
	const command = CheckEmailAvailable.getInstance()

	await assert.doesNotReject(() => command.execute({ repository, email: 'new@example.com' }))
})

test('CheckEmailAvailable — throws when a user already has the email', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('user', { data: { name: 'Existing', email: 'taken@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const command = CheckEmailAvailable.getInstance()

	await assert.rejects(() => command.execute({ repository, email: 'taken@example.com' }), { name: 'BadRequestError' })
})

test('CheckEmailAvailable — ignores the excluded user id', async () => {
	const repository = MockRepository.getInstance()
	const created = await repository.add('user', { data: { name: 'Self', email: 'self@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const command = CheckEmailAvailable.getInstance()

	await assert.doesNotReject(() => command.execute({ repository, email: 'self@example.com', excludeUserId: created._id }))
})
