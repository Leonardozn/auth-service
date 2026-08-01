class CreateSessionForUser {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new CreateSessionForUser()
		return this.instance
	}

	/**
	 * Opens a new Session for a user, applying the same rules everywhere a session gets created:
	 * evict the oldest session if the role's maxSessions limit is already reached, issue a fresh
	 * token pair, and persist the Session. Shared by login() and verify-confirmation-code() - both
	 * "log the user in", so both must behave identically rather than duplicating these three steps.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.enforceSessionLimit - The EnforceSessionLimit command instance.
	 * @param { Object } config.issueTokenPair - The IssueTokenPair command instance.
	 * @param { Object } config.generateOpaqueToken - The GenerateOpaqueToken command instance.
	 * @param { Object } config.computeExpiryDate - The ComputeExpiryDate command instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { ObjectId|String } config.userId - The user starting a new session.
	 * @param { ObjectId|String } config.roleId - That user's Role id.
	 * @param { String } config.sessionTokenDuration - Access token duration (e.g. '15m').
	 * @param { String } config.refreshTokenDuration - Refresh token duration (e.g. '5d').
	 * @param { Object } [config.options] - Forwarded to every write (e.g. { session } for a transaction).
	 * @returns { Object } { accessToken, accessTokenExpiresAt, refreshToken, refreshTokenExpiresAt }
	 */
	async execute({
		repository, enforceSessionLimit, issueTokenPair, generateOpaqueToken, computeExpiryDate, luxon,
		userId, roleId, sessionTokenDuration, refreshTokenDuration, options = {}
	}) {
		await enforceSessionLimit.execute({ repository, userId, roleId })

		const tokenPair = issueTokenPair.execute({ generateOpaqueToken, computeExpiryDate, luxon, sessionTokenDuration, refreshTokenDuration })

		await repository.add('session', { data: { user: String(userId), ...tokenPair }, options })

		return tokenPair
	}
}

module.exports = CreateSessionForUser
