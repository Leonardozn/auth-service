const test = require('node:test')
const assert = require('node:assert/strict')

const AnalyticsManager = require('@auth-service/analytics-manager')
const AnalyticsManagerHandler = require('../../../src/handlers/analyticsManager')

// Drives one request through the middleware and fires the response's "finish" event, the way
// Express would once the response is fully sent. Returns nothing — assertions read the registry.
function runRequest(manager, req) {
	let finish
	const res = {
		statusCode: req._status || 200,
		on: (event, cb) => { if (event === 'finish') finish = cb }
	}
	manager.getMiddleware()(req, res, () => {})
	if (finish) finish()
}

test('AnalyticsManager records total + duration with the matched route pattern and status code', async () => {
	const manager = new AnalyticsManager({ collectDefault: false })

	runRequest(manager, { method: 'GET', path: '/api/user/665f', baseUrl: '/api', route: { path: '/user/:id' }, _status: 200 })

	const metrics = await manager.getMetrics()
	// The label is the route *pattern* (/user/:id), never the real id — that keeps cardinality bounded.
	assert.match(metrics, /http_requests_total\{method="GET",route="\/api\/user\/:id",status_code="200"\} 1/)
	assert.match(metrics, /http_request_duration_seconds_count\{method="GET",route="\/api\/user\/:id",status_code="200"\} 1/)
	assert.match(metrics, /http_requests_in_flight 0/)
})

test('AnalyticsManager buckets errors by status_code on the same route', async () => {
	const manager = new AnalyticsManager({ collectDefault: false })

	runRequest(manager, { method: 'POST', path: '/api/auth/login', baseUrl: '/api', route: { path: '/auth/login' }, _status: 401 })

	const metrics = await manager.getMetrics()
	assert.match(metrics, /http_requests_total\{method="POST",route="\/api\/auth\/login",status_code="401"\} 1/)
})

test('AnalyticsManager does not self-count the scrape endpoint', async () => {
	const manager = new AnalyticsManager({ collectDefault: false, metricsRoute: '/metrics' })

	runRequest(manager, { method: 'GET', path: '/metrics', baseUrl: '', route: { path: '/metrics' }, _status: 200 })

	const metrics = await manager.getMetrics()
	assert.doesNotMatch(metrics, /http_requests_total\{[^}]*route="\/metrics"/)
})

test('AnalyticsManager collapses an unmatched request to a single "unmatched" series', async () => {
	const manager = new AnalyticsManager({ collectDefault: false })

	// No req.route (a 404 on an arbitrary path) — must not leak the raw URL as a label.
	runRequest(manager, { method: 'GET', path: '/totally/unknown/12345', baseUrl: '', route: undefined, _status: 404 })

	const metrics = await manager.getMetrics()
	assert.match(metrics, /http_requests_total\{method="GET",route="unmatched",status_code="404"\} 1/)
	assert.doesNotMatch(metrics, /route="\/totally\/unknown\/12345"/)
})

test('AnalyticsManager exposes the Prometheus text content type', () => {
	const manager = new AnalyticsManager({ collectDefault: false })
	assert.match(manager.getContentType(), /text\/plain/)
	assert.match(manager.getContentType(), /version=0\.0\.4/)
})

test('AnalyticsManagerHandler is a singleton exposing the middleware and default /metrics route', () => {
	const a = AnalyticsManagerHandler.getInstance()
	const b = AnalyticsManagerHandler.getInstance()
	assert.equal(a, b)
	assert.equal(typeof a.getMiddleware(), 'function')
	assert.equal(a.getMetricsRoute(), '/metrics')
})

// Mounts setupMetricsEndpoint on a fake Express app, captures the scrape handler, and drives one
// request through it. Returns the status/headers/body the handler produced.
async function scrape(manager, headers = {}) {
	let handler
	manager.setupMetricsEndpoint({ get: (route, routeHandler) => { handler = routeHandler } })

	const captured = { status: 200, headers: {}, body: '' }
	const res = {
		status(code) { captured.status = code; return res },
		set(key, value) { captured.headers[key.toLowerCase()] = value; return res },
		end(payload) { if (payload !== undefined) captured.body = payload }
	}
	await handler({ headers }, res)
	return captured
}

test('AnalyticsManager scrape endpoint stays public when no token is configured', async () => {
	const manager = new AnalyticsManager({ collectDefault: false })

	const res = await scrape(manager)
	assert.equal(res.status, 200)
	assert.match(res.headers['content-type'], /text\/plain/)
})

test('AnalyticsManager scrape endpoint returns 401 without the configured token', async () => {
	const manager = new AnalyticsManager({ collectDefault: false, metricsToken: 'secret' })

	const res = await scrape(manager)
	assert.equal(res.status, 401)
	assert.equal(res.headers['www-authenticate'], 'Bearer')
})

test('AnalyticsManager scrape endpoint returns 401 with a wrong token', async () => {
	const manager = new AnalyticsManager({ collectDefault: false, metricsToken: 'secret' })

	const res = await scrape(manager, { authorization: 'Bearer nope' })
	assert.equal(res.status, 401)
})

test('AnalyticsManager scrape endpoint serves metrics with the matching token', async () => {
	const manager = new AnalyticsManager({ collectDefault: false, metricsToken: 'secret' })

	const res = await scrape(manager, { authorization: 'Bearer secret' })
	assert.equal(res.status, 200)
	assert.match(res.headers['content-type'], /text\/plain/)
})
