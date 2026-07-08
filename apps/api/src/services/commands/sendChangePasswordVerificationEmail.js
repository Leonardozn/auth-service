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
	 * Sends the change-password verification code through Resend.
	 * @param { Object } config
	 * @param { Object } config.emailManagerHandler - The email-manager handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.code - The 6-digit verification code.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailManagerHandler, apiUrl, resendToken, from, to, code }) {
		const html = `<p>We received a request to change your password.</p><p>Your verification code is:</p><p><strong>${code}</strong></p><p>If you did not request this, you can ignore this email.</p>`

		return emailManagerHandler.send({ apiUrl, token: resendToken, from, to, subject: 'Confirm your password change', html })
	}
}

module.exports = SendChangePasswordVerificationEmail
