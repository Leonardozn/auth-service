const { UnauthorizedError } = require('../../handlers/handleErrors')

class FindSessionByToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindSessionByToken()
		return this.instance
	}

	/**
	 * Finds a Session by one of its opaque tokens, rejecting it if missing or expired.
	 * Reused by both refresh() (refreshToken/refreshTokenExpiresAt) and validate()
	 * (accessToken/accessTokenExpiresAt).
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.tokenField - The Session field the token is stored in ('accessToken' | 'refreshToken').
	 * @param { String } config.expiryField - The Session field with that token's expiry ('accessTokenExpiresAt' | 'refreshTokenExpiresAt').
	 * @param { String } config.token - The token value to look up.
	 * @returns { Object } The matching, still-valid Session document.
	 */
	async execute({ repository, luxon, tokenField, expiryField, token }) {
		const result = await repository.list('session', { query: { [tokenField]: token } })
		const session = result.records[0]
		if (!session) throw new UnauthorizedError('Invalid or expired token.')

		const { DateTime } = luxon
		const expiresAt = DateTime.fromJSDate(new Date(session[expiryField]), { zone: 'utc' })
		if (expiresAt <= DateTime.now().setZone('utc')) throw new UnauthorizedError('Invalid or expired token.')

		return session
	}
}

module.exports = FindSessionByToken
