const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const MockEmailManager = require('../../support/mock-email-manager-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const EmailConfirmationService = require('../../../src/services/emailConfirmation')

const luxon = DataValidatorHandler.getInstance().getLuxon()
const dataEncryptHandler = DataEncryptHandler.getInstance()

beforeEach(() => {
	MockRepository.reset()
	MockEmailManager.getInstance().send = async () => ({ id: 'mock-email-id' })
})

async function seedUnconfirmedUser(repository, overrides = {}) {
	const role = await repository.add('role', { data: { name: 'user', active: true } })
	return repository.add('user', {
		data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: String(role._id), active: true, emailConfirmed: false, ...overrides }
	})
}

async function seedConfirmationCode(repository, { userId, code = '482913', used = false, attempts = 0, expiresAt } = {}) {
	return repository.add('confirmation_code', {
		data: {
			user: String(userId), purpose: 'registration', codeHash: dataEncryptHandler.encrypt(code), medium: 'email',
			expiresAt: expiresAt || luxon.DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate(),
			used, attempts
		}
	})
}

// checkEmailStatus()

test('EmailConfirmationService.checkEmailStatus() — registered: true for an existing account, confirmed or not', async () => {
	const repository = MockRepository.getInstance()
	await seedUnconfirmedUser(repository)
	const service = EmailConfirmationService.getInstance()

	const result = await service.checkEmailStatus({ body: { email: 'ada@example.com' } })

	assert.equal(result.registered, true)
})

test('EmailConfirmationService.checkEmailStatus() — registered: false for an email with no account', async () => {
	const service = EmailConfirmationService.getInstance()

	const result = await service.checkEmailStatus({ body: { email: 'nobody@example.com' } })

	assert.equal(result.registered, false)
})

// sendCode()

test('EmailConfirmationService.sendCode() — issues and emails a new code, returning expiresInSeconds', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository)
	let capturedSend
	MockEmailManager.getInstance().send = async (config) => { capturedSend = config; return { id: 'mock-email-id' } }
	const service = EmailConfirmationService.getInstance()

	const result = await service.sendCode({ body: { email: 'ada@example.com' } })

	assert.equal(typeof result.expiresInSeconds, 'number')
	assert.ok(result.expiresInSeconds > 0)
	assert.equal(capturedSend.to, 'ada@example.com')

	const codes = await repository.list('confirmation_code', { query: { user: String(user._id) } })
	assert.equal(codes.count, 1)
})

test('EmailConfirmationService.sendCode() — throws 404 when the email has no account', async () => {
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.sendCode({ body: { email: 'nobody@example.com' } }),
		{ name: 'NotFoundError' }
	)
})

test('EmailConfirmationService.sendCode() — throws 400 for an unsupported medium', async () => {
	const repository = MockRepository.getInstance()
	await seedUnconfirmedUser(repository)
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.sendCode({ body: { email: 'ada@example.com', medium: 'sms' } }),
		{ name: 'BadRequestError' }
	)
})

test('EmailConfirmationService.sendCode() — throws 429 when a code was already sent recently', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository)
	await seedConfirmationCode(repository, { userId: user._id })
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.sendCode({ body: { email: 'ada@example.com' } }),
		{ name: 'TooManyRequestsError' }
	)
})

test('EmailConfirmationService.sendCode() — propagates a raw Resend failure uncaught (502 upstream)', async () => {
	const repository = MockRepository.getInstance()
	await seedUnconfirmedUser(repository)
	MockEmailManager.getInstance().send = async () => {
		const err = new Error('Request failed with status code 401')
		err.isAxiosError = true
		throw err
	}
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.sendCode({ body: { email: 'ada@example.com' } }),
		(error) => {
			assert.equal(error.isAxiosError, true)
			return true
		}
	)
})

// verifyCode()

test('EmailConfirmationService.verifyCode() — confirms the account and opens a session on a correct code', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository, { unconfirmedExpiresAt: luxon.DateTime.now().setZone('utc').plus({ days: 7 }).toJSDate() })
	await seedConfirmationCode(repository, { userId: user._id, code: '482913' })
	const service = EmailConfirmationService.getInstance()

	const result = await service.verifyCode({ body: { email: 'ada@example.com', code: '482913' }, ip: '127.0.0.1', userAgent: 'test-agent' })

	assert.equal(typeof result.token, 'string')
	assert.equal(typeof result.refreshToken, 'string')
	assert.equal(result.user.emailConfirmed, true)

	const storedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(storedUser.records[0].emailConfirmed, true)
	assert.equal(storedUser.records[0].unconfirmedExpiresAt, null)

	const sessions = await repository.list('session', { query: { user: String(user._id) } })
	assert.equal(sessions.count, 1)

	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 1)
	assert.equal(records.records[0].method, 'confirmation_code')
	assert.equal(records.records[0].result, 'success')
})

test('EmailConfirmationService.verifyCode() — throws 400 when the email has no account', async () => {
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'nobody@example.com', code: '482913' } }),
		{ name: 'BadRequestError' }
	)
})

test('EmailConfirmationService.verifyCode() — throws 400 when there is no pending code', async () => {
	const repository = MockRepository.getInstance()
	await seedUnconfirmedUser(repository)
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'ada@example.com', code: '482913' } }),
		{ name: 'BadRequestError' }
	)
})

test('EmailConfirmationService.verifyCode() — throws 400 and burns the code when it has expired', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository)
	const record = await seedConfirmationCode(repository, { userId: user._id, expiresAt: luxon.DateTime.now().setZone('utc').minus({ minutes: 1 }).toJSDate() })
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'ada@example.com', code: '482913' } }),
		{ name: 'BadRequestError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].used, true)

	// The account is not confirmed by an expired code
	const storedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(storedUser.records[0].emailConfirmed, false)
})

test('EmailConfirmationService.verifyCode() — throws 401 on an incorrect code and counts the attempt', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository)
	const record = await seedConfirmationCode(repository, { userId: user._id, code: '482913' })
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'ada@example.com', code: '000000' } }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 1)
	assert.equal(stored.records[0].used, false)
})

test('EmailConfirmationService.verifyCode() — burns the code once the max attempts are reached', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository)
	const record = await seedConfirmationCode(repository, { userId: user._id, code: '482913', attempts: 4 })
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'ada@example.com', code: '000000' } }),
		{ name: 'UnauthorizedError' }
	)

	const stored = await repository.list('confirmation_code', { query: { _id: record._id } })
	assert.equal(stored.records[0].attempts, 5)
	assert.equal(stored.records[0].used, true)
})

test('EmailConfirmationService.verifyCode() — confirms the email but throws 403 for a deactivated account, without opening a session', async () => {
	const repository = MockRepository.getInstance()
	const user = await seedUnconfirmedUser(repository, { active: false })
	await seedConfirmationCode(repository, { userId: user._id, code: '482913' })
	const service = EmailConfirmationService.getInstance()

	await assert.rejects(
		() => service.verifyCode({ body: { email: 'ada@example.com', code: '482913' } }),
		{ name: 'ForbiddenError' }
	)

	// The code still gets consumed and the email still gets confirmed - proving mailbox ownership
	// is unrelated to account status, and the code is single-use either way.
	const storedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(storedUser.records[0].emailConfirmed, true)

	const sessions = await repository.list('session', { query: { user: String(user._id) } })
	assert.equal(sessions.count, 0)

	// Per the resolved decision, only the success path writes a LoginRecord - this failure does not
	const records = await repository.list('login_record', { query: { email: 'ada@example.com' } })
	assert.equal(records.count, 0)
})
