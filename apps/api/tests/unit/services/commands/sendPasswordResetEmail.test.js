const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendPasswordResetEmail = require('../../../../src/services/commands/sendPasswordResetEmail')

test('SendPasswordResetEmail — sends the email with the reset link embedded', async () => {
	let capturedConfig
	const emailManagerHandler = {
		send: async (config) => {
			capturedConfig = config
			return { id: 'resend-id' }
		}
	}
	const command = SendPasswordResetEmail.getInstance()

	const result = await command.execute({
		emailManagerHandler,
		apiUrl: 'https://api.resend.com/emails',
		resendToken: 're_test',
		from: 'onboarding@resend.dev',
		to: 'ada@example.com',
		resetUrlBase: 'http://localhost:5173/reset-password',
		passwordResetToken: 'opaque-reset-token'
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(capturedConfig.apiUrl, 'https://api.resend.com/emails')
	assert.equal(capturedConfig.token, 're_test')
	assert.equal(capturedConfig.from, 'onboarding@resend.dev')
	assert.equal(capturedConfig.to, 'ada@example.com')
	assert.match(capturedConfig.html, /http:\/\/localhost:5173\/reset-password\?token=opaque-reset-token/)
})
