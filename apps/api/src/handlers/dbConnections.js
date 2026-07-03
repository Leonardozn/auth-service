const { AuthDbMongodb } = require('@auth-service/db-connections')

class DbConnectionHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	authDbMongodb

	constructor() {
		this.authDbMongodb = AuthDbMongodb
	}

	static getInstance() {
		if (!this.instance) this.instance = new DbConnectionHandler()
		return this.instance
	}

	/**
	 * @returns {object} - Databases connections.
	 */
	getConnection() {
		return {
			authDbMongodb: this.authDbMongodb
		}
	}
}

module.exports = DbConnectionHandler