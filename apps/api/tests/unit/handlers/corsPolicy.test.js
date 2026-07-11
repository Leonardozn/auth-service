const test = require('node:test')
const assert = require('node:assert/strict')

const CorsPolicyHandler = require('../../../src/handlers/corsPolicy')
// Same shared env object the handler reads; mutating a property here is what the handler sees,
// since getPolicy() reads CORS_ALLOWED_ORIGINS dynamically on every call.
const envVars = require('../../../src/handlers/envVariables')

// Drives the cors middleware against a fake request carrying the given Origin, and returns the
// response headers cors decided to set. A simple (non-OPTIONS) GET is enough to observe the
// Access-Control-Allow-Origin decision.
function runCors(middleware, requestOrigin) {
	const headers = {}
	const req = { method: 'GET', headers: requestOrigin ? { origin: requestOrigin } : {} }
	const res = {
		setHeader: (key, value) => { headers[key.toLowerCase()] = value },
		getHeader: (key) => headers[key.toLowerCase()]
	}
	middleware(req, res, () => {})
	return headers
}

test('CorsPolicy stays open (Access-Control-Allow-Origin: *) when CORS_ALLOWED_ORIGINS is empty', () => {
	envVars.CORS_ALLOWED_ORIGINS = ''
	const middleware = CorsPolicyHandler.getInstance().getPolicy()

	const headers = runCors(middleware, 'https://anything.example')
	assert.equal(headers['access-control-allow-origin'], '*')
})

test('CorsPolicy reflects an origin that is on the whitelist', () => {
	envVars.CORS_ALLOWED_ORIGINS = 'https://app.example, https://admin.example'
	const middleware = CorsPolicyHandler.getInstance().getPolicy()

	const headers = runCors(middleware, 'https://admin.example')
	assert.equal(headers['access-control-allow-origin'], 'https://admin.example')
})

test('CorsPolicy denies an origin that is not on the whitelist (no Allow-Origin header)', () => {
	envVars.CORS_ALLOWED_ORIGINS = 'https://app.example'
	const middleware = CorsPolicyHandler.getInstance().getPolicy()

	const headers = runCors(middleware, 'https://evil.example')
	assert.equal(headers['access-control-allow-origin'], undefined)

	envVars.CORS_ALLOWED_ORIGINS = ''
})
