class RevokeSessions {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RevokeSessions()
		return this.instance
	}

	/**
	 * Revokes every Session belonging to a user, optionally leaving one alive.
	 * Passing no `exceptSessionId` revokes all of them (e.g. after a password reset).
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.userId - The owning user's id.
	 * @param { String } [config.exceptSessionId] - A session id to leave untouched.
	 * @returns { Object } { revokedCount: Number }
	 */
	async execute({ repository, userId, exceptSessionId }) {
		const result = await repository.list('session', { query: { user: userId } })
		const targets = result.records.filter(session => String(session._id) !== String(exceptSessionId))

		for (const session of targets) await repository.remove('session', { id: session._id })

		return { revokedCount: targets.length }
	}
}

module.exports = RevokeSessions
