const { ForbiddenError } = require('../../handlers/handleErrors')

class AuthorizeAdminOrPermission {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new AuthorizeAdminOrPermission()
		return this.instance
	}

	/**
	 * Authorizes an administrative operation on this service's own resources (`user`, `role`),
	 * allowing through either:
	 *   - a user whose Role is named 'admin' (kept for backwards compatibility: consumers that
	 *     never populate `permissions` keep working exactly as before), or
	 *   - a user whose Role grants the given `{resource, action}` in its permissions catalog.
	 *
	 * Why both: gating these endpoints on the role NAME alone makes user and role administration
	 * impossible to delegate - either an account is called 'admin' and can do everything, or it
	 * can do nothing here, no matter what its permissions say. That forces every administrative
	 * account to be a full administrator, which is the opposite of what a permissions catalog is
	 * for.
	 *
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.userId - The authenticated (session) user's id.
	 * @param { String } config.resource - Resource name ('user' | 'role').
	 * @param { 'read'|'write' } config.action - Action being attempted.
	 */
	async execute({ repository, userId, resource, action }) {
		const userResult = await repository.list('user', { query: { _id: userId } })
		const user = userResult.records[0]
		if (!user) throw new ForbiddenError('Not authorized to perform this action.')

		const roleResult = await repository.list('role', { query: { _id: user.role } })
		const role = roleResult.records[0]
		if (!role) throw new ForbiddenError('Not authorized to perform this action.')

		if (role.name === 'admin') return

		const permission = (role.permissions || []).find(item => item.resource === resource)
		if (!permission || !permission[action]) {
			throw new ForbiddenError('Not authorized to perform this action.')
		}
	}
}

module.exports = AuthorizeAdminOrPermission
