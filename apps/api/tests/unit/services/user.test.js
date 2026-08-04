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
		"active": true,
		"emailConfirmed": true,
		"unconfirmedExpiresAt": null
	}

// The User contract never exposes password (security: even hashed, it must never leave the
// API) - this is what every service response is expected to look like. _id IS exposed (unlike
// other models) since self-service account management needs the client to know its own id.
// unconfirmedExpiresAt is deliberately absent - it's an internal field, never in the contract.
const SEED_ID = '64b0c0ffee1234567890abce'
const EXPECTED = { _id: SEED_ID, name: SAMPLE.name, email: SAMPLE.email, role: SAMPLE.role, active: SAMPLE.active, emailConfirmed: SAMPLE.emailConfirmed }

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

// Seeds a non-admin, authenticated user - used to prove that a bare session is NOT enough on the
// raw /user endpoints: reading someone else's record, listing every user, creating an account or
// replacing another account all require admin or ownership (UserService._requireSelfOrAdminSession).
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

// Omitting `role` used to downgrade the check to "any authenticated session", which let a
// customer create accounts. Creating an account is administrative whatever the payload says.
test('user service add() — throws when a non-admin creates a roleless record', async () => {
	const repository = MockRepository.getInstance()
	await seedUserSession(repository)
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE

	await assert.rejects(
		() => service.add({ body: withoutRole, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('user service add() — throws when creating a roleless record without any session', async () => {
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE

	await assert.rejects(() => service.add({ body: withoutRole }), { name: 'UnauthorizedError' })
})

test('user service add() — self-service signup still works through trustedRoleAssignment', async () => {
	const service = UserService.getInstance()

	const result = await service.add({ body: SAMPLE, trustedRoleAssignment: true })

	assert.equal(typeof result._id, 'string')
	assert.deepEqual(result, { ...EXPECTED, _id: result._id })
})

test('user service findOne() — returns the contract-filtered record by id, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	const result = await service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, EXPECTED)
})

test('user service findOne() — an account owner may read their own record', async () => {
	const repository = seed()
	const self = await seedUserSession(repository)
	const service = UserService.getInstance()

	const result = await service.findOne({ id: String(self._id), authorizationHeader: 'Bearer user-access-token' })

	assert.equal(result._id, String(self._id))
})

// A session alone used to be enough here, so any registered customer could read every other
// account - name and email included.
test('user service findOne() — throws when a non-admin reads another account', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = UserService.getInstance()

	await assert.rejects(
		() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('user service findOne() — throws without any session', async () => {
	seed()
	const service = UserService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }), { name: 'UnauthorizedError' })
})

test('user service findOne() — throws when the record does not exist', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' }))
})

test('user service list() — returns count and contract-filtered records, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = UserService.getInstance()

	const result = await service.list({ authorizationHeader: 'Bearer admin-access-token' })

	// +1 for the seeded "admin" session's own account, alongside the SEED_ID record.
	assert.equal(result.count, 2)
	assert.deepEqual(result.records.find(r => r._id === SEED_ID), EXPECTED)
})

// The listing names no account, so there is no ownership scope to fall back on: either the caller
// sees every user or none. A bare session used to be enough, which handed the whole user base -
// names and emails - to any customer who registered.
test('user service list() — throws when a non-admin lists the user base', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = UserService.getInstance()

	await assert.rejects(
		() => service.list({ authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
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

// The account-takeover path this rule closes: a body without `role` used to need only a session,
// and the body accepts `email` - so a customer could point an admin's account at their own inbox
// and then walk in through POST /auth/forgot-password.
test('user service replace() — throws when a non-admin replaces another account without a role', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE

	await assert.rejects(
		() => service.replace({ id: SEED_ID, body: { ...withoutRole, email: 'attacker@example.com' }, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('user service replace() — an account owner may replace their own record', async () => {
	const repository = seed()
	const self = await seedUserSession(repository)
	const service = UserService.getInstance()
	const { role: _role, ...withoutRole } = SAMPLE

	const result = await service.replace({ id: String(self._id), body: withoutRole, authorizationHeader: 'Bearer user-access-token' })

	assert.equal(result._id, String(self._id))
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
