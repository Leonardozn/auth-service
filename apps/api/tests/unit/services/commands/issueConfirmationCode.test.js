const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const GenerateNumericCode = require('../../../../src/services/commands/generateNumericCode')
const ComputeExpiryDate = require('../../../../src/services/commands/computeExpiryDate')
const InvalidatePendingConfirmationCodes = require('../../../../src/services/commands/invalidatePendingConfirmationCodes')
const EnforceConfirmationCodeCooldown = require('../../../../src/services/commands/enforceConfirmationCodeCooldown')
const IssueConfirmationCode = require('../../../../src/services/commands/issueConfirmationCode')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

function dependencies() {
	return {
		generateNumericCode: GenerateNumericCode.getInstance(),
		computeExpiryDate: ComputeExpiryDate.getInstance(),
		invalidatePendingConfirmationCodes: InvalidatePendingConfirmationCodes.getInstance(),
		enforceConfirmationCodeCooldown: EnforceConfirmationCodeCooldown.getInstance()
	}
}

test('IssueConfirmationCode — persists a hashed code and returns the plain-text code', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const command = IssueConfirmationCode.getInstance()

	const result = await command.execute({
		repository, luxon, dataEncryptHandler, ...dependencies(),
		userId: '64b0c0ffee1234567890abcd', purpose: 'registration', medium: 'email',
		cooldownSeconds: 60, codeDuration: '5m'
	})

	assert.match(result.code, /^[0-9]{6}$/)
	assert.ok(result.expiresAt instanceof Date)

	const codes = await repository.list('confirmation_code', { query: { user: '64b0c0ffee1234567890abcd', purpose: 'registration' } })
	assert.equal(codes.count, 1)
	assert.equal(codes.records[0].used, false)
	assert.equal(codes.records[0].attempts, 0)
	assert.equal(codes.records[0].medium, 'email')
	assert.notEqual(codes.records[0].codeHash, result.code)
	assert.equal(dataEncryptHandler.verify(result.code, codes.records[0].codeHash), true)
})

test('IssueConfirmationCode — invalidates a previous unused code for the same purpose', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const previous = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'old-hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	await repository.update('confirmation_code', { id: previous._id, data: { createdAt: luxon.DateTime.now().setZone('utc').minus({ minutes: 5 }).toJSDate() } })
	const command = IssueConfirmationCode.getInstance()

	await command.execute({
		repository, luxon, dataEncryptHandler, ...dependencies(),
		userId: '64b0c0ffee1234567890abcd', purpose: 'registration', medium: 'email',
		cooldownSeconds: 60, codeDuration: '5m'
	})

	const codes = await repository.list('confirmation_code', { query: { user: '64b0c0ffee1234567890abcd', purpose: 'registration' } })
	assert.equal(codes.count, 2)
	const oldRecord = codes.records.find(r => String(r._id) === String(previous._id))
	assert.equal(oldRecord.used, true)
})

test('IssueConfirmationCode — throws when the cooldown has not elapsed', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'old-hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = IssueConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({
			repository, luxon, dataEncryptHandler, ...dependencies(),
			userId: '64b0c0ffee1234567890abcd', purpose: 'registration', medium: 'email',
			cooldownSeconds: 60, codeDuration: '5m'
		}),
		{ name: 'TooManyRequestsError' }
	)
})

test('IssueConfirmationCode — skips the cooldown check when skipCooldownCheck is true', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'old-hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = IssueConfirmationCode.getInstance()

	const result = await command.execute({
		repository, luxon, dataEncryptHandler, ...dependencies(),
		userId: '64b0c0ffee1234567890abcd', purpose: 'registration', medium: 'email',
		cooldownSeconds: 60, codeDuration: '5m', skipCooldownCheck: true
	})

	assert.match(result.code, /^[0-9]{6}$/)
})
