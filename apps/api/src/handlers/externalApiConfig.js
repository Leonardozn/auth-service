const ExternalApiConfig = require('@auth-service/external-api-config')

class ExternalApiConfigHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	externalApiConfig

	/**
	 * @private
	 */
	constructor() {
		this.externalApiConfig = new ExternalApiConfig()
	}

	/**
	 * Returns the singleton instance of ExternalApiConfigHandler
	 * @returns {ExternalApiConfigHandler} The singleton instance
	 */
	static getInstance() {
		if (!this.instance) this.instance = new ExternalApiConfigHandler()
		return this.instance
	}

	/**
	 * Creates a configured axios instance through the helper layer
	 * @param {Object} config - Axios configuration object
	 * @param {string} config.baseURL - Base URL for the API
	 * @param {number} config.timeout - Request timeout in milliseconds
	 * @param {Object} config.headers - Default headers
	 * @returns {Object} Configured axios instance
	 */
	createInstance(config = {}) {
		return this.externalApiConfig.createInstance(config)
	}

	/**
	 * Creates multiple axios instances through the helper layer
	 * @param {Object} configs - Object with service names as keys and config objects as values
	 * @returns {Object} Object with service names as keys and axios instances as values
	 */
	createMultipleInstances(configs = {}) {
		return this.externalApiConfig.createMultipleInstances(configs)
	}

	/**
	 * Get the base axios instance through the helper layer
	 * @returns {Object} Base axios instance
	 */
	getBaseAxios() {
		return this.externalApiConfig.getBaseAxios()
	}
}

module.exports = ExternalApiConfigHandler