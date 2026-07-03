const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

class DocumentationConfig {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	swaggerSpec

	constructor() {
		this.swaggerSpec = null
	}

	static getInstance() {
		if (!this.instance) this.instance = new DocumentationConfig()
		return this.instance
	}

	/**
	 * Initialize swagger configuration
	 * @param {Object} options - Swagger configuration options
	 * @param {string} options.title - API title
	 * @param {string} options.version - API version
	 * @param {string} options.description - API description
	 * @param {string} options.serverUrl - Server URL
	 * @param {Array<string>} options.apiPaths - Paths to API files for documentation
	 * @returns {Object} Swagger specification
	 */
	initialize(options) {
		const {
			title = 'API Documentation',
			version = '1.0.0',
			description = 'API documentation',
			serverUrl = 'http://localhost:3000',
			apiPaths = ['./apps/api/src/routes/*.js']
		} = options

		const swaggerOptions = {
			definition: {
				openapi: '3.0.0',
				info: {
					title,
					version,
					description
				},
				servers: [
					{
						url: serverUrl,
						description: 'Development server'
					}
				],
				components: {
					securitySchemes: {
						cookieAuth: {
							type: 'apiKey',
							in: 'cookie',
							name: 'st'
						},
						bearerAuth: {
							type: 'http',
							scheme: 'bearer',
							description: 'Opaque access token issued by POST /auth/login (or rotated by POST /auth/refresh), sent as "Authorization: Bearer <token>".'
						}
					}
				}
			},
			apis: apiPaths
		}

		this.swaggerSpec = swaggerJsdoc(swaggerOptions)
		return this.swaggerSpec
	}

	/**
	 * Get swagger specification
	 * @returns {Object} Swagger specification
	 */
	getSpec() {
		return this.swaggerSpec
	}

	/**
	 * Get swagger UI middleware
	 * @returns {Function} Swagger UI middleware
	 */
	getSwaggerUi() {
		return swaggerUi
	}

	/**
	 * Setup swagger UI route
	 * @param {Object} app - Express app instance
	 * @param {string} path - Path for swagger UI (default: /api-docs)
	 */
	setupSwaggerUI(app, path = '/api-docs') {
		if (!this.swaggerSpec) {
			throw new Error('Swagger specification not initialized. Call initialize() first.')
		}

		app.use(path, swaggerUi.serve, swaggerUi.setup(this.swaggerSpec, {
			customCss: '.swagger-ui .topbar { display: none }',
			customSiteTitle: 'API Documentation'
		}))
	}
}

module.exports = DocumentationConfig