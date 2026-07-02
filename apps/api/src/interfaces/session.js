const DataValidatorHandler = require('../handlers/dataValidator')
  
class SessionInterfaces {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	dataValidatorHandler

	/**
	 * @private
	 */
	createInterface

	/**
	 * @private
	 */
	updateInterface

	/**
	 * @private
	 */
	queryInterface

	/**
	 * @private
	 */
	virtualsInterface

	/**
	 * @private
	 */
	relationsInterface

	/**
	 * @private
	 */
	types

	constructor() {
		this.dataValidatorHandler = DataValidatorHandler.getInstance()
		this.types = this.dataValidatorHandler.getTypes()

		this.createInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.objectId, optional: true },
			accessToken: { type: this.types.string, optional: true },
			accessTokenExpiresAt: { type: this.types.datetime, optional: true },
			refreshToken: { type: this.types.string, optional: true },
			refreshTokenExpiresAt: { type: this.types.datetime, optional: true }
		})
  
		this.updateInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.objectId, optional: true },
			accessToken: { type: this.types.string, optional: true },
			accessTokenExpiresAt: { type: this.types.datetime, optional: true },
			refreshToken: { type: this.types.string, optional: true },
			refreshTokenExpiresAt: { type: this.types.datetime, optional: true },
			createdAt: { type: this.types.datetime, optional: true },
			updatedAt: { type: this.types.datetime, optional: true }
		})
  
		this.queryInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			user: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			accessToken: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			accessTokenExpiresAt: { type: this.types.datetime, optional: true, transform: true, allowAdvance: true },
			refreshToken: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			refreshTokenExpiresAt: { type: this.types.datetime, optional: true, transform: true, allowAdvance: true },
			createdAt: { type: this.types.datetime, optional: true, transform: true },
			updatedAt: { type: this.types.datetime, optional: true, transform: true }
		})
  
		this.virtualsInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.string, optional: true, isVirtual: true },
			user: { type: this.types.objectId, optional: true, isVirtual: true },
			accessToken: { type: this.types.string, optional: true, isVirtual: true },
			accessTokenExpiresAt: { type: this.types.datetime, optional: true, isVirtual: true },
			refreshToken: { type: this.types.string, optional: true, isVirtual: true },
			refreshTokenExpiresAt: { type: this.types.datetime, optional: true, isVirtual: true },
			createdAt: { type: this.types.datetime, optional: true, isVirtual: true },
			updatedAt: { type: this.types.datetime, optional: true, isVirtual: true }
		})
  
		this.relationsInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.string, optional: true, isVirtual: true }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new SessionInterfaces()
		return this.instance
	}
	
	getCreateInterface() {
		return this.createInterface
	}

	getUpdateInterface() {
		return this.updateInterface
	}

	getQueryInterface() {
		return this.queryInterface
	}

	getVirtualsInterface() {
		return this.virtualsInterface
	}

	getRelationsInterface() {
		return this.relationsInterface
	}
}

module.exports = SessionInterfaces