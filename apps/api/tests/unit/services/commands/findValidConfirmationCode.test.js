const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const FindValidConfirmationCode = require('../../../../src/services/commands/findValidConfirmationCode')

const luxon = DataValidatorHandler.getInstance().getLuxon()
const dataEncryptHandler = DataEncryptHandler.getInstance()

beforeEach(() => {
	MockRepository.reset()
})

test('FindValidConfirmationCode — returns the record when the code matches, unused and not expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			purpose: 'registration',
			codeHash: dataEncryptHandler.encrypt('482913'),
			medium: 'email',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false,
			attempts: 0
		}
	})
	const command = FindValidConfirmationCode.getInstance()

	const record = await command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: '482913', purpose: 'registration' })

	assert.equal(record.medium, 'email')
})

test('FindValidConfirmationCode — never stores the code in plain text', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			purpose: 'registration',
			codeHash: dataEncryptHandler.encrypt('482913'),
			medium: 'email',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false,
			attempts: 0
		}
	})

	const stored = await repository.list('confirmation_code', { query: { user: '64b0c0ffee1234567890abcd' } })
	assert.notEqual(stored.records[0].codeHash, '482913')
})

test('FindValidConfirmationCode — throws when no pending code exists for the user+purpose', async () => {
	const repository = MockRepository.getInstance()
	const command = FindValidConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: '482913', purpose: 'registration' }),
		{ name: 'BadRequestError' }
	)
})

test('FindValidConfirmationCode — ignores a pending code for a different purpose', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd', purpose: 'two_factor', codeHash: dataEncryptHandler.encrypt('482913'), medium: 'email',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(), used: false, attempts: 0
		}
	})
	const command = FindValidConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: '482913', purpose: 'registration' }),
		{ name: 'BadRequestError' }
	)
})

test('FindValidConfirmationCode — throws and marks the code used when it has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: dataEncryptHandler.encrypt('482913'), medium: 'email',
			expiresAt: DateTime.now().setZone('utc').minus({ minutes: 1 }).toJSDate(), used: false, attempts: 0
		}
	})
	const command = FindValidConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: '482913', purpose: 'registration' }),
		{ name: 'BadRequestError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].used, true)
})

test('FindValidConfirmationCode — throws and counts the attempt when the code does not match', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: dataEncryptHandler.encrypt('482913'), medium: 'email',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(), used: false, attempts: 0
		}
	})
	const command = FindValidConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: 'wrong-code', purpose: 'registration', maxAttempts: 5 }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 1)
	assert.equal(stored.records[0].used, false)
})

test('FindValidConfirmationCode — invalidates the code once the max attempts are reached', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('confirmation_code', {
		data: {
			user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: dataEncryptHandler.encrypt('482913'), medium: 'email',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(), used: false, attempts: 4
		}
	})
	const command = FindValidConfirmationCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, dataEncryptHandler, userId: '64b0c0ffee1234567890abcd', code: 'wrong-code', purpose: 'registration', maxAttempts: 5 }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 5)
	assert.equal(stored.records[0].used, true)
})
