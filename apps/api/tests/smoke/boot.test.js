const test = require('node:test')
const assert = require('node:assert/strict')
const { runApp } = require('../support/run-app')

test('app boots and GET {path}/health returns 200 (L3 smoke, DB mocked)', async () => {
	const app = await runApp()

	try {
		const res = await app.request('GET', `${app.path}/health`)

		assert.equal(res.status, 200)
		assert.deepEqual(res.body, {
			success: true,
			message: 'Success!',
			statusCode: 200,
			content: { data: 'Ok' }
		})
	} finally {
		await app.stop()
	}
})
