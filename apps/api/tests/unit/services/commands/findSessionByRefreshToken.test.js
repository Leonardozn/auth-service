const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const FindSessionByRefreshToken = require('../../../../src/services/commands/findSessionByRefreshToken')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('FindSessionByRefreshToken — returns the session when the refresh token is valid and not expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const futureExpiry = DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
	await repository.add('session', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			accessToken: 'access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'valid-refresh-token',
			refreshTokenExpiresAt: futureExpiry
		}
	})
	const command = FindSessionByRefreshToken.getInstance()

	const session = await command.execute({ repository, luxon, refreshToken: 'valid-refresh-token' })

	assert.equal(session.refreshToken, 'valid-refresh-token')
})

test('FindSessionByRefreshToken — throws when no session matches the refresh token', async () => {
	const repository = MockRepository.getInstance()
	const command = FindSessionByRefreshToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, refreshToken: 'missing-token' }),
		{ name: 'UnauthorizedError' }
	)
})

test('FindSessionByRefreshToken — throws when the matching session has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const pastExpiry = DateTime.now().setZone('utc').minus({ days: 1 }).toJSDate()
	await repository.add('session', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			accessToken: 'access-token',
			accessTokenExpiresAt: pastExpiry,
			refreshToken: 'expired-refresh-token',
			refreshTokenExpiresAt: pastExpiry
		}
	})
	const command = FindSessionByRefreshToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, refreshToken: 'expired-refresh-token' }),
		{ name: 'UnauthorizedError' }
	)
})
