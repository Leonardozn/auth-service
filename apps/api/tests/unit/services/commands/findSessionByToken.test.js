const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const FindSessionByToken = require('../../../../src/services/commands/findSessionByToken')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('FindSessionByToken — returns the session when the refresh token is valid and not expired', async () => {
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
	const command = FindSessionByToken.getInstance()

	const session = await command.execute({ repository, luxon, tokenField: 'refreshToken', expiryField: 'refreshTokenExpiresAt', token: 'valid-refresh-token' })

	assert.equal(session.refreshToken, 'valid-refresh-token')
})

test('FindSessionByToken — returns the session when the access token is valid and not expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('session', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			accessToken: 'valid-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'some-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const command = FindSessionByToken.getInstance()

	const session = await command.execute({ repository, luxon, tokenField: 'accessToken', expiryField: 'accessTokenExpiresAt', token: 'valid-access-token' })

	assert.equal(session.accessToken, 'valid-access-token')
})

test('FindSessionByToken — throws when no session matches the given token', async () => {
	const repository = MockRepository.getInstance()
	const command = FindSessionByToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, tokenField: 'refreshToken', expiryField: 'refreshTokenExpiresAt', token: 'missing-token' }),
		{ name: 'UnauthorizedError' }
	)
})

test('FindSessionByToken — throws when the matching session has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const pastExpiry = DateTime.now().setZone('utc').minus({ days: 1 }).toJSDate()
	await repository.add('session', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			accessToken: 'expired-access-token',
			accessTokenExpiresAt: pastExpiry,
			refreshToken: 'expired-refresh-token',
			refreshTokenExpiresAt: pastExpiry
		}
	})
	const command = FindSessionByToken.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, tokenField: 'refreshToken', expiryField: 'refreshTokenExpiresAt', token: 'expired-refresh-token' }),
		{ name: 'UnauthorizedError' }
	)
	await assert.rejects(
		() => command.execute({ repository, luxon, tokenField: 'accessToken', expiryField: 'accessTokenExpiresAt', token: 'expired-access-token' }),
		{ name: 'UnauthorizedError' }
	)
})
