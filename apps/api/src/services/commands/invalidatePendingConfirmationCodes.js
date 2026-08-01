class InvalidatePendingConfirmationCodes {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new InvalidatePendingConfirmationCodes()
		return this.instance
	}

	/**
	 * Marks every unused ConfirmationCode for a user+purpose as used - so only the code most
	 * recently sent stays valid. Invalidates rather than deletes (unlike deleteResourcesByUser.js)
	 * because the spec requires `used: true`, not removal.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.userId - The owning user's id.
	 * @param { String } config.purpose - The ConfirmationCode purpose (e.g. 'registration').
	 * @param { Object } [config.options] - Forwarded to each update (e.g. { session } for a transaction).
	 */
	async execute({ repository, userId, purpose, options = {} }) {
		const result = await repository.list('confirmation_code', { query: { user: userId, purpose, used: false }, options })

		for (const record of result.records) {
			await repository.update('confirmation_code', { id: record._id, data: { used: true }, options })
		}
	}
}

module.exports = InvalidatePendingConfirmationCodes
