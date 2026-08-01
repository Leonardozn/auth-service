const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../../support/run-app')

// The strict limiter is mounted per sensitive auth endpoint. With the max lowered to 2, the third
// login attempt from the same client must be rejected with 429 before it even reaches the
// controller — proving credential brute-force is throttled. The first two return 401 (no such user,
// DB mocked) because they run normally, under the cap.
test('auth routes — POST /auth/login is blocked with 429 past the strict rate limit', async () => {
	const app = await runApp({ RATE_LIMIT_STRICT_MAX: '2', RATE_LIMIT_STRICT_WINDOW_MS: '60000' })

	try {
		const creds = { email: 'nobody@example.com', password: 'whatever' }

		const first = await app.request('POST', `${app.path}/auth/login`, creds)
		const second = await app.request('POST', `${app.path}/auth/login`, creds)
		const third = await app.request('POST', `${app.path}/auth/login`, creds)

		assert.equal(first.status, 401)
		assert.equal(second.status, 401)
		assert.equal(third.status, 429)
	} finally {
		await app.stop()
	}
})

// The strict limiter gives each endpoint its own budget: exhausting /auth/login must not spend
// /auth/register's allowance.
test('auth routes — each sensitive endpoint has its own strict budget', async () => {
	const app = await runApp({ RATE_LIMIT_STRICT_MAX: '1', RATE_LIMIT_STRICT_WINDOW_MS: '60000' })

	try {
		const loginOne = await app.request('POST', `${app.path}/auth/login`, { email: 'a@b.com', password: 'x' })
		const loginTwo = await app.request('POST', `${app.path}/auth/login`, { email: 'a@b.com', password: 'x' })
		// /auth/register still has its full budget despite /auth/login being exhausted.
		const register = await app.request('POST', `${app.path}/auth/register`, { name: 'A', email: 'a@b.com', password: 'x' })

		assert.equal(loginOne.status, 401)
		assert.equal(loginTwo.status, 429)
		assert.notEqual(register.status, 429)
	} finally {
		await app.stop()
	}
})

// The three new confirmation-code endpoints are exactly as sensitive/unauthenticated as
// register/login (account-existence probing, code brute-forcing) - each gets the same strict,
// per-path budget as the routes above.
test('auth routes — POST /auth/email-status is blocked with 429 past the strict rate limit', async () => {
	const app = await runApp({ RATE_LIMIT_STRICT_MAX: '2', RATE_LIMIT_STRICT_WINDOW_MS: '60000' })

	try {
		const body = { email: 'nobody@example.com' }

		const first = await app.request('POST', `${app.path}/auth/email-status`, body)
		const second = await app.request('POST', `${app.path}/auth/email-status`, body)
		const third = await app.request('POST', `${app.path}/auth/email-status`, body)

		assert.equal(first.status, 200)
		assert.equal(second.status, 200)
		assert.equal(third.status, 429)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/send-confirmation-code is blocked with 429 past the strict rate limit', async () => {
	const app = await runApp({ RATE_LIMIT_STRICT_MAX: '2', RATE_LIMIT_STRICT_WINDOW_MS: '60000' })

	try {
		const body = { email: 'nobody@example.com' }

		const first = await app.request('POST', `${app.path}/auth/send-confirmation-code`, body)
		const second = await app.request('POST', `${app.path}/auth/send-confirmation-code`, body)
		const third = await app.request('POST', `${app.path}/auth/send-confirmation-code`, body)

		assert.equal(first.status, 404)
		assert.equal(second.status, 404)
		assert.equal(third.status, 429)
	} finally {
		await app.stop()
	}
})

test('auth routes — POST /auth/verify-confirmation-code is blocked with 429 past the strict rate limit', async () => {
	const app = await runApp({ RATE_LIMIT_STRICT_MAX: '2', RATE_LIMIT_STRICT_WINDOW_MS: '60000' })

	try {
		const body = { email: 'nobody@example.com', code: '000000' }

		const first = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, body)
		const second = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, body)
		const third = await app.request('POST', `${app.path}/auth/verify-confirmation-code`, body)

		assert.equal(first.status, 400)
		assert.equal(second.status, 400)
		assert.equal(third.status, 429)
	} finally {
		await app.stop()
	}
})
