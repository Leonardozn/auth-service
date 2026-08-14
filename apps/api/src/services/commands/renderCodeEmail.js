const BuildEmailLayout = require('./buildEmailLayout')
const { escapeHtml } = require('./buildEmailLayout')

/**
 * Copy for both purposes, in both languages. It lives here and not in the senders because the two
 * emails are the same template with different words: keeping the words next to each other is what
 * stops them from drifting into two designs.
 */
const COPY = {
	en: {
		registration: {
			subject: 'Confirm your email',
			preheader: 'Your 6-digit confirmation code',
			heading: 'Confirm your email address',
			intro: 'Use this code to finish creating your account:',
			footer: 'If you did not try to create an account, you can ignore this email — nothing was created without this code.'
		},
		password_change: {
			subject: 'Confirm your password change',
			preheader: 'Your 6-digit verification code',
			heading: 'Confirm your new password',
			intro: 'Use this code to apply the password change you requested:',
			footer: 'If you did not ask to change your password, ignore this email and your current password stays as it is.'
		},
		expiresIn: (text) => `This code expires in ${text}.`,
		minutes: (value) => `${value} minute${value === 1 ? '' : 's'}`,
		seconds: (value) => `${value} second${value === 1 ? '' : 's'}`,
		doNotShare: 'Never share this code with anyone, not even with someone claiming to be from our team.'
	},
	es: {
		registration: {
			subject: 'Confirma tu correo',
			preheader: 'Tu código de 6 dígitos',
			heading: 'Confirma tu correo',
			intro: 'Usa este código para terminar de crear tu cuenta:',
			footer: 'Si no intentaste crear una cuenta, puedes ignorar este correo: sin este código no se creó nada.'
		},
		password_change: {
			subject: 'Confirma el cambio de contraseña',
			preheader: 'Tu código de 6 dígitos',
			heading: 'Confirma tu contraseña nueva',
			intro: 'Usa este código para aplicar el cambio de contraseña que pediste:',
			footer: 'Si no pediste cambiar tu contraseña, ignora este correo y la actual sigue igual.'
		},
		expiresIn: (text) => `El código vence en ${text}.`,
		minutes: (value) => `${value} ${value === 1 ? 'minuto' : 'minutos'}`,
		seconds: (value) => `${value} ${value === 1 ? 'segundo' : 'segundos'}`,
		doNotShare: 'No compartas este código con nadie, ni siquiera con alguien que diga ser de nuestro equipo.'
	}
}

class RenderCodeEmail {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RenderCodeEmail()
		return this.instance
	}

	/**
	 * Builds the branded email that carries a 6-digit code, for registration or a password change.
	 *
	 * **The code is large plain text and never a link.** A clickable code signs in whoever reaches
	 * the mailbox with a single tap, and plenty of mail clients and security scanners pre-visit
	 * links automatically - which would burn the code before its owner ever read it.
	 *
	 * It is also styled to be **selectable and legible**: wide letter spacing, a monospaced face so
	 * a zero cannot be read as an O, and a background block so it stands out without becoming an
	 * image. An image would be invisible to every client that blocks remote content by default,
	 * which is most of them.
	 *
	 * @param { Object } config
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } [config.language] - `es` or `en`; anything else falls back to English.
	 * @param { String } config.purpose - `registration` or `password_change`.
	 * @param { String } config.code - The 6-digit code.
	 * @param { Number } [config.expiresInSeconds] - Omitted means the validity line is left out.
	 * @returns { Object } { subject, html }
	 */
	execute({ brand, language, purpose, code, expiresInSeconds }) {
		const copy = COPY[language] || COPY.en
		const texts = copy[purpose] || copy.registration

		const minutes = Math.round((expiresInSeconds || 0) / 60)
		const durationText = minutes > 0 ? copy.minutes(minutes) : copy.seconds(expiresInSeconds || 0)
		// Sin vigencia declarada no se inventa una: decir un tiempo equivocado es peor que no decirlo.
		const expiryLine = expiresInSeconds
			? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(copy.expiresIn(durationText))}</p>`
			: ''

		const body = `
				<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(texts.intro)}</p>
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
					<tr><td align="center" style="background-color:#f4f5f7;border:1px solid #e5e7eb;border-radius:10px;padding:20px 12px;">
						<span style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:${escapeHtml(brand.accentColor)};">${escapeHtml(code)}</span>
					</td></tr>
				</table>
				<p style="margin:20px 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">${escapeHtml(copy.doNotShare)}</p>
				${expiryLine}`

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

module.exports = RenderCodeEmail
