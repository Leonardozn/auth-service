class Change_password_verification_codeContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new Change_password_verification_codeContract()
		return this.instance
	}

	getContract() {
		return {
			user: true,
			code: true,
			newPasswordHash: true,
			expiresAt: true,
			used: true,
			attempts: true,
		}
	}
}

module.exports = Change_password_verification_codeContract
