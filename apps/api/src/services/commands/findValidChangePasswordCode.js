const { BadRequestError, UnauthorizedError } = require('../../handlers/handleErrors')

class FindValidChangePasswordCode {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindValidChangePasswordCode()
		return this.instance
	}

	/**
	 * Finds the pending, unused ChangePasswordVerificationCode for a user and validates the
	 * submitted code against it: rejects if none is pending, if it expired (marking it used), or
	 * if the code doesn't match (counting the attempt and invalidating the record once the max is
	 * reached).
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.userId - The authenticated (session) user's id.
	 * @param { String } config.code - The submitted 6-digit code.
	 * @param { Number } [config.maxAttempts] - Failed attempts allowed before the code is invalidated (defaults to 5).
	 * @returns { Object } The matching, still-valid ChangePasswordVerificationCode document.
	 */
	async execute({ repository, luxon, userId, code, maxAttempts = 5 }) {
		const result = await repository.list('change_password_verification_code', { query: { user: userId, used: false } })
		const record = result.records[0]
		if (!record) throw new BadRequestError('No pending password change request.')

		const { DateTime } = luxon
		const expiresAt = DateTime.fromJSDate(new Date(record.expiresAt), { zone: 'utc' })
		if (expiresAt <= DateTime.now().setZone('utc')) {
			await repository.update('change_password_verification_code', { id: record._id, data: { used: true } })
			throw new BadRequestError('Invalid or expired verification code.')
		}

		if (record.code !== code) {
			const attempts = record.attempts + 1
			const exhausted = attempts >= maxAttempts
			await repository.update('change_password_verification_code', { id: record._id, data: { attempts, used: exhausted } })
			throw new UnauthorizedError(exhausted ? 'Too many failed attempts. Request a new code.' : 'Invalid verification code.')
		}

		return record
	}
}

module.exports = FindValidChangePasswordCode
