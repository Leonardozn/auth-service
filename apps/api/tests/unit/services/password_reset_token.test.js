const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const Password_reset_tokenService = require('../../../src/services/password_reset_token')

const luxon = DataValidatorHandler.getInstance().getLuxon()

// A complete record matching every field declared for 'password_reset_token' in settings.json - used as
// both the create payload and the expectation, since contract filtering + create/update
// validation are value-preserving for these types (see data-validator/contract templates).
const SAMPLE = {
		"user": "64b0c0ffee1234567890abcd",
		"token": "sample text",
		"expiresAt": "2024-01-01T00:00:00.000Z",
		"used": true
	}

const SEED_ID = '64b0c0ffee1234567890abce'

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('password_reset_token').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

// Seeds an admin (role + user + session) - PasswordResetToken is an internal recovery record,
// so every raw CRUD operation on it is admin-only (Password_reset_tokenService._requireAdminSession).
async function seedAdminSession(repository) {
	const { DateTime } = luxon
	const adminRole = await repository.add('role', { data: { name: 'admin', active: true } })
	const admin = await repository.add('user', { data: { name: 'Root', email: 'root@example.com', password: 'hash', role: String(adminRole._id), active: true } })
	await repository.add('session', {
		data: {
			user: String(admin._id),
			accessToken: 'admin-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'admin-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	return admin
}

beforeEach(() => {
	MockRepository.reset()
})

test('password_reset_token service add() — creates and returns the contract-filtered record, as an admin', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.add({ body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('password_reset_token service add() — throws when called without an admin session', async () => {
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.add({ body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('password_reset_token service findOne() — returns the contract-filtered record by id, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('password_reset_token service findOne() — throws without an admin session', async () => {
	seed()
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }), { name: 'UnauthorizedError' })
})

test('password_reset_token service findOne() — throws when the record does not exist', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' }))
})

test('password_reset_token service list() — returns count and contract-filtered records, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.list({ authorizationHeader: 'Bearer admin-access-token' })

	// +1 for the seeded admin's own session's-worth of setup doesn't add a password_reset_token,
	// so only SEED_ID is present.
	assert.equal(result.count, 1)
	assert.deepEqual(result.records, [SAMPLE])
})

test('password_reset_token service list() — throws without an admin session', async () => {
	seed()
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.list({}), { name: 'UnauthorizedError' })
})

test('password_reset_token service update() — patches and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('password_reset_token service update() — throws without an admin session', async () => {
	seed()
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.update({ id: SEED_ID, body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('password_reset_token service replace() — replaces and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('password_reset_token service replace() — throws without an admin session', async () => {
	seed()
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.replace({ id: SEED_ID, body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('password_reset_token service remove() — deletes the record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = Password_reset_tokenService.getInstance()

	const result = await service.remove({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' }))
})

test('password_reset_token service remove() — throws without an admin session', async () => {
	seed()
	const service = Password_reset_tokenService.getInstance()

	await assert.rejects(() => service.remove({ id: SEED_ID }), { name: 'UnauthorizedError' })
})
