class EnforceLoginRecordLimit {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new EnforceLoginRecordLimit()
		return this.instance
	}

	/**
	 * Caps how many LoginRecords are kept per email. Scoped by `email`, not `user` - a failed
	 * attempt against a non-existent account has no user to key off, and those are exactly the
	 * records worth capping (probing many made-up emails one at a time). Run after inserting a new
	 * record (per spec: "on insert, delete whatever exceeds the cap for that email"), evicting the
	 * oldest first - same shape as enforceSessionLimit.js, over a different collection.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.email - The email whose records are being capped.
	 * @param { Number } config.maxPerEmail - Records to keep per email. <= 0 means unlimited.
	 * @param { Object } [config.options] - Forwarded to every write (e.g. { session } for a transaction).
	 */
	async execute({ repository, email, maxPerEmail, options = {} }) {
		if (!maxPerEmail || maxPerEmail <= 0) return

		const result = await repository.list('login_record', { query: { email }, options })
		const records = result.records
			.slice()
			.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

		const overflow = records.length - maxPerEmail
		if (overflow <= 0) return

		for (const record of records.slice(0, overflow)) {
			await repository.remove('login_record', { id: record._id, options })
		}
	}
}

module.exports = EnforceLoginRecordLimit
