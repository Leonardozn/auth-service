const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendConfirmationCodeEmail = require('../../../../src/services/commands/sendConfirmationCodeEmail')

const BRAND = { name: 'Acme', logoUrl: '', primaryColor: '#0F4C81', accentColor: '#C2410C', url: '' }

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
		brand: BRAND
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(capturedConfig.to, 'ada@example.com')
	assert.equal(capturedConfig.subject, 'Confirm your email')
	assert.match(capturedConfig.html, /482913/)
	assert.match(capturedConfig.html, /5 minutes/)
	assert.match(capturedConfig.html, /Acme/)
	// Sin dirección de marca configurada no hay un solo enlace en el correo, así que el código no
	// puede ser uno por accidente.
	assert.doesNotMatch(capturedConfig.html, /<a\s/i)
})

test('SendConfirmationCodeEmail — wears the brand colours', async () => {
	let capturedConfig
	const emailManagerHandler = { send: async (config) => { capturedConfig = config; return { id: 'resend-id' } } }
	const command = SendConfirmationCodeEmail.getInstance()

	await command.execute({
		emailManagerHandler, apiUrl: 'https://api.resend.com/emails', resendToken: 're_test',
		from: 'onboarding@resend.dev', to: 'ada@example.com', code: '482913', expiresInSeconds: 300,
		brand: { ...BRAND, primaryColor: '#123456', accentColor: '#abcdef' }
	})

	assert.match(capturedConfig.html, /#123456/)
	assert.match(capturedConfig.html, /#abcdef/)
})

test('SendConfirmationCodeEmail — shows the logo image when the brand has one', async () => {
	let capturedConfig
	const emailManagerHandler = { send: async (config) => { capturedConfig = config; return { id: 'resend-id' } } }
	const command = SendConfirmationCodeEmail.getInstance()

	await command.execute({
		emailManagerHandler, apiUrl: 'https://api.resend.com/emails', resendToken: 're_test',
		from: 'onboarding@resend.dev', to: 'ada@example.com', code: '482913', expiresInSeconds: 60,
		brand: { ...BRAND, logoUrl: 'https://acme.test/logo.png' }
	})

	assert.match(capturedConfig.html, /<img[^>]+src="https:\/\/acme\.test\/logo\.png"/)
})

test('SendConfirmationCodeEmail — writes the copy in Spanish when the brand asks for it', async () => {
	let capturedConfig
	const emailManagerHandler = { send: async (config) => { capturedConfig = config; return { id: 'resend-id' } } }
	const command = SendConfirmationCodeEmail.getInstance()

	await command.execute({
		emailManagerHandler, apiUrl: 'https://api.resend.com/emails', resendToken: 're_test',
		from: 'onboarding@resend.dev', to: 'ada@example.com', code: '482913', expiresInSeconds: 300,
		brand: BRAND, language: 'es'
	})

	assert.equal(capturedConfig.subject, 'Confirma tu correo')
	assert.match(capturedConfig.html, /5 minutos/)
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
			brand: BRAND
		}),
		(error) => {
			assert.equal(error.isAxiosError, true)
			return true
		}
	)
})
