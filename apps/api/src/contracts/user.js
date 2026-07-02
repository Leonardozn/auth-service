class UserContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new UserContract()
		return this.instance
	}

	getContract() {
		return {
			name: true,
			email: true,
			role: true,
		}
	}
}

module.exports = UserContract
