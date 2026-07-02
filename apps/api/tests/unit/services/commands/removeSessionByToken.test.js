const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const RemoveSessionByToken = require('../../../../src/services/commands/removeSessionByToken')

beforeEach(() => {
	MockRepository.reset()
})

test('RemoveSessionByToken — deletes the session matching the given token', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('session', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			accessToken: 'access-token',
			accessTokenExpiresAt: new Date(),
			refreshToken: 'refresh-token',
			refreshTokenExpiresAt: new Date()
		}
	})
	const command = RemoveSessionByToken.getInstance()

	const result = await command.execute({ repository, tokenField: 'accessToken', token: 'access-token' })

	assert.equal(result.deletedCount, 1)
	const remaining = await repository.list('session', { query: {} })
	assert.equal(remaining.count, 0)
})

test('RemoveSessionByToken — is idempotent when no session matches', async () => {
	const repository = MockRepository.getInstance()
	const command = RemoveSessionByToken.getInstance()

	const result = await command.execute({ repository, tokenField: 'accessToken', token: 'missing-token' })

	assert.equal(result.deletedCount, 0)
})
