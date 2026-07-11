const test = require('node:test')
const assert = require('node:assert/strict')

const RateLimiter = require('@auth-service/rate-limiter')
const RateLimiterHandler = require('../../../src/handlers/rateLimiter')

// Drives one request with the given client IP through a limiter middleware and resolves with the
// HTTP status it produced — 200 when it called next() (allowed), 429 when it sent the limit body.
function hit(limiter, ip) {
	return new Promise((resolve, reject) => {
		const req = { ip, method: 'POST', headers: {}, app: { get: () => false } }
		const res = {
			statusCode: 200,
			headers: {},
			setHeader(key, value) { this.headers[String(key).toLowerCase()] = value },
			getHeader(key) { return this.headers[String(key).toLowerCase()] },
			status(code) { this.statusCode = code; return this },
			send() { resolve(this.statusCode) },
			json() { resolve(this.statusCode) },
			end() { resolve(this.statusCode) },
			on() {}
		}
		req.res = res
		try {
			limiter(req, res, () => resolve(200))
		} catch (error) {
			reject(error)
		}
	})
}

test('RateLimiter allows up to max requests then blocks with 429', async () => {
	const limiter = new RateLimiter().createLimiter({ windowMs: 60000, max: 2 })

	assert.equal(await hit(limiter, '203.0.113.7'), 200)
	assert.equal(await hit(limiter, '203.0.113.7'), 200)
	assert.equal(await hit(limiter, '203.0.113.7'), 429)
})

test('RateLimiter keys by IP — a different IP keeps its own budget', async () => {
	const limiter = new RateLimiter().createLimiter({ windowMs: 60000, max: 1 })

	assert.equal(await hit(limiter, '203.0.113.10'), 200)
	assert.equal(await hit(limiter, '203.0.113.10'), 429)
	assert.equal(await hit(limiter, '203.0.113.11'), 200)
})

test('RateLimiterHandler is a singleton exposing baseline and strict limiters', () => {
	const a = RateLimiterHandler.getInstance()
	const b = RateLimiterHandler.getInstance()

	assert.equal(a, b)
	assert.equal(typeof a.getBaselineLimiter(), 'function')
	assert.equal(typeof a.getStrictLimiter(), 'function')
})
