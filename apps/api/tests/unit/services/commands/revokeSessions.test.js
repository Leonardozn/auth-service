const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const RevokeSessions = require('../../../../src/services/commands/revokeSessions')

beforeEach(() => {
	MockRepository.reset()
})

test('RevokeSessions — removes every session for the user except the one excluded', async () => {
	const repository = MockRepository.getInstance()
	const userId = '64b0c0ffee1234567890abcd'
	const kept = await repository.add('session', { data: { user: userId, accessToken: 'keep', accessTokenExpiresAt: new Date(), refreshToken: 'keep-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-1', accessTokenExpiresAt: new Date(), refreshToken: 'drop-1-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-2', accessTokenExpiresAt: new Date(), refreshToken: 'drop-2-r', refreshTokenExpiresAt: new Date() } })
	const command = RevokeSessions.getInstance()

	const result = await command.execute({ repository, userId, exceptSessionId: kept._id })

	assert.equal(result.revokedCount, 2)
	const remaining = await repository.list('session', { query: {} })
	assert.equal(remaining.count, 1)
	assert.equal(remaining.records[0].accessToken, 'keep')
})

test('RevokeSessions — removes all sessions when no exception is given', async () => {
	const repository = MockRepository.getInstance()
	const userId = '64b0c0ffee1234567890abcd'
	await repository.add('session', { data: { user: userId, accessToken: 'drop-1', accessTokenExpiresAt: new Date(), refreshToken: 'drop-1-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-2', accessTokenExpiresAt: new Date(), refreshToken: 'drop-2-r', refreshTokenExpiresAt: new Date() } })
	const command = RevokeSessions.getInstance()

	const result = await command.execute({ repository, userId })

	assert.equal(result.revokedCount, 2)
	const remaining = await repository.list('session', { query: {} })
	assert.equal(remaining.count, 0)
})
