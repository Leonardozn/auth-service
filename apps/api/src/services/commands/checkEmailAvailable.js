const { BadRequestError } = require('../../handlers/handleErrors')

class CheckEmailAvailable {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new CheckEmailAvailable()
		return this.instance
	}

	/**
	 * Throws if a User already exists with the given email.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.email - The email to check.
	 * @param { String } [config.excludeUserId] - A user id to exclude from the check (e.g. editing one's own profile).
	 */
	async execute({ repository, email, excludeUserId }) {
		const result = await repository.list('user', { query: { email } })
		const existing = result.records.find(user => String(user._id) !== String(excludeUserId))
		if (existing) throw new BadRequestError('This email is already registered.')
	}
}

module.exports = CheckEmailAvailable
