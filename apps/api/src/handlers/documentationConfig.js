const DocumentationConfig = require('@auth-service/documentation-config')

class DocumentationConfigHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	documentationConfig

	constructor() {
		this.documentationConfig = DocumentationConfig.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new DocumentationConfigHandler()
		return this.instance
	}

	/**
	 * Initialize swagger configuration
	 * @param {Object} options - Swagger configuration options
	 * @returns {Object} Swagger specification
	 */
	initialize(options) {
		return this.documentationConfig.initialize(options)
	}

	/**
	 * Get swagger specification
	 * @returns {Object} Swagger specification
	 */
	getSpec() {
		return this.documentationConfig.getSpec()
	}

	/**
	 * Get swagger UI middleware
	 * @returns {Function} Swagger UI middleware
	 */
	getSwaggerUi() {
		return this.documentationConfig.getSwaggerUi()
	}

	/**
	 * Setup swagger UI route
	 * @param {Object} app - Express app instance
	 * @param {string} path - Path for swagger UI
	 */
	setupSwaggerUI(app, path) {
		return this.documentationConfig.setupSwaggerUI(app, path)
	}
}

module.exports = DocumentationConfigHandler