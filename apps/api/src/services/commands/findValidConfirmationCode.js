const { BadRequestError, UnauthorizedError } = require('../../handlers/handleErrors')

class FindValidConfirmationCode {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindValidConfirmationCode()
		return this.instance
	}

	/**
	 * Finds the pending, unused ConfirmationCode for a user+purpose and validates the submitted
	 * code against it: rejects if none is pending, if it expired (marking it used), or if the code
	 * doesn't match (counting the attempt and invalidating the record once the max is reached).
	 * Same shape as findValidChangePasswordCode.js, with the two differences that make it a
	 * separate command rather than a shared one: the code is compared by hash (dataEncryptHandler.verify),
	 * never plain text, and lookup is additionally scoped by `purpose`.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { Object } config.dataEncryptHandler - The data-encrypt handler instance.
	 * @param { String } config.userId - The user the code was issued for.
	 * @param { String } config.code - The submitted 6-digit code.
	 * @param { String } config.purpose - The ConfirmationCode purpose (e.g. 'registration').
	 * @param { Number } [config.maxAttempts] - Failed attempts allowed before the code is invalidated (defaults to 5).
	 * @returns { Object } The matching, still-valid ConfirmationCode document.
	 */
	async execute({ repository, luxon, dataEncryptHandler, userId, code, purpose, maxAttempts = 5 }) {
		const result = await repository.list('confirmation_code', { query: { user: userId, purpose, used: false } })
		const record = result.records[0]
		if (!record) throw new BadRequestError('No pending confirmation code.')

		const { DateTime } = luxon
		const expiresAt = DateTime.fromJSDate(new Date(record.expiresAt), { zone: 'utc' })
		if (expiresAt <= DateTime.now().setZone('utc')) {
			await repository.update('confirmation_code', { id: record._id, data: { used: true } })
			throw new BadRequestError('Invalid or expired confirmation code.')
		}

		const matches = dataEncryptHandler.verify(code, record.codeHash)
		if (!matches) {
			const attempts = record.attempts + 1
			const exhausted = attempts >= maxAttempts
			await repository.update('confirmation_code', { id: record._id, data: { attempts, used: exhausted } })
			throw new UnauthorizedError(exhausted ? 'Too many failed attempts. Request a new code.' : 'Invalid confirmation code.')
		}

		return record
	}
}

module.exports = FindValidConfirmationCode
