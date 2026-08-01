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
			maxSessions: true,
			permissions: [{
				resource: true,
				read: true,
				write: true,
			}],
		}
	}
}

module.exports = RoleContract
