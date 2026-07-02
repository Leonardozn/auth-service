class HashPassword {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new HashPassword()
		return this.instance
	}

	/**
	 * Hashes a plain-text password.
	 * @param { Object } config
	 * @param { Object } config.dataEncryptHandler - The data-encrypt handler instance.
	 * @param { String } config.password - The plain-text password to hash.
	 * @returns { String } The hashed password.
	 */
	async execute({ dataEncryptHandler, password }) {
		return dataEncryptHandler.encrypt(password)
	}
}

module.exports = HashPassword
