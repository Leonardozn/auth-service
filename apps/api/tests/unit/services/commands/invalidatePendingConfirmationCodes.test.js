const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const InvalidatePendingConfirmationCodes = require('../../../../src/services/commands/invalidatePendingConfirmationCodes')

beforeEach(() => {
	MockRepository.reset()
})

test('InvalidatePendingConfirmationCodes — marks every unused code for the user+purpose as used', async () => {
	const repository = MockRepository.getInstance()
	const first = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'hash-1', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const second = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'hash-2', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = InvalidatePendingConfirmationCodes.getInstance()

	await command.execute({ repository, userId: '64b0c0ffee1234567890abcd', purpose: 'registration' })

	const codes = await repository.list('confirmation_code', { query: { user: '64b0c0ffee1234567890abcd' } })
	assert.equal(codes.count, 2)
	assert.ok(codes.records.every(record => record.used === true))
	assert.deepEqual(codes.records.map(r => String(r._id)).sort(), [String(first._id), String(second._id)].sort())
})

test('InvalidatePendingConfirmationCodes — leaves already-used codes and other purposes untouched', async () => {
	const repository = MockRepository.getInstance()
	const alreadyUsed = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'registration', codeHash: 'hash-1', medium: 'email', expiresAt: new Date(), used: true, attempts: 0 }
	})
	const otherPurpose = await repository.add('confirmation_code', {
		data: { user: '64b0c0ffee1234567890abcd', purpose: 'two_factor', codeHash: 'hash-2', medium: 'email', expiresAt: new Date(), used: false, attempts: 0 }
	})
	const command = InvalidatePendingConfirmationCodes.getInstance()

	await command.execute({ repository, userId: '64b0c0ffee1234567890abcd', purpose: 'registration' })

	const stored = await repository.list('confirmation_code', { query: { user: '64b0c0ffee1234567890abcd' } })
	const untouchedOtherPurpose = stored.records.find(r => String(r._id) === String(otherPurpose._id))
	assert.equal(untouchedOtherPurpose.used, false)
	const stillUsed = stored.records.find(r => String(r._id) === String(alreadyUsed._id))
	assert.equal(stillUsed.used, true)
})

test('InvalidatePendingConfirmationCodes — does nothing when there is no pending code', async () => {
	const repository = MockRepository.getInstance()
	const command = InvalidatePendingConfirmationCodes.getInstance()

	await command.execute({ repository, userId: '64b0c0ffee1234567890abcd', purpose: 'registration' })

	const codes = await repository.list('confirmation_code', { query: {} })
	assert.equal(codes.count, 0)
})
