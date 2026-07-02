const { test } = require('node:test')
const assert = require('node:assert/strict')
const DataEncryptHandler = require('../../../../src/handlers/dataEncrypt')
const HashPassword = require('../../../../src/services/commands/hashPassword')

test('HashPassword — returns a hash that verifies against the plain-text password', async () => {
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const command = HashPassword.getInstance()

	const hashed = await command.execute({ dataEncryptHandler, password: 'Sup3rSecret!' })

	assert.notEqual(hashed, 'Sup3rSecret!')
	assert.equal(dataEncryptHandler.verify('Sup3rSecret!', hashed), true)
})

test('HashPassword — different calls produce different hashes for the same password', async () => {
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const command = HashPassword.getInstance()

	const first = await command.execute({ dataEncryptHandler, password: 'Sup3rSecret!' })
	const second = await command.execute({ dataEncryptHandler, password: 'Sup3rSecret!' })

	assert.notEqual(first, second)
})
