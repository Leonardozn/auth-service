class FindRoleById {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindRoleById()
		return this.instance
	}

	/**
	 * Fetches the raw Role document by id (name, permissions, everything) - unlike a
	 * name-only lookup, this is what POST /auth/validate needs to both expose the role's name
	 * (the existing contract) and check its resource permissions (the new one) from a single
	 * query.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { ObjectId|String } config.roleId - The Role's _id (the raw value stored on User.role).
	 * @returns { Object|null } The Role document, or null if roleId is unset or no longer exists.
	 */
	async execute({ repository, roleId }) {
		if (!roleId) return null
		const result = await repository.list('role', { query: { _id: roleId } })
		return result.records[0] || null
	}
}

module.exports = FindRoleById
