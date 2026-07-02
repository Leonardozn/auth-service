const HealthController = require('../controllers/health')

class HealthRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	healthController

	constructor() {
		this.healthController = HealthController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new HealthRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/health',
			paths: [
				{ requestMethod: 'get', path: '', controllerMethod: this.healthController.health }
			]
		}
	}
}

module.exports = HealthRouter