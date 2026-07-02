class RemoveSessionByToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RemoveSessionByToken()
		return this.instance
	}

	/**
	 * Deletes the Session matching the given token field, if any. Idempotent - does nothing
	 * (no error) when no session matches, unlike findSessionByToken which rejects that case.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.tokenField - The Session field the token is stored in ('accessToken' | 'refreshToken').
	 * @param { String } config.token - The token value to look up.
	 * @returns { Object } { deletedCount: 0 | 1 }
	 */
	async execute({ repository, tokenField, token }) {
		const result = await repository.list('session', { query: { [tokenField]: token } })
		const session = result.records[0]
		if (!session) return { deletedCount: 0 }

		return repository.remove('session', { id: session._id })
	}
}

module.exports = RemoveSessionByToken
