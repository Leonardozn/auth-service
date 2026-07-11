const RateLimiter = require('@auth-service/rate-limiter')
const envVars = require('./envVariables')

class RateLimiterHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	rateLimiter

	/**
	 * @private
	 */
	constructor() {
		this.rateLimiter = new RateLimiter()
	}

	static getInstance() {
		if (!this.instance) this.instance = new RateLimiterHandler()
		return this.instance
	}

	// Global baseline: a generous per-IP cap on every API route to blunt scraping / crude DoS
	// without getting in a normal user's way. Window/max come from env with sensible fallbacks.
	getBaselineLimiter() {
		return this.rateLimiter.createLimiter({
			windowMs: Number(envVars.RATE_LIMIT_WINDOW_MS || 60000),
			max: Number(envVars.RATE_LIMIT_MAX || 300)
		})
	}

	// Strict: a low per-IP cap for sensitive unauthenticated endpoints (login, register, the reset
	// flow) to stop credential brute-force and email/account-creation abuse. Each call returns an
	// independent limiter, so every endpoint it's mounted on gets its own budget.
	getStrictLimiter() {
		return this.rateLimiter.createLimiter({
			windowMs: Number(envVars.RATE_LIMIT_STRICT_WINDOW_MS || 900000),
			max: Number(envVars.RATE_LIMIT_STRICT_MAX || 10)
		})
	}
}

module.exports = RateLimiterHandler
