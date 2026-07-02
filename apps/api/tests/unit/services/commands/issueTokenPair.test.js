const { test } = require('node:test')
const assert = require('node:assert/strict')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const GenerateOpaqueToken = require('../../../../src/services/commands/generateOpaqueToken')
const ComputeExpiryDate = require('../../../../src/services/commands/computeExpiryDate')
const IssueTokenPair = require('../../../../src/services/commands/issueTokenPair')

const luxon = DataValidatorHandler.getInstance().getLuxon()

test('IssueTokenPair — returns a distinct access/refresh token pair with future expiries', () => {
	const command = IssueTokenPair.getInstance()

	const result = command.execute({
		generateOpaqueToken: GenerateOpaqueToken.getInstance(),
		computeExpiryDate: ComputeExpiryDate.getInstance(),
		luxon,
		sessionTokenDuration: '15m',
		refreshTokenDuration: '5d'
	})

	assert.equal(typeof result.accessToken, 'string')
	assert.equal(typeof result.refreshToken, 'string')
	assert.notEqual(result.accessToken, result.refreshToken)
	assert.ok(result.accessTokenExpiresAt instanceof Date)
	assert.ok(result.refreshTokenExpiresAt instanceof Date)
	assert.ok(result.accessTokenExpiresAt.getTime() > Date.now())
	assert.ok(result.refreshTokenExpiresAt.getTime() > result.accessTokenExpiresAt.getTime())
})
