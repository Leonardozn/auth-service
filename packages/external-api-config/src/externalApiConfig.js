const axios = require('axios')

/**
 * ExternalApiConfig - Basic configuration for external API connections
 * Provides a centralized way to create and manage axios instances for external services
 */
class ExternalApiConfig {
	/**
	 * Creates a configured axios instance
	 * @param {Object} config - Axios configuration object
	 * @param {string} config.baseURL - Base URL for the API
	 * @param {number} config.timeout - Request timeout in milliseconds (default: 10000)
	 * @param {Object} config.headers - Default headers
	 * @param {Object} config.auth - Authentication configuration
	 * @returns {Object} Configured axios instance
	 */
	createInstance(config = {}) {
		const defaultConfig = {
			timeout: 10000,
			headers: {
				'Content-Type': 'application/json'
			}
		}

		const mergedConfig = { ...defaultConfig, ...config }
		const instance = axios.create(mergedConfig)

		// Add request interceptor for logging and token injection
		instance.interceptors.request.use(
			(request) => {
				// You can add custom logic here (e.g., token injection, logging)
				return request
			},
			(error) => {
				return Promise.reject(error)
			}
		)

		// Add response interceptor for error handling
		instance.interceptors.response.use(
			(response) => {
				return response
			},
			(error) => {
				// Centralized error handling
				if (error.response) {
					// Server responded with error status
					console.error(`API Error: ${error.response.status} - ${error.response.statusText}`)
				} else if (error.request) {
					// Request was made but no response received
					console.error('API Error: No response received from server')
				} else {
					// Error in request configuration
					console.error('API Error:', error.message)
				}
				return Promise.reject(error)
			}
		)

		return instance
	}

	/**
	 * Creates multiple axios instances for different services
	 * @param {Object} configs - Object with service names as keys and config objects as values
	 * @returns {Object} Object with service names as keys and axios instances as values
	 */
	createMultipleInstances(configs = {}) {
		const instances = {}
		
		for (const [serviceName, config] of Object.entries(configs)) {
			instances[serviceName] = this.createInstance(config)
		}

		return instances
	}

	/**
	 * Get the base axios instance without custom configuration
	 * @returns {Object} Base axios instance
	 */
	getBaseAxios() {
		return axios
	}
}

module.exports = ExternalApiConfig