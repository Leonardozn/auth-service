const { UnauthorizedError } = require('../../handlers/handleErrors')

class FindSessionByRefreshToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindSessionByRefreshToken()
		return this.instance
	}

	/**
	 * Finds a Session by its refresh token, rejecting it if missing or expired.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.refreshToken - The refresh token to look up.
	 * @returns { Object } The matching, still-valid Session document.
	 */
	async execute({ repository, luxon, refreshToken }) {
		const result = await repository.list('session', { query: { refreshToken } })
		const session = result.records[0]
		if (!session) throw new UnauthorizedError('Invalid or expired refresh token.')

		const { DateTime } = luxon
		const expiresAt = DateTime.fromJSDate(new Date(session.refreshTokenExpiresAt), { zone: 'utc' })
		if (expiresAt <= DateTime.now().setZone('utc')) throw new UnauthorizedError('Invalid or expired refresh token.')

		return session
	}
}

module.exports = FindSessionByRefreshToken
