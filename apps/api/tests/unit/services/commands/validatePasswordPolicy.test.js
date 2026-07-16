const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BadRequestError } = require('../../../../src/handlers/handleErrors')
const ValidatePasswordPolicy = require('../../../../src/services/commands/validatePasswordPolicy')

test('ValidatePasswordPolicy — accepts a password meeting every requirement', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.doesNotThrow(() => command.execute({ password: 'Abcdef1!' }))
})

test('ValidatePasswordPolicy — accepts every allowed special character', () => {
	const command = ValidatePasswordPolicy.getInstance()
	const specials = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'

	for (const ch of specials) {
		assert.doesNotThrow(
			() => command.execute({ password: 'Abcdef1' + ch }),
			`should accept special character "${ch}"`
		)
	}
})

test('ValidatePasswordPolicy — rejects a password shorter than 8 characters', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.throws(() => command.execute({ password: 'Ab1!' }), BadRequestError)
})

test('ValidatePasswordPolicy — rejects a password with no uppercase letter', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.throws(() => command.execute({ password: 'abcdefg1!' }), BadRequestError)
})

test('ValidatePasswordPolicy — rejects a password with no digit', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.throws(() => command.execute({ password: 'Abcdefgh!' }), BadRequestError)
})

test('ValidatePasswordPolicy — rejects a password with no special character', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.throws(() => command.execute({ password: 'Abcdefg1' }), BadRequestError)
})

test('ValidatePasswordPolicy — rejects an empty or missing password', () => {
	const command = ValidatePasswordPolicy.getInstance()

	assert.throws(() => command.execute({ password: '' }), BadRequestError)
	assert.throws(() => command.execute({}), BadRequestError)
})
