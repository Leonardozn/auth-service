const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const MockEmailManager = require('../../support/mock-email-manager-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const DataValidatorHandler = require('../../../src/handlers/dataValidator')
const AuthController = require('../../../src/controllers/auth')

const luxon = DataValidatorHandler.getInstance().getLuxon()

beforeEach(() => {
	MockRepository.reset()
})

test('AuthController.register — returns 201 with the created user on success', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	const controller = AuthController.getInstance()
	const req = { body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.register(req, res)

	assert.equal(capturedStatus, 201)
	assert.equal(capturedBody.success, true)
	assert.equal(capturedBody.statusCode, 201)
	assert.equal(capturedBody.content.user.name, 'Ada')
	assert.equal(capturedBody.content.user.email, 'ada@example.com')
	assert.equal(capturedBody.content.user.password, undefined)
})

test('AuthController.register — returns 400 when the email is already registered', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('role', { data: { name: 'user', active: true } })
	await repository.add('user', { data: { name: 'Existing', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const controller = AuthController.getInstance()
	const req = { body: { name: 'Ada', email: 'ada@example.com', password: 'Sup3rSecret!' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.register(req, res)

	assert.equal(capturedStatus, 400)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'This email is already registered.',
		statusCode: 400,
		content: null
	})
})

test('AuthController.login — returns 200 with tokens and the user on valid credentials', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const hashed = dataEncryptHandler.encrypt('Sup3rSecret!')
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: hashed, role: '64b0c0ffee1234567890abcd' } })
	const controller = AuthController.getInstance()
	const req = { body: { email: 'ada@example.com', password: 'Sup3rSecret!' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.login(req, res)

	assert.equal(capturedStatus, 200)
	assert.equal(capturedBody.success, true)
	assert.equal(typeof capturedBody.content.token, 'string')
	assert.equal(typeof capturedBody.content.refreshToken, 'string')
	assert.equal(capturedBody.content.user.name, 'Ada')
	assert.equal(capturedBody.content.user.email, 'ada@example.com')
	assert.equal(capturedBody.content.user.password, undefined)
})

test('AuthController.login — returns 401 on invalid credentials', async () => {
	const controller = AuthController.getInstance()
	const req = { body: { email: 'missing@example.com', password: 'whatever' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.login(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Invalid email or password.',
		statusCode: 401,
		content: null
	})
})

test('AuthController.refresh — returns 200 with rotated tokens and the user on a valid refresh token', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'old-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'old-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { body: { refreshToken: 'old-refresh-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.refresh(req, res)

	assert.equal(capturedStatus, 200)
	assert.equal(capturedBody.success, true)
	assert.equal(typeof capturedBody.content.token, 'string')
	assert.equal(typeof capturedBody.content.refreshToken, 'string')
	assert.notEqual(capturedBody.content.refreshToken, 'old-refresh-token')
	assert.equal(capturedBody.content.user.name, 'Ada')
	assert.equal(capturedBody.content.user.password, undefined)
})

test('AuthController.refresh — returns 401 on an invalid refresh token', async () => {
	const controller = AuthController.getInstance()
	const req = { body: { refreshToken: 'missing-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.refresh(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Invalid or expired token.',
		statusCode: 401,
		content: null
	})
})

test('AuthController.validate — returns 200 with the user for a valid access token', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'valid-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'some-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { body: { token: 'valid-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.validate(req, res)

	assert.equal(capturedStatus, 200)
	assert.equal(capturedBody.success, true)
	assert.equal(capturedBody.content.user.name, 'Ada')
	assert.equal(capturedBody.content.user.password, undefined)
})

test('AuthController.validate — returns 401 on an invalid access token', async () => {
	const controller = AuthController.getInstance()
	const req = { body: { token: 'missing-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.validate(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Invalid or expired token.',
		statusCode: 401,
		content: null
	})
})

test('AuthController.logout — returns 200 with null content when the session is revoked', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'active-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'active-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { headers: { authorization: 'Bearer active-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.logout(req, res)

	assert.equal(capturedStatus, 200)
	assert.deepEqual(capturedBody, {
		success: true,
		message: 'Success!',
		statusCode: 200,
		content: null
	})
})

test('AuthController.logout — returns 401 when the Authorization header is missing', async () => {
	const controller = AuthController.getInstance()
	const req = { headers: {} }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.logout(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Missing or malformed Authorization header.',
		statusCode: 401,
		content: null
	})
})

test('AuthController.changePassword — returns 200 with null content and emails a verification code', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: dataEncryptHandler.encrypt('Sup3rSecret!'), role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const mockEmail = MockEmailManager.getInstance()
	mockEmail.send = async () => ({ id: 'mock-email-id' })
	const controller = AuthController.getInstance()
	const req = { body: { currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret1!' }, headers: { authorization: 'Bearer current-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.changePassword(req, res)

	assert.equal(capturedStatus, 200)
	assert.deepEqual(capturedBody, {
		success: true,
		message: 'Success!',
		statusCode: 200,
		content: null
	})

	const unchangedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(dataEncryptHandler.verify('Sup3rSecret!', unchangedUser.records[0].password), true)
})

test('AuthController.verifyChangePassword — returns 200 with null content and applies the pending password', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: dataEncryptHandler.encrypt('Sup3rSecret!'), role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const mockEmail = MockEmailManager.getInstance()
	let capturedSend
	mockEmail.send = async (config) => { capturedSend = config; return { id: 'mock-email-id' } }
	const controller = AuthController.getInstance()
	const changeReq = { body: { currentPassword: 'Sup3rSecret!', newPassword: 'NewSecret1!' }, headers: { authorization: 'Bearer current-access-token' } }
	const noopRes = { status() { return this }, json() { return this } }
	await controller.changePassword(changeReq, noopRes)
	const code = capturedSend.html.match(/\b(\d{6})\b/)[1]

	const req = { body: { code }, headers: { authorization: 'Bearer current-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.verifyChangePassword(req, res)

	assert.equal(capturedStatus, 200)
	assert.deepEqual(capturedBody, {
		success: true,
		message: 'Success!',
		statusCode: 200,
		content: null
	})

	const updatedUser = await repository.list('user', { query: { _id: String(user._id) } })
	assert.equal(dataEncryptHandler.verify('NewSecret1!', updatedUser.records[0].password), true)
})

test('AuthController.verifyChangePassword — returns 400 when there is no pending code', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { body: { code: '000000' }, headers: { authorization: 'Bearer current-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.verifyChangePassword(req, res)

	assert.equal(capturedStatus, 400)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'No pending password change request.',
		statusCode: 400,
		content: null
	})
})

test('AuthController.changePassword — returns 401 when the current password is wrong', async () => {
	const repository = MockRepository.getInstance()
	const dataEncryptHandler = DataEncryptHandler.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: dataEncryptHandler.encrypt('Sup3rSecret!'), role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { body: { currentPassword: 'WrongPassword!', newPassword: 'NewSecret1!' }, headers: { authorization: 'Bearer current-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.changePassword(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Current password does not match.',
		statusCode: 401,
		content: null
	})
})

test('AuthController.forgotPassword — returns 200 with null content whether or not the email exists', async () => {
	const repository = MockRepository.getInstance()
	await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	const mockEmail = MockEmailManager.getInstance()
	mockEmail.send = async () => ({ id: 'mock-email-id' })
	const controller = AuthController.getInstance()

	for (const email of ['ada@example.com', 'missing@example.com']) {
		const req = { body: { email } }
		let capturedStatus, capturedBody
		const res = {
			status(code) { capturedStatus = code; return this },
			json(body)   { capturedBody  = body;  return this },
		}

		await controller.forgotPassword(req, res)

		assert.equal(capturedStatus, 200)
		assert.deepEqual(capturedBody, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: null
		})
	}
})

test('AuthController.resetPassword — returns 200 with null content on success', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'old-hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('password_reset_token', {
		data: {
			user: String(user._id),
			token: 'valid-reset-token',
			expiresAt: DateTime.now().setZone('utc').plus({ minutes: 30 }).toJSDate(),
			used: false
		}
	})
	const controller = AuthController.getInstance()
	const req = { body: { token: 'valid-reset-token', newPassword: 'NewSecret1!' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.resetPassword(req, res)

	assert.equal(capturedStatus, 200)
	assert.deepEqual(capturedBody, {
		success: true,
		message: 'Success!',
		statusCode: 200,
		content: null
	})
})

test('AuthController.resetPassword — returns 400 when the token is invalid', async () => {
	const controller = AuthController.getInstance()
	const req = { body: { token: 'missing-token', newPassword: 'NewSecret1!' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.resetPassword(req, res)

	assert.equal(capturedStatus, 400)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Invalid or expired reset token.',
		statusCode: 400,
		content: null
	})
})

test('AuthController.deactivate — returns 200 with the deactivated user on success', async () => {
	const repository = MockRepository.getInstance()
	const { DateTime } = luxon
	const user = await repository.add('user', { data: { name: 'Ada', email: 'ada@example.com', password: 'hash', role: '64b0c0ffee1234567890abcd' } })
	await repository.add('session', {
		data: {
			user: String(user._id),
			accessToken: 'current-access-token',
			accessTokenExpiresAt: DateTime.now().setZone('utc').plus({ minutes: 15 }).toJSDate(),
			refreshToken: 'current-refresh-token',
			refreshTokenExpiresAt: DateTime.now().setZone('utc').plus({ days: 5 }).toJSDate()
		}
	})
	const controller = AuthController.getInstance()
	const req = { headers: { authorization: 'Bearer current-access-token' } }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.deactivate(req, res)

	assert.equal(capturedStatus, 200)
	assert.equal(capturedBody.success, true)
	assert.equal(capturedBody.content.active, false)

	const sessions = await repository.list('session', { query: { user: String(user._id) } })
	assert.equal(sessions.count, 0)
})

test('AuthController.deactivate — returns 401 when the Authorization header is missing', async () => {
	const controller = AuthController.getInstance()
	const req = { headers: {} }
	let capturedStatus, capturedBody
	const res = {
		status(code) { capturedStatus = code; return this },
		json(body)   { capturedBody  = body;  return this },
	}

	await controller.deactivate(req, res)

	assert.equal(capturedStatus, 401)
	assert.deepEqual(capturedBody, {
		success: false,
		message: 'Missing or malformed Authorization header.',
		statusCode: 401,
		content: null
	})
})
