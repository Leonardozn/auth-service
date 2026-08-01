const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const Login_recordService = require('../../../src/services/login_record')

// A complete record matching every field declared for 'login_record' in settings.json - used as
// both the create payload and the expectation, since contract filtering + create/update
// validation are value-preserving for these types (see data-validator/contract templates).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"email": "sample text",
		"result": "sample text",
		"method": "sample text",
		"ip": "sample text",
		"userAgent": "sample text"
	}

const SEED_ID = '64b0c0ffee1234567890abce'

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('login_record').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

beforeEach(() => {
	MockRepository.reset()
})

test('login_record service add() — creates and returns the contract-filtered record', async () => {
	const service = Login_recordService.getInstance()

	const result = await service.add({ body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('login_record service findOne() — returns the contract-filtered record by id', async () => {
	seed()
	const service = Login_recordService.getInstance()

	const result = await service.findOne({ id: SEED_ID })

	assert.deepEqual(result, SAMPLE)
})

test('login_record service findOne() — throws when the record does not exist', async () => {
	MockRepository.getInstance()
	const service = Login_recordService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})

test('login_record service list() — returns count and contract-filtered records', async () => {
	seed()
	const service = Login_recordService.getInstance()

	const result = await service.list({})

	assert.equal(result.count, 1)
	assert.deepEqual(result.records, [SAMPLE])
})

test('login_record service update() — patches and returns the contract-filtered record', async () => {
	seed()
	const service = Login_recordService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('login_record service replace() — replaces and returns the contract-filtered record', async () => {
	seed()
	const service = Login_recordService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('login_record service remove() — deletes the record', async () => {
	seed()
	const service = Login_recordService.getInstance()

	const result = await service.remove({ id: SEED_ID })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})
