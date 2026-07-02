class SessionContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new SessionContract()
		return this.instance
	}

	getContract() {
		return {
			user: true,
			accessToken: true,
			accessTokenExpiresAt: true,
			refreshToken: true,
			refreshTokenExpiresAt: true,
		}
	}
}

module.exports = SessionContract
