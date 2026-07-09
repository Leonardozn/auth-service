const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

// End-to-end: boots the real app (DB mocked) and scrapes GET /metrics the way Prometheus would.
// The metrics endpoint lives at the app root (not under API_PATH) and returns Prometheus text,
// not the JSON envelope, so it's fetched directly rather than through the JSON request helper.
test('GET /metrics exposes Prometheus metrics for scraping (L2 e2e, DB mocked)', async () => {
	const app = await runApp()

	try {
		// Exercise a real route first so the HTTP metrics have at least one observed request.
		await app.request('GET', `${app.path}/health`)

		const res = await fetch(`${app.baseUrl}/metrics`)
		const body = await res.text()

		assert.equal(res.status, 200)
		assert.match(res.headers.get('content-type') || '', /text\/plain/)

		// Node process default metrics are present.
		assert.match(body, /process_cpu_user_seconds_total/)
		// The generic HTTP RED metrics are present and carry a low-cardinality route label.
		assert.match(body, /http_requests_total\{[^}]*route="/)
		assert.match(body, /http_request_duration_seconds_bucket/)
		// The health route we just hit was recorded under its route pattern.
		assert.match(body, /route="[^"]*\/health"/)
	} finally {
		await app.stop()
	}
})
