const RenderCodeEmail = require('./renderCodeEmail')

class SendConfirmationCodeEmail {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new SendConfirmationCodeEmail()
		return this.instance
	}

	/**
	 * Sends the registration confirmation code through Resend.
	 *
	 * **The markup lives in RenderCodeEmail, not here.** This command's job is the sending; the same
	 * template also serves the password-change code, and one template with two callers is what keeps
	 * the two emails looking like the same store.
	 *
	 * Deliberately has no try/catch (same as sendChangePasswordVerificationEmail.js /
	 * sendPasswordResetEmail.js - the swallow-or-rethrow decision belongs to the caller): a raw,
	 * uncaught axios error here lets handle-response's getStatusCode() map it to 502 automatically.
	 *
	 * @param { Object } config
	 * @param { Object } config.emailManagerHandler - The email-manager handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.code - The 6-digit confirmation code.
	 * @param { Number } config.expiresInSeconds - How long the code stays valid, for the copy.
	 * @param { Object } config.brand - { name, logoUrl, primaryColor, accentColor, url }.
	 * @param { String } [config.language] - Email copy language.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailManagerHandler, apiUrl, resendToken, from, to, code, expiresInSeconds, brand, language }) {
		const { subject, html } = RenderCodeEmail.getInstance().execute({
			brand,
			language,
			purpose: 'registration',
			code,
			expiresInSeconds
		})

		return emailManagerHandler.send({ apiUrl, token: resendToken, from, to, subject, html })
	}
}

module.exports = SendConfirmationCodeEmail
