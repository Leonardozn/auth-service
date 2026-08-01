class WriteLoginRecord {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new WriteLoginRecord()
		return this.instance
	}

	/**
	 * Inserts a LoginRecord for a login attempt (success or failure) and immediately enforces the
	 * per-email cap. The single entry point every caller uses instead of calling
	 * repository.add('login_record', ...) + enforceLoginRecordLimit.execute(...) separately, so the
	 * cap can never be forgotten at a new call site.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.enforceLoginRecordLimit - The EnforceLoginRecordLimit command instance.
	 * @param { ObjectId|String } [config.user] - The matched user's id, if any (absent for an email with no account).
	 * @param { String } config.email - The email the attempt was made with.
	 * @param { String } config.result - 'success' | 'failed'.
	 * @param { String } config.method - 'password' | 'confirmation_code' | 'two_factor'.
	 * @param { String } config.ip - The client's IP address.
	 * @param { String } config.userAgent - The client's User-Agent header.
	 * @param { Number } config.maxPerEmail - Forwarded to EnforceLoginRecordLimit.
	 * @param { Object } [config.options] - Forwarded to every write (e.g. { session } for a transaction).
	 * @returns { Object } The created LoginRecord document.
	 */
	async execute({ repository, enforceLoginRecordLimit, user, email, result, method, ip, userAgent, maxPerEmail, options = {} }) {
		const record = await repository.add('login_record', {
			data: { user: user ? String(user) : undefined, email, result, method, ip, userAgent },
			options
		})

		await enforceLoginRecordLimit.execute({ repository, email, maxPerEmail, options })

		return record
	}
}

module.exports = WriteLoginRecord
