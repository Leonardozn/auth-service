const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const EnforceLoginRecordLimit = require('../../../../src/services/commands/enforceLoginRecordLimit')
const WriteLoginRecord = require('../../../../src/services/commands/writeLoginRecord')

beforeEach(() => {
	MockRepository.reset()
})

test('WriteLoginRecord — inserts a record with the given fields', async () => {
	const repository = MockRepository.getInstance()
	const enforceLoginRecordLimit = EnforceLoginRecordLimit.getInstance()
	const command = WriteLoginRecord.getInstance()

	const record = await command.execute({
		repository, enforceLoginRecordLimit,
		user: '64b0c0ffee1234567890abcd', email: 'ada@example.com', result: 'success', method: 'password',
		ip: '127.0.0.1', userAgent: 'test-agent', maxPerEmail: 10
	})

	assert.equal(record.email, 'ada@example.com')
	assert.equal(record.result, 'success')
	assert.equal(record.method, 'password')
	assert.equal(String(record.user), '64b0c0ffee1234567890abcd')
})

test('WriteLoginRecord — leaves user unset for an attempt against an email with no account', async () => {
	const repository = MockRepository.getInstance()
	const enforceLoginRecordLimit = EnforceLoginRecordLimit.getInstance()
	const command = WriteLoginRecord.getInstance()

	const record = await command.execute({
		repository, enforceLoginRecordLimit,
		user: null, email: 'nobody@example.com', result: 'failed', method: 'password',
		ip: '127.0.0.1', userAgent: 'test-agent', maxPerEmail: 10
	})

	assert.equal(record.user, undefined)
})

test('WriteLoginRecord — enforces the per-email cap after inserting', async () => {
	const repository = MockRepository.getInstance()
	const enforceLoginRecordLimit = EnforceLoginRecordLimit.getInstance()
	const command = WriteLoginRecord.getInstance()

	for (let i = 0; i < 3; i++) {
		await command.execute({
			repository, enforceLoginRecordLimit,
			user: null, email: 'ada@example.com', result: 'failed', method: 'password',
			ip: '127.0.0.1', userAgent: 'test-agent', maxPerEmail: 2
		})
	}

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 2)
})
