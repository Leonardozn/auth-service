const { test } = require('node:test')
const assert = require('node:assert/strict')
const { BadRequestError } = require('../../../../src/handlers/handleErrors')
const ResolvePasswordResetUrlBase = require('../../../../src/services/commands/resolvePasswordResetUrlBase')

const DEFAULT = 'http://localhost:5173/reset-password'
const STORE = 'http://localhost:8081/reset-password'

test('ResolvePasswordResetUrlBase — falls back to the configured default when nothing is requested', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	const result = command.execute({ defaultUrlBase: DEFAULT, allowedUrlBases: STORE })

	assert.equal(result, DEFAULT)
})

test('ResolvePasswordResetUrlBase — honours a requested base that is on the allow list', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	const result = command.execute({ requested: STORE, defaultUrlBase: DEFAULT, allowedUrlBases: STORE })

	assert.equal(result, STORE)
})

test('ResolvePasswordResetUrlBase — accepts the configured default even when the allow list omits it', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	const result = command.execute({ requested: DEFAULT, defaultUrlBase: DEFAULT, allowedUrlBases: STORE })

	assert.equal(result, DEFAULT)
})

test('ResolvePasswordResetUrlBase — reads a comma-separated allow list, ignoring blanks and spacing', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	const result = command.execute({
		requested: STORE,
		defaultUrlBase: DEFAULT,
		allowedUrlBases: `  ${DEFAULT} , , ${STORE}  `
	})

	assert.equal(result, STORE)
})

test('ResolvePasswordResetUrlBase — ignores a trailing slash on either side of the comparison', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	const result = command.execute({
		requested: `${STORE}/`,
		defaultUrlBase: DEFAULT,
		allowedUrlBases: `${STORE}//`
	})

	assert.equal(result, STORE)
})

test('ResolvePasswordResetUrlBase — rejects a base that is not on the allow list', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	assert.throws(
		() => command.execute({
			requested: 'https://phishing.example/reset-password',
			defaultUrlBase: DEFAULT,
			allowedUrlBases: STORE
		}),
		BadRequestError
	)
})

// The point of the whole command: an unset allow list must not mean "anything goes". Whoever picks
// the link in that email picks where a working, single-use reset token gets delivered.
test('ResolvePasswordResetUrlBase — an empty allow list still rejects anything but the default', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	assert.throws(
		() => command.execute({ requested: STORE, defaultUrlBase: DEFAULT, allowedUrlBases: '' }),
		BadRequestError
	)

	assert.equal(
		command.execute({ requested: DEFAULT, defaultUrlBase: DEFAULT, allowedUrlBases: undefined }),
		DEFAULT
	)
})

test('ResolvePasswordResetUrlBase — a prefix of an allowed base is not allowed', () => {
	const command = ResolvePasswordResetUrlBase.getInstance()

	// `http://localhost:8081.attacker.example` starts with the allowed host as text but is a
	// different origin - matching by prefix instead of exact value would let it through.
	assert.throws(
		() => command.execute({
			requested: 'http://localhost:8081.attacker.example/reset-password',
			defaultUrlBase: DEFAULT,
			allowedUrlBases: STORE
		}),
		BadRequestError
	)
})
