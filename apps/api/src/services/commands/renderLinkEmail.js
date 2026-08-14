const BuildEmailLayout = require('./buildEmailLayout')
const { escapeHtml } = require('./buildEmailLayout')

const COPY = {
	en: {
		password_reset: {
			subject: 'Reset your password',
			preheader: 'A link to create a new password',
			heading: 'Create a new password',
			intro: 'We received a request to reset your password. Use the button below to choose a new one:',
			action: 'Create a new password',
			fallback: 'If the button does not work, copy this address into your browser:',
			footer: 'If you did not ask for this, ignore this email — your password stays as it is until this link is used.'
		}
	},
	es: {
		password_reset: {
			subject: 'Recupera tu contraseña',
			preheader: 'Un enlace para crear una contraseña nueva',
			heading: 'Crea una contraseña nueva',
			intro: 'Recibimos una solicitud para recuperar tu contraseña. Usa el botón para crear una nueva:',
			action: 'Crear una contraseña nueva',
			fallback: 'Si el botón no funciona, copia esta dirección en tu navegador:',
			footer: 'Si no pediste esto, ignora el correo: tu contraseña sigue igual mientras nadie use este enlace.'
		}
	}
}

class RenderLinkEmail {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RenderLinkEmail()
		return this.instance
	}

	/**
	 * Builds the branded email that carries an action link — today, password recovery.
	 *
	 * **The address is printed in full underneath the button**, and that is not redundancy. Corporate
	 * mail gateways rewrite links to route them through a scanner, some clients strip the button's
	 * styling into something that no longer looks clickable, and plenty of people simply do not trust
	 * a coloured rectangle in an email about their password. A visible address is the fallback that
	 * costs nothing and is also what lets a suspicious reader check where it actually leads.
	 *
	 * The button is a table cell with a background colour rather than a styled `<a>`: Outlook ignores
	 * padding on inline elements, which would collapse it into plain underlined text.
	 *
	 * @param { Object } config
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } [config.language] - `es` or `en`; anything else falls back to English.
	 * @param { String } [config.purpose] - Only `password_reset` for now.
	 * @param { String } config.url - The full destination, token included.
	 * @returns { Object } { subject, html }
	 */
	execute({ brand, language, purpose = 'password_reset', url }) {
		const copy = COPY[language] || COPY.en
		const texts = copy[purpose] || copy.password_reset
		const safeUrl = escapeHtml(url)
		const accent = escapeHtml(brand.accentColor)

		const body = `
				<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(texts.intro)}</p>
				<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
					<tr><td align="center" bgcolor="${accent}" style="background-color:${accent};border-radius:8px;">
						<a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(texts.action)}</a>
					</td></tr>
				</table>
				<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(texts.fallback)}</p>
				<p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:${escapeHtml(brand.primaryColor)};">${safeUrl}</a></p>`

		return {
			subject: texts.subject,
			html: BuildEmailLayout.getInstance().execute({
				brand,
				preheader: texts.preheader,
				heading: texts.heading,
				body,
				footer: texts.footer
			})
		}
	}
}

module.exports = RenderLinkEmail
