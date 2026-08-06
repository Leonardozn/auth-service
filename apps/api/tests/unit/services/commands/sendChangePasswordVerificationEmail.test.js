const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendChangePasswordVerificationEmail = require('../../../../src/services/commands/sendChangePasswordVerificationEmail')
const SendConfirmationCodeEmail = require('../../../../src/services/commands/sendConfirmationCodeEmail')

const BRAND = { name: 'Acme', logoUrl: '', primaryColor: '#0F4C81', accentColor: '#C2410C', url: '' }

const capture = () => {
	const captured = {}
	return {
		captured,
		handler: { send: async (config) => { Object.assign(captured, config); return { id: 'resend-id' } } }
	}
}

test('SendChangePasswordVerificationEmail — sends the email with the code embedded', async () => {
	const { captured, handler } = capture()
	const command = SendChangePasswordVerificationEmail.getInstance()

	const result = await command.execute({
		emailManagerHandler: handler,
		apiUrl: 'https://api.resend.com/emails',
		resendToken: 're_test',
		from: 'onboarding@resend.dev',
		to: 'ada@example.com',
		code: '482913',
		expiresInSeconds: 300,
		brand: BRAND
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(captured.apiUrl, 'https://api.resend.com/emails')
	assert.equal(captured.token, 're_test')
	assert.equal(captured.from, 'onboarding@resend.dev')
	assert.equal(captured.to, 'ada@example.com')
	assert.equal(captured.subject, 'Confirm your password change')
	assert.match(captured.html, /482913/)
})

// El motivo de compartir plantilla: los dos correos llegan de la misma tienda con días de
// diferencia, y antes se veían como si vinieran de dos sistemas distintos.
test('SendChangePasswordVerificationEmail — shares its layout with the registration code, only the words change', async () => {
	const change = capture()
	const registration = capture()

	await SendChangePasswordVerificationEmail.getInstance().execute({
		emailManagerHandler: change.handler, apiUrl: 'u', resendToken: 't', from: 'f',
		to: 'ada@example.com', code: '482913', expiresInSeconds: 300, brand: BRAND
	})
	await SendConfirmationCodeEmail.getInstance().execute({
		emailManagerHandler: registration.handler, apiUrl: 'u', resendToken: 't', from: 'f',
		to: 'ada@example.com', code: '482913', expiresInSeconds: 300, brand: BRAND
	})

	assert.notEqual(change.captured.subject, registration.captured.subject)

	// La cáscara —cabecera de marca, tarjeta y pie— es idéntica: lo único distinto es el texto.
	const shell = (html) => html.replace(/>[^<]+</g, '><')
	assert.equal(shell(change.captured.html), shell(registration.captured.html))
})

test('SendChangePasswordVerificationEmail — writes the copy in Spanish when asked', async () => {
	const { captured, handler } = capture()

	await SendChangePasswordVerificationEmail.getInstance().execute({
		emailManagerHandler: handler, apiUrl: 'u', resendToken: 't', from: 'f',
		to: 'ada@example.com', code: '482913', expiresInSeconds: 300, brand: BRAND, language: 'es'
	})

	assert.equal(captured.subject, 'Confirma el cambio de contraseña')
})
