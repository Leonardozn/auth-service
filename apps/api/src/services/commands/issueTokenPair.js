class IssueTokenPair {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new IssueTokenPair()
		return this.instance
	}

	/**
	 * Generates a fresh opaque access/refresh token pair with their expiry dates.
	 * @param { Object } config
	 * @param { Object } config.generateOpaqueToken - The GenerateOpaqueToken command instance.
	 * @param { Object } config.computeExpiryDate - The ComputeExpiryDate command instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.sessionTokenDuration - Access token duration (e.g. '15m').
	 * @param { String } config.refreshTokenDuration - Refresh token duration (e.g. '5d').
	 * @returns { Object } { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }
	 */
	execute({ generateOpaqueToken, computeExpiryDate, luxon, sessionTokenDuration, refreshTokenDuration }) {
		return {
			accessToken: generateOpaqueToken.execute(),
			accessTokenExpiresAt: computeExpiryDate.execute({ luxon, duration: sessionTokenDuration }),
			refreshToken: generateOpaqueToken.execute(),
			refreshTokenExpiresAt: computeExpiryDate.execute({ luxon, duration: refreshTokenDuration })
		}
	}
}

module.exports = IssueTokenPair
