const { ForbiddenError } = require('../../handlers/handleErrors')

class RequireAdminUser {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RequireAdminUser()
		return this.instance
	}

	/**
	 * Throws unless the given user's Role is 'admin'. Used to gate raw model-mutation
	 * endpoints (e.g. POST/PUT /role, or assigning a `role` through POST/PUT /user) that
	 * must stay admin-only regardless of the caller being the resource's own owner.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.userId - The authenticated (session) user's id.
	 */
	async execute({ repository, userId }) {
		const userResult = await repository.list('user', { query: { _id: userId } })
		const user = userResult.records[0]
		if (!user) throw new ForbiddenError('Not authorized to perform this action.')

		const roleResult = await repository.list('role', { query: { _id: user.role } })
		const role = roleResult.records[0]
		if (!role || role.name !== 'admin') throw new ForbiddenError('Not authorized to perform this action.')
	}
}

module.exports = RequireAdminUser
