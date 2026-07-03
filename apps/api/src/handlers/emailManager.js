const EmailManager = require('@auth-service/email-manager')

class EmailManagerHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	emailManager

	constructor() {
		this.emailManager = EmailManager.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new EmailManagerHandler()
		return this.instance
	}

	/**
	 * Sends a transactional email through the Resend API.
	 * @param { Object } config
	 * @param { String } config.apiUrl - Resend emails endpoint (RESEND_API_URL).
	 * @param { String } config.token - Resend API key (RESEND_TOKEN).
	 * @param { String } config.from - Sender address (ADMIN_MAIL_FROM).
	 * @param { String } config.to - Recipient email address.
	 * @param { String } config.subject - Email subject.
	 * @param { String } config.html - Email HTML body.
	 * @returns { Promise<Object> } The Resend API response data.
	 */
	send(config) {
		return this.emailManager.send(config)
	}
}

module.exports = EmailManagerHandler
