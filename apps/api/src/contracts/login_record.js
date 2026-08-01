class Login_recordContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new Login_recordContract()
		return this.instance
	}

	getContract() {
		return {
			user: true,
			email: true,
			result: true,
			method: true,
			ip: true,
			userAgent: true,
		}
	}
}

module.exports = Login_recordContract
