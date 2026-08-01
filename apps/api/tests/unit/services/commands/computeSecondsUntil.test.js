const { test } = require('node:test')
const assert = require('node:assert/strict')
const DataValidatorHandler = require('../../../../src/handlers/dataValidator')
const ComputeSecondsUntil = require('../../../../src/services/commands/computeSecondsUntil')

const luxon = DataValidatorHandler.getInstance().getLuxon()

test('ComputeSecondsUntil — returns ~300 seconds for a date 5 minutes in the future', () => {
	const command = ComputeSecondsUntil.getInstance()
	const date = luxon.DateTime.now().setZone('utc').plus({ minutes: 5 }).toJSDate()

	const seconds = command.execute({ luxon, date })

	assert.ok(seconds > 295 && seconds <= 300, `expected ~300 seconds, got ${seconds}`)
})

test('ComputeSecondsUntil — never returns a negative number for a date already in the past', () => {
	const command = ComputeSecondsUntil.getInstance()
	const date = luxon.DateTime.now().setZone('utc').minus({ minutes: 5 }).toJSDate()

	const seconds = command.execute({ luxon, date })

	assert.equal(seconds, 0)
})
