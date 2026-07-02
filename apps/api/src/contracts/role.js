class RoleContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RoleContract()
		return this.instance
	}

	getContract() {
		return {
			name: true,
			active: true,
		}
	}
}

module.exports = RoleContract
