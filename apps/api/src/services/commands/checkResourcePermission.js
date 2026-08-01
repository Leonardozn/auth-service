const { BadRequestError, ForbiddenError } = require('../../handlers/handleErrors')

const VALID_ACTIONS = ['read', 'write']

class CheckResourcePermission {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new CheckResourcePermission()
		return this.instance
	}

	/**
	 * Checks whether a Role's permissions list authorizes a given action on a given resource.
	 * Purely data-driven - no role name (not even "admin") is ever special-cased here; a role
	 * can only do what its own `permissions` list explicitly grants it.
	 * @param { Object } config
	 * @param { Array } [config.permissions] - The Role's permissions list ({ resource, read, write }[]).
	 * @param { String } config.resource - The resource being accessed.
	 * @param { String } config.action - 'read' | 'write'.
	 */
	execute({ permissions = [], resource, action }) {
		if (!VALID_ACTIONS.includes(action)) throw new BadRequestError(`Unsupported action: ${action}.`)

		const entry = permissions.find(permission => permission.resource === resource)
		const allowed = Boolean(entry && entry[action])

		if (!allowed) throw new ForbiddenError(`Not authorized to ${action} "${resource}".`)
	}
}

module.exports = CheckResourcePermission
