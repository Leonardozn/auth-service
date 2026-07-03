const test = require('node:test')
const assert = require('node:assert/strict')
const HealthController = require('../../../src/controllers/health')

function buildRes() {
	const res = {}
	res.statusCode = null
	res.body = null
	res.status = function (code) {
		res.statusCode = code
		return res
	}
	res.json = function (payload) {
		res.body = payload
		return res
	}
	return res
}

test('health — returns the standard envelope with status Ok (FR-G3)', () => {
	const controller = HealthController.getInstance()
	const res = buildRes()

	controller.health({}, res)

	assert.equal(res.statusCode, 200)
	assert.deepEqual(res.body, {
		success: true,
		message: 'Success!',
		statusCode: 200,
		content: { data: 'Ok' }
	})
})

test('health — getInstance always returns the same singleton', () => {
	const first = HealthController.getInstance()
	const second = HealthController.getInstance()

	assert.equal(first, second)
})
