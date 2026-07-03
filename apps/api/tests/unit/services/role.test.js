const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const RoleService = require('../../../src/services/role')

const luxon = DataValidatorHandler.getInstance().getLuxon()

// A complete record matching every field declared for 'role' in settings.json - used as
// both the create payload and the expectation, since contract filtering + create/update
// validation are value-preserving for these types (see data-validator/contract templates).
const SAMPLE = {
		"name": "sample text",
		"active": true
	}

const SEED_ID = '64b0c0ffee1234567890abce'

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('role').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

// Seeds an admin (role + user + session) - every Role mutation is admin-only
// (RoleService._requireAdminSession), so tests exercising those paths need one.
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

test('role service add() — creates and returns the contract-filtered record, as an admin', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.add({ body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('role service add() — throws when called without an admin session', async () => {
	const service = RoleService.getInstance()

	await assert.rejects(() => service.add({ body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('role service add() — throws when called with a non-admin session', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const userRole = await repository.add('role', { data: { name: 'user', active: true } })
	const user = await repository.add('user', { data: { name: 'Bob', email: 'bob@example.com', password: 'hash', role: String(userRole._id), active: true } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'user-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'user-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const service = RoleService.getInstance()

	await assert.rejects(
		() => service.add({ body: SAMPLE, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('role service findOne() — returns the contract-filtered record by id', async () => {
	seed()
	const service = RoleService.getInstance()

	const result = await service.findOne({ id: SEED_ID })

	assert.deepEqual(result, SAMPLE)
})

test('role service findOne() — throws when the record does not exist', async () => {
	MockRepository.getInstance()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})

test('role service list() — returns count and contract-filtered records', async () => {
	seed()
	const service = RoleService.getInstance()

	const result = await service.list({})

	assert.equal(result.count, 1)
	assert.deepEqual(result.records, [SAMPLE])
})

test('role service update() — patches and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('role service update() — throws when called without an admin session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.update({ id: SEED_ID, body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('role service replace() — replaces and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, SAMPLE)
})

test('role service replace() — throws when called without an admin session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.replace({ id: SEED_ID, body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('role service remove() — deletes the record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.remove({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})

test('role service remove() — throws when called without an admin session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.remove({ id: SEED_ID }), { name: 'UnauthorizedError' })
})
