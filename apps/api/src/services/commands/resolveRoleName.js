class ResolveRoleName {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ResolveRoleName()
		return this.instance
	}

	/**
	 * Resolves a Role id to its name - callers of the Auth protocol (e.g. cv-service) authorize
	 * off the role's name, never its id, so POST /auth/validate must carry it.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { ObjectId|String } config.roleId - The Role's _id (the raw value stored on User.role).
	 * @returns { String|null } The role's name, or null if roleId is unset or no longer exists.
	 */
	async execute({ repository, roleId }) {
		if (!roleId) return null
		const result = await repository.list('role', { query: { _id: roleId } })
		const role = result.records[0]
		return role ? role.name : null
	}
}

module.exports = ResolveRoleName
