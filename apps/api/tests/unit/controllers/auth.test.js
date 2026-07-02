const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
const DataEncryptHandler = require('../../../src/handlers/dataEncrypt')
const AuthController = require('../../../src/controllers/auth')

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
