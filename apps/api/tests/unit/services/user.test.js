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

async function seedSession(repository, { roleName, accessToken }) {
	const { DateTime } = luxon
	const role = await repository.add('role', { data: { name: roleName, active: true } })
	const user = await repository.add('user', { data: { name: 'Root', email: `${roleName}@example.com`, password: 'hash', role: String(role._id), active: true } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken,
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: `${accessToken}-refresh`,
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	return user
}

// Seeds an admin (role + user + session) - assigning a `role` through POST/PUT /user (and
// DELETE /user/:id) is admin-only (UserService._requireAdminSession).
function seedAdminSession(repository) {
	return seedSession(repository, { roleName: 'admin', accessToken: 'admin-access-token' })
}

// Seeds a non-admin, authenticated user - reading/creating/replacing a User without a `role`
// in the body still requires some authenticated session (UserService._requireAuthenticatedSession).
function seedUserSession(repository) {
	return seedSession(repository, { roleName: 'user', accessToken: 'user-access-token' })
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
	await seedUserSession(repository)
	const service = UserService.getInstance()

	await assert.rejects(
		() => service.add({ body: SAMPLE, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('user service add() — creates a roleless record for any authenticated session', async () => {
	const repository = MockRepository.getInstance()
	await seedUserSession(repository)
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE
	const { role: _expectedRole, ...expectedWithoutRole } = EXPECTED

	const result = await service.add({ body: withoutRole, authorizationHeader: 'Bearer user-access-token' })

	assert.equal(typeof result._id, 'string')
	assert.deepEqual(result, { ...expectedWithoutRole, _id: result._id })
})

test('user service add() — throws when creating a roleless record without any session', async () => {
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE

	await assert.rejects(() => service.add({ body: withoutRole }), { name: 'UnauthorizedError' })
})

test('user service findOne() — returns the contract-filtered record by id, for any authenticated session', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = UserService.getInstance()

	const result = await service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer user-access-token' })

	assert.deepEqual(result, EXPECTED)
})

test('user service findOne() — throws without any session', async () => {
	seed()
	const service = UserService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }), { name: 'UnauthorizedError' })
})

test('user service findOne() — throws when the record does not exist', async () => {
	const repository = MockRepository.getInstance()
	await seedUserSession(repository)
	const service = UserService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer user-access-token' }))
})

test('user service list() — returns count and contract-filtered records, for any authenticated session', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = UserService.getInstance()

	const result = await service.list({ authorizationHeader: 'Bearer user-access-token' })

	// +1 for the seeded "user" session's own account, alongside the SEED_ID record.
	assert.equal(result.count, 2)
	assert.deepEqual(result.records.find(r => r._id === SEED_ID), EXPECTED)
})

test('user service list() — throws without any session', async () => {
	seed()
	const service = UserService.getInstance()

	await assert.rejects(() => service.list({}), { name: 'UnauthorizedError' })
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

test('user service remove() — deletes the record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	const result = await service.remove({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' })

	assert.equal(result.deletedCount, 1)

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' }))
})

test('user service remove() — throws when called without an admin session', async () => {
	seed()
	const service = UserService.getInstance()

	await assert.rejects(() => service.remove({ id: SEED_ID }), { name: 'UnauthorizedError' })
})
