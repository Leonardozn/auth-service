class EnforceSessionLimit {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new EnforceSessionLimit()
		return this.instance
	}

	/**
	 * Caps how many concurrent Sessions a user's role allows. A role with no maxSessions (or
	 * <= 0) is treated as unlimited. When the user is already at or above the limit, evicts
	 * the oldest session(s) - by createdAt - until exactly one slot is free for the session
	 * about to be created by login().
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.userId - The id of the user about to start a new session.
	 * @param { String } config.roleId - The id of that user's Role.
	 */
	async execute({ repository, userId, roleId }) {
		if (!roleId) return

		const roleResult = await repository.list('role', { query: { _id: roleId } })
		const maxSessions = roleResult.records[0]?.maxSessions
		if (!maxSessions || maxSessions <= 0) return

		const sessionsResult = await repository.list('session', { query: { user: userId } })
		const sessions = sessionsResult.records
			.slice()
			.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

		const overflow = sessions.length - maxSessions + 1
		if (overflow <= 0) return

		for (const session of sessions.slice(0, overflow)) {
			await repository.remove('session', { id: session._id })
		}
	}
}

module.exports = EnforceSessionLimit
