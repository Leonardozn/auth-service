const RenderCodeEmail = require('./renderCodeEmail')

class SendChangePasswordVerificationEmail {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new SendChangePasswordVerificationEmail()
		return this.instance
	}

	/**
	 * Sends the password-change verification code through Resend.
	 *
	 * Shares RenderCodeEmail with the registration code - same template, different words. Before
	 * this, the two emails were written independently and looked it: one carried the brand and the
	 * other was three bare paragraphs, for two messages that arrive from the same store days apart.
	 *
	 * @param { Object } config
	 * @param { Object } config.emailManagerHandler - The email-manager handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.code - The 6-digit verification code.
	 * @param { Number } [config.expiresInSeconds] - How long the code stays valid, for the copy.
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } [config.language] - Email copy language.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailManagerHandler, apiUrl, resendToken, from, to, code, expiresInSeconds, brand, language }) {
		const { subject, html } = RenderCodeEmail.getInstance().execute({
			brand,
			language,
			purpose: 'password_change',
			code,
			expiresInSeconds
		})

		return emailManagerHandler.send({ apiUrl, token: resendToken, from, to, subject, html })
	}
}

module.exports = SendChangePasswordVerificationEmail
