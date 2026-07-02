const { UnauthorizedError } = require('../../handlers/handleErrors')

class VerifyCredentials {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new VerifyCredentials()
		return this.instance
	}

	/**
	 * Finds the User by email and verifies the password hash.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.dataEncryptHandler - The data-encrypt handler instance.
	 * @param { String } config.email - The email to look up.
	 * @param { String } config.password - The plain-text password to verify.
	 * @returns { Object } The matching User document.
	 */
	async execute({ repository, dataEncryptHandler, email, password }) {
		const result = await repository.list('user', { query: { email } })
		const user = result.records[0]
		if (!user) throw new UnauthorizedError('Invalid email or password.')

		const matches = dataEncryptHandler.verify(password, user.password)
		if (!matches) throw new UnauthorizedError('Invalid email or password.')

		return user
	}
}

module.exports = VerifyCredentials
