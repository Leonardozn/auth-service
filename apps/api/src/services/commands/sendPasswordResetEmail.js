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
	 * @param { Object } config
	 * @param { Object } config.emailResendHandler - The email-resend handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.resetUrlBase - PASSWORD_RESET_URL_BASE.
	 * @param { String } config.passwordResetToken - The opaque PasswordResetToken value.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailResendHandler, apiUrl, resendToken, from, to, resetUrlBase, passwordResetToken }) {
		const resetLink = `${resetUrlBase}?token=${passwordResetToken}`
		const html = `<p>We received a request to reset your password.</p><p><a href="${resetLink}">${resetLink}</a></p>`

		return emailResendHandler.send({ apiUrl, token: resendToken, from, to, subject: 'Reset your password', html })
	}
}

module.exports = SendPasswordResetEmail
