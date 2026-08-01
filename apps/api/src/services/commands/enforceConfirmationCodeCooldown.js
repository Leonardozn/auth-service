const { TooManyRequestsError } = require('../../handlers/handleErrors')

class EnforceConfirmationCodeCooldown {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new EnforceConfirmationCodeCooldown()
		return this.instance
	}

	/**
	 * Rejects a new code request if the last one for this user+purpose was requested less than
	 * `cooldownSeconds` ago - regardless of whether that previous code is still valid or already
	 * used, since the point is to rate-limit *sends*, not track valid codes (that's
	 * findValidConfirmationCode.js). Checked both by send-confirmation-code and by register() when
	 * it's about to replace an unconfirmed account - "two doors to the same send" both need the
	 * same lock, or one door lets someone flood a mailbox through the other.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.userId - The user to check the cooldown for.
	 * @param { String } config.purpose - The ConfirmationCode purpose (e.g. 'registration').
	 * @param { Number } config.cooldownSeconds - Minimum seconds required between two sends.
	 */
	async execute({ repository, luxon, userId, purpose, cooldownSeconds }) {
		const result = await repository.list('confirmation_code', {
			query: { user: userId, purpose },
			sort: { field: 'createdAt', type: -1 },
			size: 1
		})
		const latest = result.records[0]
		if (!latest) return

		const { DateTime } = luxon
		const requestedAt = DateTime.fromJSDate(new Date(latest.createdAt), { zone: 'utc' })
		const elapsedSeconds = DateTime.now().setZone('utc').diff(requestedAt, 'seconds').seconds

		if (elapsedSeconds < cooldownSeconds) {
			throw new TooManyRequestsError('A code was already sent recently. Please wait before requesting another one.')
		}
	}
}

module.exports = EnforceConfirmationCodeCooldown
