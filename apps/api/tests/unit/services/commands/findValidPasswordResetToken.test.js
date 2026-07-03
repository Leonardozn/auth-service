const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const FindValidPasswordResetToken = require('../../../../src/services/commands/findValidPasswordResetToken')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('FindValidPasswordResetToken — returns the token when unused and not expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('password_reset_token', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			token: 'valid-reset-token',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 30 }).toJSDate(),
			used: false
		}
	})
	const command = FindValidPasswordResetToken.getInstance()

	const resetToken = await command.execute({ repository, luxon, token: 'valid-reset-token' })

	assert.equal(resetToken.token, 'valid-reset-token')
})

test('FindValidPasswordResetToken — throws when no token matches', async () => {
	const repository = MockRepository.getInstance()
	const command = FindValidPasswordResetToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, token: 'missing-token' }),
		{ name: 'BadRequestError' }
	)
})

test('FindValidPasswordResetToken — throws when the token has already been used', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('password_reset_token', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			token: 'used-reset-token',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 30 }).toJSDate(),
			used: true
		}
	})
	const command = FindValidPasswordResetToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, token: 'used-reset-token' }),
		{ name: 'BadRequestError' }
	)
})

test('FindValidPasswordResetToken — throws when the token has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('password_reset_token', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			token: 'expired-reset-token',
			expiresAt: DateTime.now().setZone('utc').minus({ minutes: 1 }).toJSDate(),
			used: false
		}
	})
	const command = FindValidPasswordResetToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, token: 'expired-reset-token' }),
		{ name: 'BadRequestError' }
	)
})
