class Password_reset_tokenContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new Password_reset_tokenContract()
		return this.instance
	}

	getContract() {
		return {
			user: true,
			token: true,
			expiresAt: true,
			used: true,
		}
	}
}

module.exports = Password_reset_tokenContract
