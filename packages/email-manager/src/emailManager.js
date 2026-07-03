const ExternalApiConfig = require('@auth-service/external-api-config')

class EmailManager {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new EmailManager()
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
	async send({ apiUrl, token, from, to, subject, html }) {
		const externalApiConfig = new ExternalApiConfig()
		const instance = externalApiConfig.createInstance({
			baseURL: apiUrl,
			headers: { Authorization: `Bearer ${token}` }
		})

		const response = await instance.post('', { from, to, subject, html })
		return response.data
	}
}

module.exports = EmailManager
