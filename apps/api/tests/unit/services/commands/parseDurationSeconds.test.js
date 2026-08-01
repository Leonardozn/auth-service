const { test } = require('node:test')
const assert = require('node:assert/strict')
const ParseDurationSeconds = require('../../../../src/services/commands/parseDurationSeconds')

test('ParseDurationSeconds — converts seconds', () => {
	const command = ParseDurationSeconds.getInstance()

	assert.equal(command.execute({ duration: '60s' }), 60)
})

test('ParseDurationSeconds — converts minutes', () => {
	const command = ParseDurationSeconds.getInstance()

	assert.equal(command.execute({ duration: '5m' }), 300)
})

test('ParseDurationSeconds — converts hours', () => {
	const command = ParseDurationSeconds.getInstance()

	assert.equal(command.execute({ duration: '2h' }), 7200)
})

test('ParseDurationSeconds — converts days', () => {
	const command = ParseDurationSeconds.getInstance()

	assert.equal(command.execute({ duration: '90d' }), 7776000)
})

test('ParseDurationSeconds — throws on an invalid duration format', () => {
	const command = ParseDurationSeconds.getInstance()

	assert.throws(() => command.execute({ duration: 'not-a-duration' }))
})
