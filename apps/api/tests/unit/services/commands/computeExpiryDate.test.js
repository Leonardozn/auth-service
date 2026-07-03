const { test } = require('node:test')
const assert = require('node:assert/strict')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const ComputeExpiryDate = require('../../../../src/services/commands/computeExpiryDate')

const luxon = DataValidatorHandler.getInstance().getLuxon()

test('ComputeExpiryDate — adds minutes for an "m" duration', () => {
	const command = ComputeExpiryDate.getInstance()
	const before = luxon.DateTime.now().setZone('utc')

	const result = command.execute({ luxon, duration: '15m' })

	const diffMinutes = luxon.DateTime.fromJSDate(result, { zone: 'utc' }).diff(before, 'minutes').minutes
	assert.ok(diffMinutes > 14.9 && diffMinutes <= 15.1, `expected ~15 minutes, got ${diffMinutes}`)
})

test('ComputeExpiryDate — adds days for a "d" duration', () => {
	const command = ComputeExpiryDate.getInstance()
	const before = luxon.DateTime.now().setZone('utc')

	const result = command.execute({ luxon, duration: '5d' })

	const diffDays = luxon.DateTime.fromJSDate(result, { zone: 'utc' }).diff(before, 'days').days
	assert.ok(diffDays > 4.99 && diffDays <= 5.01, `expected ~5 days, got ${diffDays}`)
})

test('ComputeExpiryDate — throws on an invalid duration format', () => {
	const command = ComputeExpiryDate.getInstance()

	assert.throws(() => command.execute({ luxon, duration: 'not-a-duration' }))
})
