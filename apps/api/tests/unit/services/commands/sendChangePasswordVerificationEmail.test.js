const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendChangePasswordVerificationEmail = require('../../../../src/services/commands/sendChangePasswordVerificationEmail')

test('SendChangePasswordVerificationEmail — sends the email with the code embedded', async () => {
	let capturedConfig
	const emailManagerHandler = {
		send: async (config) => {
			capturedConfig = config
			return { id: 'resend-id' }
		}
	}
	const command = SendChangePasswordVerificationEmail.getInstance()

	const result = await command.execute({
		emailManagerHandler,
		apiUrl: 'https://api.resend.com/emails',
		resendToken: 're_test',
		from: 'onboarding@resend.dev',
		to: 'ada@example.com',
		code: '482913'
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(capturedConfig.apiUrl, 'https://api.resend.com/emails')
	assert.equal(capturedConfig.token, 're_test')
	assert.equal(capturedConfig.from, 'onboarding@resend.dev')
	assert.equal(capturedConfig.to, 'ada@example.com')
	assert.match(capturedConfig.html, /482913/)
})
