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
			_id: true,
			name: true,
			email: true,
			role: true,
			active: true,
		}
	}
}

module.exports = UserContract
