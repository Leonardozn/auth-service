const rateLimit = require('express-rate-limit')

// Thin wrapper around express-rate-limit — the service config (window, max, message) is injected by
// the handler, the same way cors-policy wraps cors. Each createLimiter() call returns an independent
// middleware with its own in-memory counter, so a caller can give each endpoint its own budget.
class RateLimiter {
	/**
	 * @param { Object } [settings]
	 * @param { number } [settings.windowMs] - Rolling window in milliseconds.
	 * @param { number } [settings.max] - Max requests allowed per key (IP) within the window.
	 * @param { Object|string } [settings.message] - Body returned with 429 when the limit is hit.
	 * @returns { import('express').RequestHandler }
	 */
	createLimiter(settings = {}) {
		return rateLimit({
			windowMs: settings.windowMs,
			limit: settings.max,
			standardHeaders: 'draft-7',
			legacyHeaders: false,
			message: settings.message || {
				success: false,
				message: 'Too many requests, please try again later.',
				statusCode: 429,
				content: null
			}
		})
	}
}

module.exports = RateLimiter
