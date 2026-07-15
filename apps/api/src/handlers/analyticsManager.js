const AnalyticsManager = require('@auth-service/analytics-manager')
const envVars = require('@auth-service/env-variables')

class AnalyticsManagerHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	analyticsManager

	/**
	 * @private
	 */
	constructor() {
		this.analyticsManager = new AnalyticsManager({
			prefix: envVars.METRICS_PREFIX || '',
			metricsRoute: envVars.METRICS_ROUTE || '/metrics',
			metricsToken: envVars.METRICS_TOKEN || ''
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new AnalyticsManagerHandler()
		return this.instance
	}

	getMiddleware() {
		return this.analyticsManager.getMiddleware()
	}

	getMetricsRoute() {
		return this.analyticsManager.getMetricsRoute()
	}

	// Mounts the scrape endpoint (GET <metricsRoute>) on the Express app, outside the API router.
	// The package owns the route and its optional token guard (public by default, 401 when a
	// METRICS_TOKEN is configured and the scrape sends no/!matching bearer token).
	setupMetricsEndpoint(app) {
		this.analyticsManager.setupMetricsEndpoint(app)
	}
}

module.exports = AnalyticsManagerHandler
