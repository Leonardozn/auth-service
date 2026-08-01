const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const Confirmation_codeService = require('../../../src/services/confirmation_code')

// A complete record matching every field declared for 'confirmation_code' in settings.json - used as
// both the create payload and the expectation, since contract filtering + create/update
// validation are value-preserving for these types (see data-validator/contract templates).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"purpose": "sample text",
		"codeHash": "sample text",
		"medium": "sample text",
		"expiresAt": "2024-01-01T00:00:00.000Z",
		"used": true,
		"attempts": 1
	}

// codeHash is deliberately excluded from the contract - it must never leave the API, not even
// through the generic admin CRUD (see contracts/confirmation_code.js).
const { codeHash: _codeHash, ...EXPECTED } = SAMPLE

const SEED_ID = '64b0c0ffee1234567890abce'

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('confirmation_code').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

beforeEach(() => {
	MockRepository.reset()
})

test('confirmation_code service add() — creates and returns the contract-filtered record', async () => {
	const service = Confirmation_codeService.getInstance()

	const result = await service.add({ body: SAMPLE })

	assert.deepEqual(result, EXPECTED)
})

test('confirmation_code service findOne() — returns the contract-filtered record by id', async () => {
	seed()
	const service = Confirmation_codeService.getInstance()

	const result = await service.findOne({ id: SEED_ID })

	assert.deepEqual(result, EXPECTED)
})

test('confirmation_code service findOne() — throws when the record does not exist', async () => {
	MockRepository.getInstance()
	const service = Confirmation_codeService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})

test('confirmation_code service list() — returns count and contract-filtered records', async () => {
	seed()
	const service = Confirmation_codeService.getInstance()

	const result = await service.list({})

	assert.equal(result.count, 1)
	assert.deepEqual(result.records, [EXPECTED])
})

test('confirmation_code service update() — patches and returns the contract-filtered record', async () => {
	seed()
	const service = Confirmation_codeService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, EXPECTED)
})

test('confirmation_code service replace() — replaces and returns the contract-filtered record', async () => {
	seed()
	const service = Confirmation_codeService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, EXPECTED)
})

test('confirmation_code service remove() — deletes the record', async () => {
	seed()
	const service = Confirmation_codeService.getInstance()

	const result = await service.remove({ id: SEED_ID })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})
