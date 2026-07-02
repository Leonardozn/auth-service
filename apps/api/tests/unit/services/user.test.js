const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const UserService = require('../../../src/services/user')

// A complete record matching every field declared for 'user' in settings.json - used as
// both the create payload and the expectation, since contract filtering + create/update
// validation are value-preserving for these types (see data-validator/contract templates).
const SAMPLE = {
		"name": "sample text",
		"email": "sample text",
		"password": "sample text",
		"role": "64b0c0ffee1234567890abcd"
	}

const SEED_ID = '64b0c0ffee1234567890abce'

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('user').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

beforeEach(() => {
	MockRepository.reset()
})

test('user service add() — creates and returns the contract-filtered record', async () => {
	const service = UserService.getInstance()

	const result = await service.add({ body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('user service findOne() — returns the contract-filtered record by id', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.findOne({ id: SEED_ID })

	assert.deepEqual(result, SAMPLE)
})

test('user service findOne() — throws when the record does not exist', async () => {
	MockRepository.getInstance()
	const service = UserService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})

test('user service list() — returns count and contract-filtered records', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.list({})

	assert.equal(result.count, 1)
	assert.deepEqual(result.records, [SAMPLE])
})

test('user service update() — patches and returns the contract-filtered record', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('user service replace() — replaces and returns the contract-filtered record', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, SAMPLE)
})

test('user service remove() — deletes the record', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.remove({ id: SEED_ID })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})
