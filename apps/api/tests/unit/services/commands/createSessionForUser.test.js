const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const EnforceSessionLimit = require('../../../../src/services/commands/enforceSessionLimit')
const IssueTokenPair = require('../../../../src/services/commands/issueTokenPair')
const GenerateOpaqueToken = require('../../../../src/services/commands/generateOpaqueToken')
const ComputeExpiryDate = require('../../../../src/services/commands/computeExpiryDate')
const CreateSessionForUser = require('../../../../src/services/commands/createSessionForUser')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

function dependencies() {
	return {
		enforceSessionLimit: EnforceSessionLimit.getInstance(),
		issueTokenPair: IssueTokenPair.getInstance(),
		generateOpaqueToken: GenerateOpaqueToken.getInstance(),
		computeExpiryDate: ComputeExpiryDate.getInstance()
	}
}

test('CreateSessionForUser — issues a token pair and persists a new Session', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	const command = CreateSessionForUser.getInstance()

	const tokenPair = await command.execute({
		repository, luxon, ...dependencies(),
		userId: user._id, roleId: role._id,
		sessionTokenDuration: '15m', refreshTokenDuration: '5d'
	})

	assert.equal(typeof tokenPair.accessToken, 'string')
	assert.equal(typeof tokenPair.refreshToken, 'string')
	assert.notEqual(tokenPair.accessToken, tokenPair.refreshToken)

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, tokenPair.accessToken)
	assert.equal(String(sessions.records[0].user), String(user._id))
})

test('CreateSessionForUser — evicts the oldest session once the role\'s maxSessions is reached', async () => {
	const repository = MockRepository.getInstance()
	const role = await repository.add('role', { data: { name: 'user', active: true, maxSessions: 1 } })
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id) } })
	await repository.add('session', {
		data: {
			user: String(user._id), accessToken: 'old-access-token',
			accessTokenExpiresAt: luxon.DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'old-refresh-token',
			refreshTokenExpiresAt: luxon.DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const command = CreateSessionForUser.getInstance()

	const tokenPair = await command.execute({
		repository, luxon, ...dependencies(),
		userId: user._id, roleId: role._id,
		sessionTokenDuration: '15m', refreshTokenDuration: '5d'
	})

	const sessions = await repository.list('session', { query: {} })
	assert.equal(sessions.count, 1)
	assert.equal(sessions.records[0].accessToken, tokenPair.accessToken)
})
