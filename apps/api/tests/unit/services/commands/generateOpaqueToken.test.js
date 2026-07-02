const { test } = require('node:test')
const assert = require('node:assert/strict')
const GenerateOpaqueToken = require('../../../../src/services/commands/generateOpaqueToken')

test('GenerateOpaqueToken — returns a 64-char hex string by default (32 bytes)', () => {
	const command = GenerateOpaqueToken.getInstance()

	const token = command.execute()

	assert.equal(typeof token, 'string')
	assert.equal(token.length, 64)
	assert.match(token, /^[0-9a-f]+$/)
})

test('GenerateOpaqueToken — two calls produce different tokens', () => {
	const command = GenerateOpaqueToken.getInstance()

	const first = command.execute()
	const second = command.execute()

	assert.notEqual(first, second)
})

test('GenerateOpaqueToken — honors a custom byte length', () => {
	const command = GenerateOpaqueToken.getInstance()

	const token = command.execute({ bytes: 8 })

	assert.equal(token.length, 16)
})
