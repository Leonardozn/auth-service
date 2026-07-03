const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const UserService = require('../../../src/services/user')

const luxon = DataValidatorHandler.getInstance().getLuxon()

// A complete record matching every field declared for 'user' in settings.json - used as
// the create/update payload.
const SAMPLE = {
		"name": "sample text",
		"email": "sample text",
		"password": "sample text",
		"role": "64b0c0ffee1234567890abcd",
		"active": true
	}

// The User contract never exposes password (security: even hashed, it must never leave the
// API) - this is what every service response is expected to look like. _id IS exposed (unlike
// other models) since self-service account management needs the client to know its own id.
const SEED_ID = '64b0c0ffee1234567890abce'
const EXPECTED = { _id: SEED_ID, name: SAMPLE.name, email: SAMPLE.email, role: SAMPLE.role, active: SAMPLE.active }

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('user').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

// Seeds an admin (role + user + session) - assigning a `role` through POST/PUT /user is
// admin-only (UserService._requireAdminSession), so tests exercising that path need one.
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

test('user service add() — creates and returns the contract-filtered record, as an admin', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	const result = await service.add({ body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.equal(typeof result._id, 'string')
	assert.deepEqual(result, { ...EXPECTED, _id: result._id })
})

test('user service add() — throws when assigning a role without an admin session', async () => {
	const service = UserService.getInstance()

	await assert.rejects(() => service.add({ body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('user service add() — throws when assigning a role with a non-admin session', async () => {
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
	const service = UserService.getInstance()

	await assert.rejects(
		() => service.add({ body: SAMPLE, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('user service add() — creates a roleless record without requiring authentication', async () => {
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE
	const { role: _expectedRole, ...expectedWithoutRole } = EXPECTED

	const result = await service.add({ body: withoutRole })

	assert.equal(typeof result._id, 'string')
	assert.deepEqual(result, { ...expectedWithoutRole, _id: result._id })
})

test('user service findOne() — returns the contract-filtered record by id', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.findOne({ id: SEED_ID })

	assert.deepEqual(result, EXPECTED)
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
	assert.deepEqual(result.records, [EXPECTED])
})

test('user service update() — patches and returns the contract-filtered record', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE })

	assert.deepEqual(result, EXPECTED)
})

test('user service replace() — replaces and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	const result = await service.replace({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, EXPECTED)
})

test('user service replace() — throws when assigning a role without an admin session', async () => {
	seed()
	const service = UserService.getInstance()

	await assert.rejects(() => service.replace({ id: SEED_ID, body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('user service remove() — deletes the record', async () => {
	seed()
	const service = UserService.getInstance()

	const result = await service.remove({ id: SEED_ID })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID }))
})
