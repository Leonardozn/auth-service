const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../../src/handlers/dataEncrypt')
const VerifyCredentials = require('../../../../src/services/commands/verifyCredentials')

beforeEach(() => {
	MockRepository.reset()
})

test('VerifyCredentials — returns the user when the email and password match', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const command = VerifyCredentials.getInstance()

	const user = await command.execute({ repository, dataEncryptHandler, email: 'ada@example.com', password: 'Sup3rSecret!' })

	assert.equal(user.email, 'ada@example.com')
})

test('VerifyCredentials — throws when the email does not exist', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const command = VerifyCredentials.getInstance()

	await assert.rejects(
		() => command.execute({ repository, dataEncryptHandler, email: 'missing@example.com', password: 'whatever' }),
		{ name: 'UnauthorizedError' }
	)
})

test('VerifyCredentials — throws when the password does not match', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const command = VerifyCredentials.getInstance()

	await assert.rejects(
		() => command.execute({ repository, dataEncryptHandler, email: 'ada@example.com', password: 'WrongPassword!' }),
		{ name: 'UnauthorizedError' }
	)
})
