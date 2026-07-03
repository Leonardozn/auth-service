const { ForbiddenError } = require('../../handlers/handleErrors')

class AuthorizeAccountAccess {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new AuthorizeAccountAccess()
		return this.instance
	}

	/**
	 * Authorizes account-management access to a target user: allowed for the account's own
	 * owner, or for a user whose Role is 'admin'. Throws otherwise.
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.sessionUserId - The authenticated (requesting) user's id.
	 * @param { String } config.targetUserId - The user id the request is acting on.
	 */
	async execute({ repository, sessionUserId, targetUserId }) {
		if (String(sessionUserId) === String(targetUserId)) return

		const userResult = await repository.list('user', { query: { _id: sessionUserId } })
		const user = userResult.records[0]
		if (!user) throw new ForbiddenError('Not authorized to access this account.')

		const roleResult = await repository.list('role', { query: { _id: user.role } })
		const role = roleResult.records[0]
		if (!role || role.name !== 'admin') throw new ForbiddenError('Not authorized to access this account.')
	}
}

module.exports = AuthorizeAccountAccess
