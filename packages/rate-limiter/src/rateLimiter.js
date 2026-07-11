const rateLimit = require('express-rate-limit')
const { TooManyRequestsError } = require('@auth-service/handle-errors')
const { HandleResponse } = require('@auth-service/handle-response')

// Thin wrapper around express-rate-limit — the service config (window, max, message) is injected by
// the handler, the same way cors-policy wraps cors. Each createLimiter() call returns an independent
// middleware with its own in-memory counter, so a caller can give each endpoint its own budget.
class RateLimiter {
	/**
	 * @param { Object } [settings]
	 * @param { number } [settings.windowMs] - Rolling window in milliseconds.
	 * @param { number } [settings.max] - Max requests allowed per key (IP) within the window.
	 * @param { Object|string } [settings.message] - Body returned with 429 when the limit is hit.
	 *   Defaults to the standard error envelope built from TooManyRequestsError.
	 * @returns { import('express').RequestHandler }
	 */
	createLimiter(settings = {}) {
		// Build the 429 body from TooManyRequestsError through handle-response — the same machinery
		// every other error response uses, so a rate-limited response is the standard envelope
		// (statusCode 429) rather than a hand-written one.
		const message = settings.message || new HandleResponse().buildResponse(
			new TooManyRequestsError('Too many requests, please try again later.')
		)

		return rateLimit({
			windowMs: settings.windowMs,
			limit: settings.max,
			standardHeaders: 'draft-7',
			legacyHeaders: false,
			message
		})
	}
}

module.exports = RateLimiter
