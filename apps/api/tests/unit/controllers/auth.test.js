const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const MockRepository = require('../../support/mock-repository-preload')
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
	assert.notEqual(capturedBody.content.user.password, 'Sup3rSecret!')
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
