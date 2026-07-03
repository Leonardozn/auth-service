const { BadRequestError } = require('../../handlers/handleErrors')

class FindValidPasswordResetToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindValidPasswordResetToken()
		return this.instance
	}

	/**
	 * Finds an unused, not-yet-expired PasswordResetToken by its token value.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.token - The opaque reset token to look up.
	 * @returns { Object } The matching, still-valid PasswordResetToken document.
	 */
	async execute({ repository, luxon, token }) {
		const result = await repository.list('password_reset_token', { query: { token, used: false } })
		const resetToken = result.records[0]
		if (!resetToken) throw new BadRequestError('Invalid or expired reset token.')

		const { DateTime } = luxon
		const expiresAt = DateTime.fromJSDate(new Date(resetToken.expiresAt), { zone: 'utc' })
		if (expiresAt <= DateTime.now().setZone('utc')) throw new BadRequestError('Invalid or expired reset token.')

		return resetToken
	}
}

module.exports = FindValidPasswordResetToken
