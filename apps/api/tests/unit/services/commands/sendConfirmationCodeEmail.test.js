const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendConfirmationCodeEmail = require('../../../../src/services/commands/sendConfirmationCodeEmail')

test('SendConfirmationCodeEmail — sends the email with the code embedded, never as a link', async () => {
	let capturedConfig
	const emailManagerHandler = {
		send: async (config) => {
			capturedConfig = config
			return { id: 'resend-id' }
		}
	}
	const command = SendConfirmationCodeEmail.getInstance()

	const result = await command.execute({
		emailManagerHandler,
		apiUrl: 'https://api.resend.com/emails',
		resendToken: 're_test',
		from: 'onboarding@resend.dev',
		to: 'ada@example.com',
		code: '482913',
		expiresInSeconds: 300,
		brandName: 'Acme',
		brandLogoUrl: ''
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(capturedConfig.to, 'ada@example.com')
	assert.match(capturedConfig.html, /482913/)
	assert.doesNotMatch(capturedConfig.html, /<a\s/i)
	assert.match(capturedConfig.html, /5 minutes/)
	assert.match(capturedConfig.html, /Acme/)
})

test('SendConfirmationCodeEmail — shows the logo image when brandLogoUrl is set', async () => {
	let capturedConfig
	const emailManagerHandler = { send: async (config) => { capturedConfig = config; return { id: 'resend-id' } } }
	const command = SendConfirmationCodeEmail.getInstance()

	await command.execute({
		emailManagerHandler, apiUrl: 'https://api.resend.com/emails', resendToken: 're_test',
		from: 'onboarding@resend.dev', to: 'ada@example.com', code: '482913', expiresInSeconds: 60,
		brandName: 'Acme', brandLogoUrl: 'https://acme.test/logo.png'
	})

	assert.match(capturedConfig.html, /<img[^>]+src="https:\/\/acme\.test\/logo\.png"/)
})

test('SendConfirmationCodeEmail — propagates a raw Resend failure uncaught (so it maps to 502 upstream)', async () => {
	const emailManagerHandler = {
		send: async () => {
			const err = new Error('Request failed with status code 401')
			err.isAxiosError = true
			throw err
		}
	}
	const command = SendConfirmationCodeEmail.getInstance()

	await assert.rejects(
		() => command.execute({
			emailManagerHandler, apiUrl: 'https://api.resend.com/emails', resendToken: 're_test',
			from: 'onboarding@resend.dev', to: 'ada@example.com', code: '482913', expiresInSeconds: 300,
			brandName: 'Acme', brandLogoUrl: ''
		}),
		(error) => {
			assert.equal(error.isAxiosError, true)
			return true
		}
	)
})
