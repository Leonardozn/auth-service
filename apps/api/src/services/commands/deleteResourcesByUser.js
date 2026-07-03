class DeleteResourcesByUser {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new DeleteResourcesByUser()
		return this.instance
	}

	/**
	 * Deletes every record of a schema (must have a `user` field) belonging to a user,
	 * optionally leaving one alive. Reused for: revoking sessions after a password change
	 * (exceptId = the current session), revoking all sessions after a reset (no exceptId),
	 * and cascading a session/password_reset_token cleanup when the account itself is deleted.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.schemaName - The schema to delete from ('session' | 'password_reset_token').
	 * @param { String } config.userId - The owning user's id.
	 * @param { String } [config.exceptId] - A record id to leave untouched.
	 * @param { Object } [config.options] - Forwarded to each delete (e.g. { session } for a transaction).
	 * @returns { Object } { deletedCount: Number }
	 */
	async execute({ repository, schemaName, userId, exceptId, options = {} }) {
		const result = await repository.list(schemaName, { query: { user: userId } })
		const targets = result.records.filter(record => String(record._id) !== String(exceptId))

		for (const record of targets) await repository.remove(schemaName, { id: record._id, options })

		return { deletedCount: targets.length }
	}
}

module.exports = DeleteResourcesByUser
