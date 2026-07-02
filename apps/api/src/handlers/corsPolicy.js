CorsPolicy = require('@auth-service/cors-policy')

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

	getPolicy(settings={}) {
		return this.corsPolicy.getPolicy(settings)
	}
}

module.exports = CorsPolicyHandler