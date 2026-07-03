const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const EnforceSessionLimit = require('../../../../src/services/commands/enforceSessionLimit')

beforeEach(() => {
	MockRepository.reset()
})

async function addSession(repository, { user, accessToken }) {
	return repository.add('session', {
		data: {
			user,
			accessToken,
			accessTokenExpiresAt: new Date(),
			refreshToken: `${accessToken}-refresh`,
			refreshTokenExpiresAt: new Date()
		}
	})
}

test('EnforceSessionLimit — does nothing when the role has no maxSessions configured', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	await addSession(repository, { user: String(user._id), accessToken: 'token-1' })
	const command = EnforceSessionLimit.getInstance()

	await command.execute({ repository, userId: String(user._id), roleId: String(role._id) })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
})

test('EnforceSessionLimit — does nothing when the user is still under the limit', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true, maxSessions: 3 } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	await addSession(repository, { user: String(user._id), accessToken: 'token-1' })
	const command = EnforceSessionLimit.getInstance()

	await command.execute({ repository, userId: String(user._id), roleId: String(role._id) })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
})

test('EnforceSessionLimit — evicts the oldest session once the limit is reached', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true, maxSessions: 2 } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	const oldest = await addSession(repository, { user: String(user._id), accessToken: 'token-1' })
	await new Promise(resolve => setTimeout(resolve, 5))
	await addSession(repository, { user: String(user._id), accessToken: 'token-2' })
	const command = EnforceSessionLimit.getInstance()

	await command.execute({ repository, userId: String(user._id), roleId: String(role._id) })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, 'token-2')
	assert.notEqual(sessions.records[0]._id, oldest._id)
})

test('EnforceSessionLimit — evicts as many sessions as needed to make room for exactly one more', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true, maxSessions: 1 } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	await addSession(repository, { user: String(user._id), accessToken: 'token-1' })
	await new Promise(resolve => setTimeout(resolve, 5))
	await addSession(repository, { user: String(user._id), accessToken: 'token-2' })
	const command = EnforceSessionLimit.getInstance()

	await command.execute({ repository, userId: String(user._id), roleId: String(role._id) })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 0)
})

test('EnforceSessionLimit — is a no-op when the role id does not resolve to a role', async () => {
	const repository = MockRepository.getInstance()
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await addSession(repository, { user: String(user._id), accessToken: 'token-1' })
	const command = EnforceSessionLimit.getInstance()

	await command.execute({ repository, userId: String(user._id), roleId: '64b0c0ffee1234567890abcd' })

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
})
