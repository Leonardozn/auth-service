const { test } = require('node:test')
const assert = require('node:assert/strict')
const ExtractBearerToken = require('../../../../src/services/commands/extractBearerToken')

test('ExtractBearerToken — extracts the token from a well-formed header', () => {
	const command = ExtractBearerToken.getInstance()

	const token = command.execute({ authorizationHeader: 'Bearer abc123' })

	assert.equal(token, 'abc123')
})

test('ExtractBearerToken — is case-insensitive on the "Bearer" scheme', () => {
	const command = ExtractBearerToken.getInstance()

	const token = command.execute({ authorizationHeader: 'bearer abc123' })

	assert.equal(token, 'abc123')
})

test('ExtractBearerToken — throws when the header is missing', () => {
	const command = ExtractBearerToken.getInstance()

	assert.throws(() => command.execute({ authorizationHeader: undefined }), { name: 'UnauthorizedError' })
})

test('ExtractBearerToken — throws when the header has no Bearer scheme', () => {
	const command = ExtractBearerToken.getInstance()

	assert.throws(() => command.execute({ authorizationHeader: 'abc123' }), { name: 'UnauthorizedError' })
})
