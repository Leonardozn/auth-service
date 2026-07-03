const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DeleteResourcesByUser = require('../../../../src/services/commands/deleteResourcesByUser')

beforeEach(() => {
	MockRepository.reset()
})

test('DeleteResourcesByUser — removes every session for the user except the one excluded', async () => {
	const repository = MockRepository.getInstance()
	const userId = '64b0c0ffee1234567890abcd'
	const kept = await repository.add('session', { data: { user: userId, accessToken: 'keep', accessTokenExpiresAt: new Date(), refreshToken: 'keep-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-1', accessTokenExpiresAt: new Date(), refreshToken: 'drop-1-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-2', accessTokenExpiresAt: new Date(), refreshToken: 'drop-2-r', refreshTokenExpiresAt: new Date() } })
	const command = DeleteResourcesByUser.getInstance()

	const result = await command.execute({ repository, schemaName: 'session', userId, exceptId: kept._id })

	assert.equal(result.deletedCount, 2)
	const remaining = await repository.list('session', { query: {} })
	assert.equal(remaining.count, 1)
	assert.equal(remaining.records[0].accessToken, 'keep')
})

test('DeleteResourcesByUser — removes all sessions when no exception is given', async () => {
	const repository = MockRepository.getInstance()
	const userId = '64b0c0ffee1234567890abcd'
	await repository.add('session', { data: { user: userId, accessToken: 'drop-1', accessTokenExpiresAt: new Date(), refreshToken: 'drop-1-r', refreshTokenExpiresAt: new Date() } })
	await repository.add('session', { data: { user: userId, accessToken: 'drop-2', accessTokenExpiresAt: new Date(), refreshToken: 'drop-2-r', refreshTokenExpiresAt: new Date() } })
	const command = DeleteResourcesByUser.getInstance()

	const result = await command.execute({ repository, schemaName: 'session', userId })

	assert.equal(result.deletedCount, 2)
	const remaining = await repository.list('session', { query: {} })
	assert.equal(remaining.count, 0)
})

test('DeleteResourcesByUser — works against a different schema (password_reset_token)', async () => {
	const repository = MockRepository.getInstance()
	const userId = '64b0c0ffee1234567890abcd'
	await repository.add('password_reset_token', { data: { user: userId, token: 'reset-1', expiresAt: new Date(), used: false } })
	await repository.add('password_reset_token', { data: { user: userId, token: 'reset-2', expiresAt: new Date(), used: false } })
	const command = DeleteResourcesByUser.getInstance()

	const result = await command.execute({ repository, schemaName: 'password_reset_token', userId })

	assert.equal(result.deletedCount, 2)
	const remaining = await repository.list('password_reset_token', { query: {} })
	assert.equal(remaining.count, 0)
})
