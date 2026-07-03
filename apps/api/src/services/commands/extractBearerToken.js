const { UnauthorizedError } = require('../../handlers/handleErrors')

class ExtractBearerToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ExtractBearerToken()
		return this.instance
	}

	/**
	 * Extracts the opaque token from an "Authorization: Bearer <token>" header value.
	 * @param { Object } config
	 * @param { String } config.authorizationHeader - The raw Authorization header value.
	 * @returns { String } The extracted token.
	 */
	execute({ authorizationHeader }) {
		const match = /^Bearer\s+(.+)$/i.exec(String(authorizationHeader || '').trim())
		if (!match) throw new UnauthorizedError('Missing or malformed Authorization header.')
		return match[1]
	}
}

module.exports = ExtractBearerToken
