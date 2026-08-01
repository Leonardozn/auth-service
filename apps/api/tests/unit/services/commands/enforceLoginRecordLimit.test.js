const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../../support/mock-repository-preload')
const EnforceLoginRecordLimit = require('../../../../src/services/commands/enforceLoginRecordLimit')

beforeEach(() => {
	MockRepository.reset()
})

async function addRecord(repository, { email, result = 'failed' }) {
	return repository.add('login_record', { data: { email, result, method: 'password', ip: '127.0.0.1', userAgent: 'test-agent' } })
}

test('EnforceLoginRecordLimit — does nothing when under the limit', async () => {
	const repository = MockRepository.getInstance()
	await addRecord(repository, { email: 'ada@example.com' })
	const command = EnforceLoginRecordLimit.getInstance()

	await command.execute({ repository, email: 'ada@example.com', maxPerEmail: 10 })

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 1)
})

test('EnforceLoginRecordLimit — evicts the oldest records once the cap is exceeded', async () => {
	const repository = MockRepository.getInstance()
	const oldest = await addRecord(repository, { email: 'ada@example.com' })
	await new Promise(resolve => setTimeout(resolve, 5))
	await addRecord(repository, { email: 'ada@example.com' })
	const command = EnforceLoginRecordLimit.getInstance()

	await command.execute({ repository, email: 'ada@example.com', maxPerEmail: 1 })

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 1)
	assert.notEqual(String(records.records[0]._id), String(oldest._id))
})

test('EnforceLoginRecordLimit — is a no-op when maxPerEmail is 0 or negative (unlimited)', async () => {
	const repository = MockRepository.getInstance()
	for (let i = 0; i < 5; i++) await addRecord(repository, { email: 'ada@example.com' })
	const command = EnforceLoginRecordLimit.getInstance()

	await command.execute({ repository, email: 'ada@example.com', maxPerEmail: 0 })

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 5)
})

test('EnforceLoginRecordLimit — only scopes by email, never by user (a failed attempt against no account still counts)', async () => {
	const repository = MockRepository.getInstance()
	await addRecord(repository, { email: 'nobody@example.com' })
	await new Promise(resolve => setTimeout(resolve, 5))
	await addRecord(repository, { email: 'nobody@example.com' })
	const command = EnforceLoginRecordLimit.getInstance()

	await command.execute({ repository, email: 'nobody@example.com', maxPerEmail: 1 })

	const records = await repository.list('login_record', { query: { email: 'nobody@example.com' } })
	assert.equal(records.count, 1)
})
