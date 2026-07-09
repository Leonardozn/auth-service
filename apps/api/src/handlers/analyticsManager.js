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
			metricsRoute: envVars.METRICS_ROUTE || '/metrics'
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

	// Mounts the scrape endpoint (GET <metricsRoute>) directly on the Express app, outside the
	// API router, so it stays public for Prometheus and free of the per-route auth checks.
	setupMetricsEndpoint(app) {
		app.get(this.analyticsManager.getMetricsRoute(), async (req, res) => {
			res.set('Content-Type', this.analyticsManager.getContentType())
			res.end(await this.analyticsManager.getMetrics())
		})
	}
}

module.exports = AnalyticsManagerHandler
