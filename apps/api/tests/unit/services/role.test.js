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
		"active": true,
		"maxSessions": 3,
		"permissions": [{ "resource": "sample text", "read": true, "write": false }]
	}

const SEED_ID = '64b0c0ffee1234567890abce'

// El contrato de Role SÍ expone _id: sin él, PUT/PATCH/DELETE de /role no se pueden invocar
// desde ningún cliente, porque no habría con qué identificar el registro.
const EXPECTED = { _id: SEED_ID, ...SAMPLE }

function seed() {
	const repo = MockRepository.getInstance()
	const now = new Date().toISOString()
	repo._collection('role').set(SEED_ID, { _id: SEED_ID, ...SAMPLE, createdAt: now, updatedAt: now })
	return repo
}

async function seedSession(repository, { roleName, accessToken, permissions = [] }) {
	const { DateTime } = luxon
	const role = await repository.add('role', { data: { name: roleName, active: true, permissions } })
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

// Seeds an admin (role + user + session) - every Role mutation is admin-only
// (RoleService._requireAdminSession), so tests exercising those paths need one.
function seedAdminSession(repository) {
	return seedSession(repository, { roleName: 'admin', accessToken: 'admin-access-token' })
}

// Seeds a non-admin, authenticated user - reading a Role still requires some authenticated
// session (RoleService._requireAuthenticatedSession).
function seedUserSession(repository) {
	return seedSession(repository, { roleName: 'user', accessToken: 'user-access-token' })
}

beforeEach(() => {
	MockRepository.reset()
})

test('role service add() — creates and returns the contract-filtered record, as an admin', async () => {
	const repository = MockRepository.getInstance()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.add({ body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	// El id lo genera el repositorio al crear, así que se compara contra el del resultado y no
	// contra el sembrado.
	assert.equal(typeof result._id, 'string')
	assert.deepEqual(result, { ...SAMPLE, _id: result._id })
})

test('role service add() — throws when called without an admin session', async () => {
	const service = RoleService.getInstance()

	await assert.rejects(() => service.add({ body: SAMPLE }), { name: 'UnauthorizedError' })
})

test('role service add() — throws when called with a non-admin session', async () => {
	const repository = MockRepository.getInstance()
	await seedUserSession(repository)
	const service = RoleService.getInstance()

	await assert.rejects(
		() => service.add({ body: SAMPLE, authorizationHeader: 'Bearer user-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('role service findOne() — returns the contract-filtered record by id, for any authenticated session', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = RoleService.getInstance()

	const result = await service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer user-access-token' })

	assert.deepEqual(result, EXPECTED)
})

test('role service findOne() — throws without any session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID }), { name: 'UnauthorizedError' })
})

test('role service findOne() — throws when the record does not exist', async () => {
	const repository = MockRepository.getInstance()
	await seedUserSession(repository)
	const service = RoleService.getInstance()

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer user-access-token' }))
})

test('role service list() — returns count and contract-filtered records, for any authenticated session', async () => {
	const repository = seed()
	await seedUserSession(repository)
	const service = RoleService.getInstance()

	const result = await service.list({ authorizationHeader: 'Bearer user-access-token' })

	// SAMPLE plus the seeded "user" role itself.
	assert.equal(result.count, 2)
	assert.ok(result.records.some(r => r.name === SAMPLE.name && r.active === SAMPLE.active))
})

test('role service list() — throws without any session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.list({}), { name: 'UnauthorizedError' })
})

test('role service update() — patches and returns the contract-filtered record, as an admin', async () => {
	const repository = seed()
	await seedAdminSession(repository)
	const service = RoleService.getInstance()

	const result = await service.update({ id: SEED_ID, body: SAMPLE, authorizationHeader: 'Bearer admin-access-token' })

	assert.deepEqual(result, EXPECTED)
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

	assert.deepEqual(result, EXPECTED)
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

	await assert.rejects(() => service.findOne({ id: SEED_ID, authorizationHeader: 'Bearer admin-access-token' }))
})

test('role service remove() — throws when called without an admin session', async () => {
	seed()
	const service = RoleService.getInstance()

	await assert.rejects(() => service.remove({ id: SEED_ID }), { name: 'UnauthorizedError' })
})

// ── Delegación por permiso ─────────────────────────────────────────────────
// Antes, administrar roles exigía que el Role se llamara literalmente 'admin', así que no había
// forma de tener un administrador de catálogo que NO pudiera crear roles. Ahora también pasa un
// rol que lo tenga concedido en su catálogo de permisos.

function seedDelegatedSession(repository, permissions) {
	return seedSession(repository, { roleName: 'operaciones', accessToken: 'delegated-access-token', permissions })
}

test('role service add() — un rol no admin con write sobre "role" puede crear', async () => {
	const repository = MockRepository.getInstance()
	await seedDelegatedSession(repository, [{ resource: 'role', read: true, write: true }])
	const service = RoleService.getInstance()

	const result = await service.add({ body: SAMPLE, authorizationHeader: 'Bearer delegated-access-token' })

	assert.equal(typeof result._id, 'string')
})

test('role service add() — un rol no admin con solo read sobre "role" NO puede crear', async () => {
	const repository = MockRepository.getInstance()
	await seedDelegatedSession(repository, [{ resource: 'role', read: true, write: false }])
	const service = RoleService.getInstance()

	await assert.rejects(
		() => service.add({ body: SAMPLE, authorizationHeader: 'Bearer delegated-access-token' }),
		{ name: 'ForbiddenError' }
	)
})

test('role service remove() — un rol no admin con write sobre "role" puede eliminar', async () => {
	const repository = seed()
	await seedDelegatedSession(repository, [{ resource: 'role', read: true, write: true }])
	const service = RoleService.getInstance()

	const result = await service.remove({ id: SEED_ID, authorizationHeader: 'Bearer delegated-access-token' })

	assert.equal(result.deletedCount, 1)
})

test('role service remove() — un permiso sobre OTRO recurso no sirve', async () => {
	const repository = seed()
	await seedDelegatedSession(repository, [{ resource: 'item', read: true, write: true }])
	const service = RoleService.getInstance()

	await assert.rejects(
		() => service.remove({ id: SEED_ID, authorizationHeader: 'Bearer delegated-access-token' }),
		{ name: 'ForbiddenError' }
	)
})
