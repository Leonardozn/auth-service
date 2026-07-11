const test = require('node:test')
const assert = require('node:assert/strict')

const SecurityHeaders = require('@auth-service/security-headers')
const SecurityHeadersHandler = require('../../../src/handlers/securityHeaders')
// Same shared env object the handler reads; DEVELOP_MODE is mutated here to exercise the HSTS gate.
const envVars = require('../../../src/handlers/envVariables')

// Runs a helmet middleware against a fake response and returns the headers it set (lower-cased).
function applyHeaders(middleware) {
	const headers = {}
	const res = {
		setHeader(key, value) { headers[String(key).toLowerCase()] = value },
		getHeader(key) { return headers[String(key).toLowerCase()] },
		removeHeader(key) { delete headers[String(key).toLowerCase()] }
	}
	middleware({ headers: {}, method: 'GET' }, res, () => {})
	return headers
}

test('SecurityHeaders sets nosniff and the requested Cross-Origin-Resource-Policy', () => {
	const middleware = new SecurityHeaders().getMiddleware({
		contentSecurityPolicy: false,
		crossOriginResourcePolicy: { policy: 'cross-origin' }
	})

	const headers = applyHeaders(middleware)
	assert.equal(headers['x-content-type-options'], 'nosniff')
	assert.equal(headers['cross-origin-resource-policy'], 'cross-origin')
})

test('SecurityHeaders leaves Content-Security-Policy off when disabled (JSON API / Swagger UI)', () => {
	const middleware = new SecurityHeaders().getMiddleware({ contentSecurityPolicy: false })

	const headers = applyHeaders(middleware)
	assert.equal(headers['content-security-policy'], undefined)
})

test('SecurityHeadersHandler enables HSTS only outside develop mode', () => {
	const handler = SecurityHeadersHandler.getInstance()

	envVars.DEVELOP_MODE = 'true'
	assert.equal(applyHeaders(handler.getMiddleware())['strict-transport-security'], undefined)

	envVars.DEVELOP_MODE = 'false'
	assert.notEqual(applyHeaders(handler.getMiddleware())['strict-transport-security'], undefined)

	envVars.DEVELOP_MODE = 'true'
})

test('SecurityHeadersHandler is a singleton exposing the middleware', () => {
	const a = SecurityHeadersHandler.getInstance()
	const b = SecurityHeadersHandler.getInstance()

	assert.equal(a, b)
	assert.equal(typeof a.getMiddleware(), 'function')
})
