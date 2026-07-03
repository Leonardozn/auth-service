const HealthController = require('../controllers/health')

/**
 * @openapi
 * tags:
 *   - name: Health
 *     description: Liveness check.
 *
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness check
 *     description: Always returns 200 with a static payload - used by deployment/orchestration tooling and the e2e test harness to know the server has finished booting.
 *     responses:
 *       200:
 *         description: Server is up
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { data: "Ok" } }
 */
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