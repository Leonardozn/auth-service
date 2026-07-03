const { BadRequestError } = require('../../handlers/handleErrors')

class FindUserById {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new FindUserById()
		return this.instance
	}

	/**
	 * Fetches the raw User document by id, bypassing contract filtering - needed whenever a
	 * process must read a field the contract hides (e.g. the password hash).
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { String } config.id - The user id.
	 * @returns { Object } The raw User document.
	 */
	async execute({ repository, id }) {
		const result = await repository.list('user', { query: { _id: id } })
		const user = result.records[0]
		if (!user) throw new BadRequestError('User not found.')
		return user
	}
}

module.exports = FindUserById
