class Confirmation_codeContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new Confirmation_codeContract()
		return this.instance
	}

	getContract() {
		return {
			user: true,
			purpose: true,
			medium: true,
			expiresAt: true,
			used: true,
			attempts: true,
		}
	}
}

module.exports = Confirmation_codeContract
