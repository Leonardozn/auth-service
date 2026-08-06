const RenderLinkEmail = require('./renderLinkEmail')

class SendPasswordResetEmail {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new SendPasswordResetEmail()
		return this.instance
	}

	/**
	 * Sends the password-recovery email through Resend, with the reset link embedded.
	 *
	 * @param { Object } config
	 * @param { Object } config.emailManagerHandler - The email-manager handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.resetUrlBase - Where the link lands, already resolved and allowed.
	 * @param { String } config.passwordResetToken - The opaque PasswordResetToken value.
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } [config.language] - Email copy language.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailManagerHandler, apiUrl, resendToken, from, to, resetUrlBase, passwordResetToken, brand, language }) {
		const { subject, html } = RenderLinkEmail.getInstance().execute({
			brand,
			language,
			purpose: 'password_reset',
			url: `${resetUrlBase}?token=${passwordResetToken}`
		})

		return emailManagerHandler.send({ apiUrl, token: resendToken, from, to, subject, html })
	}
}

module.exports = SendPasswordResetEmail
