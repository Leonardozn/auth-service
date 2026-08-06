const { test } = require('node:test')
const assert = require('node:assert/strict')
const BuildEmailLayout = require('../../../../src/services/commands/buildEmailLayout')

const BRAND = { name: 'Acme', logoUrl: '', primaryColor: '#0F4C81', accentColor: '#C2410C', url: '' }

const render = (brand = BRAND) => BuildEmailLayout.getInstance().execute({
	brand,
	preheader: 'Preview line',
	heading: 'Heading',
	body: '<p>Body</p>',
	footer: 'Footer note'
})

test('BuildEmailLayout — paints the header with the brand colour', () => {
	assert.match(render({ ...BRAND, primaryColor: '#123456' }), /background-color:#123456/)
})

test('BuildEmailLayout — falls back to the brand name when there is no logo', () => {
	const html = render()

	assert.doesNotMatch(html, /<img/)
	assert.match(html, /Acme/)
})

test('BuildEmailLayout — links the header only when the brand has an address', () => {
	assert.doesNotMatch(render(), /<a\s/i)
	assert.match(render({ ...BRAND, url: 'https://acme.test' }), /<a href="https:\/\/acme\.test"/)
})

// Los clientes de correo en modo oscuro invierten lo que consideran sin declarar: un fondo que no
// se escribe se vuelve oscuro debajo de un texto que sigue siendo oscuro.
test('BuildEmailLayout — states the light background explicitly, for dark-mode clients', () => {
	const html = render()

	assert.match(html, /background-color:#ffffff/)
	assert.match(html, /color:#1a1a1a/)
})

test('BuildEmailLayout — escapes a brand name that would otherwise break the markup', () => {
	const html = render({ ...BRAND, name: 'Tools & <Co>' })

	assert.match(html, /Tools &amp; &lt;Co&gt;/)
	assert.doesNotMatch(html, /<Co>/)
})

// Outlook renderiza con el motor de Word: las tablas no son código heredado, son el requisito.
test('BuildEmailLayout — lays out with tables and inline styles', () => {
	const html = render()

	assert.match(html, /<table role="presentation"/)
	assert.doesNotMatch(html, /<style/i)
})

test('BuildEmailLayout — hides the preheader inside the message', () => {
	assert.match(render(), /display:none[^"]*">Preview line</)
})
