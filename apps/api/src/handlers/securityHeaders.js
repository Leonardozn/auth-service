const SecurityHeaders = require('@auth-service/security-headers')
const envVars = require('./envVariables')

class SecurityHeadersHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	securityHeaders

	/**
	 * @private
	 */
	constructor() {
		this.securityHeaders = new SecurityHeaders()
	}

	static getInstance() {
		if (!this.instance) this.instance = new SecurityHeadersHandler()
		return this.instance
	}

	// Builds the helmet middleware for this service:
	// - contentSecurityPolicy is OFF: these are JSON APIs (CSP guards HTML pages, which the frontend
	//   serves) and helmet's default CSP would also break the Swagger UI page's inline scripts.
	// - HSTS only outside develop mode — it only makes sense over HTTPS, so it's off on local HTTP.
	// - Cross-Origin-Resource-Policy from env (default 'same-origin'); a service that serves files
	//   embedded cross-origin (e.g. <img> from another origin) sets 'cross-origin'.
	getMiddleware() {
		const isDev = envVars.DEVELOP_MODE === 'true'

		return this.securityHeaders.getMiddleware({
			contentSecurityPolicy: false,
			hsts: !isDev,
			crossOriginResourcePolicy: { policy: envVars.SECURITY_CORP_POLICY || 'same-origin' }
		})
	}
}

module.exports = SecurityHeadersHandler
