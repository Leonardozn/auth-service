const { InternalServerError } = require('../../handlers/handleErrors')

class ResolveDefaultRole {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ResolveDefaultRole()
		return this.instance
	}

	/**
	 * Finds the active Role that new users are assigned by default.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } [config.roleName] - The role name to resolve (defaults to 'user').
	 * @returns { Object } The active Role document.
	 */
	async execute({ repository, roleName = 'user' }) {
		const result = await repository.list('role', { query: { name: roleName, active: true } })
		const role = result.records[0]
		if (!role) throw new InternalServerError(`Default role '${roleName}' is not configured.`)
		return role
	}
}

module.exports = ResolveDefaultRole
