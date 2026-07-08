const { test } = require('node:test')
const assert = require('node:assert/strict')
const GenerateNumericCode = require('../../../../src/services/commands/generateNumericCode')

test('GenerateNumericCode — returns a 6-digit numeric string by default', () => {
	const command = GenerateNumericCode.getInstance()

	const code = command.execute()

	assert.equal(typeof code, 'string')
	assert.equal(code.length, 6)
	assert.match(code, /^[0-9]{6}$/)
})

test('GenerateNumericCode — zero-pads codes shorter than the requested digit count', () => {
	const command = GenerateNumericCode.getInstance()

	for (let i = 0; i < 50; i++) {
		const code = command.execute()
		assert.equal(code.length, 6)
	}
})

test('GenerateNumericCode — honors a custom digit count', () => {
	const command = GenerateNumericCode.getInstance()

	const code = command.execute({ digits: 4 })

	assert.equal(code.length, 4)
	assert.match(code, /^[0-9]{4}$/)
})
