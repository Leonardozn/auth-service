const { test } = require('node:test')
const assert = require('node:assert/strict')
const SendPasswordResetEmail = require('../../../../src/services/commands/sendPasswordResetEmail')

const BRAND = { name: 'Acme', logoUrl: '', primaryColor: '#0F4C81', accentColor: '#C2410C', url: '' }

const capture = () => {
	const captured = {}
	return {
		captured,
		handler: { send: async (config) => { Object.assign(captured, config); return { id: 'resend-id' } } }
	}
}

test('SendPasswordResetEmail — sends the email with the reset link embedded', async () => {
	const { captured, handler } = capture()
	const command = SendPasswordResetEmail.getInstance()

	const result = await command.execute({
		emailManagerHandler: handler,
		apiUrl: 'https://api.resend.com/emails',
		resendToken: 're_test',
		from: 'onboarding@resend.dev',
		to: 'ada@example.com',
		resetUrlBase: 'http://localhost:5173/reset-password',
		passwordResetToken: 'opaque-reset-token',
		brand: BRAND
	})

	assert.deepEqual(result, { id: 'resend-id' })
	assert.equal(captured.apiUrl, 'https://api.resend.com/emails')
	assert.equal(captured.token, 're_test')
	assert.equal(captured.from, 'onboarding@resend.dev')
	assert.equal(captured.to, 'ada@example.com')
	assert.equal(captured.subject, 'Reset your password')
	assert.match(captured.html, /http:\/\/localhost:5173\/reset-password\?token=opaque-reset-token/)
})

// El botón puede llegar sin estilo, reescrito por una pasarela corporativa o simplemente no
// inspirar confianza en un correo sobre contraseñas. La dirección visible es el respaldo.
test('SendPasswordResetEmail — prints the full address as well as the button', async () => {
	const { captured, handler } = capture()

	await SendPasswordResetEmail.getInstance().execute({
		emailManagerHandler: handler, apiUrl: 'u', resendToken: 't', from: 'f', to: 'ada@example.com',
		resetUrlBase: 'http://localhost:8081/reset-password', passwordResetToken: 'abc123',
		brand: BRAND
	})

	const occurrences = captured.html.split('http://localhost:8081/reset-password?token=abc123').length - 1
	assert.ok(occurrences >= 2, 'la dirección aparece en el botón y también escrita a la vista')
})

test('SendPasswordResetEmail — wears the brand colours and writes Spanish when asked', async () => {
	const { captured, handler } = capture()

	await SendPasswordResetEmail.getInstance().execute({
		emailManagerHandler: handler, apiUrl: 'u', resendToken: 't', from: 'f', to: 'ada@example.com',
		resetUrlBase: 'http://localhost:8081/reset-password', passwordResetToken: 'abc123',
		brand: { ...BRAND, primaryColor: '#123456', accentColor: '#abcdef' }, language: 'es'
	})

	assert.equal(captured.subject, 'Recupera tu contraseña')
	assert.match(captured.html, /#123456/)
	assert.match(captured.html, /#abcdef/)
	assert.match(captured.html, /Crear una contraseña nueva/)
})
