CorsPolicy = require('@auth-service/cors-policy')

const envVars = require('./envVariables')

class CorsPolicyHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	corsPolicy

	/**
	 * @private
	 */
	constructor() {
		this.corsPolicy = new CorsPolicy()
	}

	static getInstance() {
		if (!this.instance) this.instance = new CorsPolicyHandler()
		return this.instance
	}

	// Builds the CORS policy from CORS_ALLOWED_ORIGINS (a comma-separated origin whitelist). When the
	// evar is empty/undefined the policy stays OPEN (origin '*'): a service is public by default and
	// is restricted to specific origins only when the deployment sets the whitelist. Falls back to ''
	// so the fully-mocked test suite runs without the evar present.
	getPolicy() {
		const raw = envVars.CORS_ALLOWED_ORIGINS || ''
		const origins = raw.split(',').map(origin => origin.trim()).filter(Boolean)
		const settings = {
			origin: origins.length > 0 ? origins : '*',
			methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization']
		}
		return this.corsPolicy.getPolicy(settings)
	}
}

module.exports = CorsPolicyHandler
