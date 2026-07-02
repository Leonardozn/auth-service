const { test } = require('node:test')
const assert = require('node:assert/strict')
const DataEncryptHandler = require('../../../../src/handlers/dataEncrypt')
const VerifyPassword = require('../../../../src/services/commands/verifyPassword')

test('VerifyPassword — returns true when the password matches the hash', () => {
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hash = dataEncryptHandler.encrypt('Sup3rSecret!')
	const command = VerifyPassword.getInstance()

	const result = command.execute({ dataEncryptHandler, password: 'Sup3rSecret!', hash })

	assert.equal(result, true)
})

test('VerifyPassword — returns false when the password does not match', () => {
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hash = dataEncryptHandler.encrypt('Sup3rSecret!')
	const command = VerifyPassword.getInstance()

	const result = command.execute({ dataEncryptHandler, password: 'WrongPassword!', hash })

	assert.equal(result, false)
})
