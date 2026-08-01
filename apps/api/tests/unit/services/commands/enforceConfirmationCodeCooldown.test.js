const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const EnforceConfirmationCodeCooldown = require('../../../../src/services/commands/enforceConfirmationCodeCooldown')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('EnforceConfirmationCodeCooldown — does nothing when the user never had a code', async () => {
	const repository = MockRepository.getInstance()
	const command = EnforceConfirmationCodeCooldown.getInstance()

	await command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', purpose: 'registration', cooldownSeconds: 60 })
})

test('EnforceConfirmationCodeCooldown — throws when the last code was requested less than cooldownSeconds ago', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = EnforceConfirmationCodeCooldown.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', purpose: 'registration', cooldownSeconds: 60 }),
		{ name: 'TooManyRequestsError' }
	)
})

test('EnforceConfirmationCodeCooldown — does not throw once the cooldown has elapsed', async () => {
	const repository = MockRepository.getInstance()
	const record = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	// Mock add() always stamps createdAt to "now" - backdate it past the cooldown via update()
	await repository.update('confirmation_code', { id: record._id, data: { createdAt: luxon.DateTime.now().setZone('utc').minus({ minutes: 5 }).toJSDate() } })
	const command = EnforceConfirmationCodeCooldown.getInstance()

	await command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', purpose: 'registration', cooldownSeconds: 60 })
})

test('EnforceConfirmationCodeCooldown — ignores codes for a different purpose', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'two_factor', codeHash: 'hash', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = EnforceConfirmationCodeCooldown.getInstance()

	await command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', purpose: 'registration', cooldownSeconds: 60 })
})
