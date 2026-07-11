const helmet = require('helmet')

// Thin wrapper around helmet — the service policy (CSP on/off, CORP, HSTS) is injected by the
// handler, the same way cors-policy wraps cors. Returns a single Express middleware that sets the
// security response headers.
class SecurityHeaders {
	/**
	 * @param { Object } [settings] - helmet options (e.g. contentSecurityPolicy, hsts,
	 *   crossOriginResourcePolicy). Passed straight through to helmet.
	 * @returns { import('express').RequestHandler }
	 */
	getMiddleware(settings = {}) {
		return helmet(settings)
	}
}

module.exports = SecurityHeaders
