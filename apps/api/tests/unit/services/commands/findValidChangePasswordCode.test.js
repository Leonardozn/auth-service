const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const FindValidChangePasswordCode = require('../../../../src/services/commands/findValidChangePasswordCode')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('FindValidChangePasswordCode — returns the record when the code matches, unused and not expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	await repository.add('change_password_verification_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			code: '482913',
			newPasswordHash: 'hashed-new-password',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false,
			attempts: 0
		}
	})
	const command = FindValidChangePasswordCode.getInstance()

	const record = await command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', code: '482913' })

	assert.equal(record.code, '482913')
	assert.equal(record.newPasswordHash, 'hashed-new-password')
})

test('FindValidChangePasswordCode — throws when no pending code exists for the user', async () => {
	const repository = MockRepository.getInstance()
	const command = FindValidChangePasswordCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', code: '482913' }),
		{ name: 'BadRequestError' }
	)
})

test('FindValidChangePasswordCode — throws and marks the code used when it has expired', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('change_password_verification_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			code: '482913',
			newPasswordHash: 'hashed-new-password',
			expiresAt: DateTime.now().setZone('utc').minus({ minutes: 1 }).toJSDate(),
			used: false,
			attempts: 0
		}
	})
	const command = FindValidChangePasswordCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', code: '482913' }),
		{ name: 'BadRequestError' }
	)

	const stored = await repository.list('change_password_verification_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].used, true)
})

test('FindValidChangePasswordCode — throws and counts the attempt when the code does not match', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('change_password_verification_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			code: '482913',
			newPasswordHash: 'hashed-new-password',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false,
			attempts: 0
		}
	})
	const command = FindValidChangePasswordCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', code: 'wrong-code', maxAttempts: 5 }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('change_password_verification_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 1)
	assert.equal(stored.records[0].used, false)
})

test('FindValidChangePasswordCode — invalidates the code once the max attempts are reached', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const record = await repository.add('change_password_verification_code', {
		data: {
			user: '64b0c0ffee1234567890abcd',
			code: '482913',
			newPasswordHash: 'hashed-new-password',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used: false,
			attempts: 4
		}
	})
	const command = FindValidChangePasswordCode.getInstance()

	await assert.rejects(
		() => command.execute({ repository, luxon, userId: '64b0c0ffee1234567890abcd', code: 'wrong-code', maxAttempts: 5 }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('change_password_verification_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 5)
	assert.equal(stored.records[0].used, true)
})
