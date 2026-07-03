class VerifyPassword {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new VerifyPassword()
		return this.instance
	}

	/**
	 * Verifies a plain-text password against a hash.
	 * @param { Object } config
	 * @param { Object } config.dataEncryptHandler - The data-encrypt handler instance.
	 * @param { String } config.password - The plain-text password to check.
	 * @param { String } config.hash - The stored hash to check against.
	 * @returns { Boolean } True if the password matches the hash.
	 */
	execute({ dataEncryptHandler, password, hash }) {
		return dataEncryptHandler.verify(password, hash)
	}
}

module.exports = VerifyPassword
