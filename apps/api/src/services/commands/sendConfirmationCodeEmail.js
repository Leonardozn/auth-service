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
	 * Sends the registration confirmation code through Resend. The code is plain text, never a
	 * clickable link: whoever has access to the mailbox would sign in with a single click, and many
	 * mail clients pre-visit links automatically, which would burn the code before the user ever
	 * sees it. Deliberately has no try/catch (same as sendChangePasswordVerificationEmail.js /
	 * sendPasswordResetEmail.js - the swallow-or-rethrow decision belongs to the caller): a raw,
	 * uncaught axios error here lets handle-response's getStatusCode() map it to 502 automatically.
	 * @param { Object } config
	 * @param { Object } config.emailManagerHandler - The email-manager handler instance.
	 * @param { String } config.apiUrl - RESEND_API_URL.
	 * @param { String } config.resendToken - RESEND_TOKEN (Resend API key).
	 * @param { String } config.from - ADMIN_MAIL_FROM.
	 * @param { String } config.to - The recipient's email address.
	 * @param { String } config.code - The 6-digit confirmation code.
	 * @param { Number } config.expiresInSeconds - How long the code stays valid, for the copy.
	 * @param { String } config.brandName - BRAND_NAME.
	 * @param { String } config.brandLogoUrl - BRAND_LOGO_URL - empty means show brandName as text instead.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	async execute({ emailManagerHandler, apiUrl, resendToken, from, to, code, expiresInSeconds, brandName, brandLogoUrl }) {
		const minutes = Math.round(expiresInSeconds / 60)
		const durationText = minutes > 0 ? `${minutes} minute${minutes === 1 ? '' : 's'}` : `${expiresInSeconds} seconds`
		const brandHeader = brandLogoUrl
			? `<img src="${brandLogoUrl}" alt="${brandName}" style="max-height:40px" />`
			: `<strong>${brandName}</strong>`

		const html = `<p>${brandHeader}</p><p>Your confirmation code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in ${durationText}.</p><p>If you did not try to register, you can ignore this email.</p>`

		return emailManagerHandler.send({ apiUrl, token: resendToken, from, to, subject: 'Confirm your email', html })
	}
}

module.exports = SendConfirmationCodeEmail
