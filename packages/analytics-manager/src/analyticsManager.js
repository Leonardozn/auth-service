const client = require('prom-client')
const crypto = require('crypto')

const BEARER_PATTERN = /^Bearer (.+)$/i

// Latency buckets (seconds) — a generic spread that covers fast in-memory handlers up to
// slow upstream/IO calls; override via options.buckets for a service with different SLOs.
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

// Generic, project-agnostic Prometheus metrics for any backend HTTP microservice: the Node
// process default metrics plus the classic HTTP RED signals (Rate, Errors, Duration). It holds
// its own prom-client Registry (never the global one) so multiple services — or several
// instances in a test — never clash over metric registration.
class AnalyticsManager {
	/**
	 * @param { Object } [options]
	 * @param { string } [options.prefix=''] - Prefix prepended to every metric name (e.g. "auth_").
	 * @param { string } [options.metricsRoute='/metrics'] - Path the scrape endpoint is served on;
	 *   also the path the middleware skips so the scrape itself is never measured.
	 * @param { boolean } [options.collectDefault=true] - Collect Node process default metrics
	 *   (CPU, memory, event-loop lag, GC, ...). Disable in unit tests to avoid its background timer.
	 * @param { number[] } [options.buckets] - Histogram buckets (seconds) for request duration.
	 * @param { Object } [options.defaultLabels] - Labels attached to every metric (rarely needed;
	 *   Prometheus usually adds `job`/`instance` at scrape time).
	 * @param { string } [options.metricsToken=''] - Static bearer token the scrape endpoint requires.
	 *   Empty (the default) leaves the endpoint public; set it to gate `/metrics` behind
	 *   `Authorization: Bearer <token>` (matches Prometheus's `bearer_token` scrape option).
	 */
	constructor(options = {}) {
		const prefix = options.prefix || ''
		this.metricsRoute = options.metricsRoute || '/metrics'
		this.metricsToken = options.metricsToken || ''
		this.register = new client.Registry()

		if (options.defaultLabels) this.register.setDefaultLabels(options.defaultLabels)
		if (options.collectDefault !== false) client.collectDefaultMetrics({ register: this.register, prefix })

		this.httpRequestsTotal = new client.Counter({
			name: `${prefix}http_requests_total`,
			help: 'Total number of HTTP requests handled, labeled by method, route and status code.',
			labelNames: ['method', 'route', 'status_code'],
			registers: [this.register]
		})

		this.httpRequestDuration = new client.Histogram({
			name: `${prefix}http_request_duration_seconds`,
			help: 'Duration of HTTP requests in seconds, labeled by method, route and status code.',
			labelNames: ['method', 'route', 'status_code'],
			buckets: options.buckets || DEFAULT_BUCKETS,
			registers: [this.register]
		})

		this.httpRequestsInFlight = new client.Gauge({
			name: `${prefix}http_requests_in_flight`,
			help: 'Number of HTTP requests currently being processed.',
			registers: [this.register]
		})
	}

	// Resolves the low-cardinality route label from the *matched* Express route pattern
	// (e.g. "/api/user/:id"), never the raw URL, so real ids don't explode the label space.
	// Unmatched requests (404s on arbitrary paths) all collapse to a single "unmatched" series.
	_resolveRoute(req) {
		const routePath = req.route && req.route.path ? req.route.path : ''
		const full = `${req.baseUrl || ''}${routePath}`
		return full || 'unmatched'
	}

	/**
	 * Express middleware that records the HTTP RED metrics for every request. Mount it once,
	 * app-wide, before the routers. The scrape endpoint itself is skipped.
	 * @returns { import('express').RequestHandler }
	 */
	getMiddleware() {
		return (req, res, next) => {
			if (req.path === this.metricsRoute) return next()

			const endTimer = this.httpRequestDuration.startTimer()
			this.httpRequestsInFlight.inc()

			res.on('finish', () => {
				this.httpRequestsInFlight.dec()
				const labels = {
					method: req.method,
					route: this._resolveRoute(req),
					status_code: String(res.statusCode)
				}
				this.httpRequestsTotal.inc(labels)
				endTimer(labels)
			})

			next()
		}
	}

	// The Prometheus exposition text for the scrape endpoint.
	getMetrics() {
		return this.register.metrics()
	}

	// Content-Type Prometheus expects on the scrape response.
	getContentType() {
		return this.register.contentType
	}

	getMetricsRoute() {
		return this.metricsRoute
	}

	// True when the request may read the metrics: always so if no token is configured (public by
	// default), otherwise only with a matching `Authorization: Bearer <token>`. The comparison is
	// constant-time to avoid leaking the token through response timing.
	_isAuthorized(req) {
		if (!this.metricsToken) return true

		const header = req.headers && req.headers.authorization
		const match = typeof header === 'string' && header.match(BEARER_PATTERN)
		if (!match) return false

		const provided = Buffer.from(match[1])
		const expected = Buffer.from(this.metricsToken)
		return provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
	}

	// Mounts the scrape endpoint (GET <metricsRoute>) on the given Express app, outside the API
	// router. Public by default; when a metricsToken is configured, an unauthenticated scrape gets
	// 401. Kept in the package (not the app handler) so the endpoint and its guard travel together.
	setupMetricsEndpoint(app) {
		app.get(this.metricsRoute, async (req, res) => {
			if (!this._isAuthorized(req)) {
				res.status(401).set('WWW-Authenticate', 'Bearer').end()
				return
			}

			res.set('Content-Type', this.getContentType())
			res.end(await this.getMetrics())
		})
	}

	// Escape hatch for registering extra custom metrics on the same registry.
	getRegister() {
		return this.register
	}
}

module.exports = AnalyticsManager
