const DataValidatorHandler = require('../handlers/dataValidator')
  
class Change_password_verification_codeInterfaces {
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
			code: { type: this.types.string, optional: true },
			newPasswordHash: { type: this.types.string, optional: true },
			expiresAt: { type: this.types.datetime, optional: true },
			used: { type: this.types.boolean, optional: true },
			attempts: { type: this.types.number, optional: true }
		})
  
		this.updateInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.objectId, optional: true },
			code: { type: this.types.string, optional: true },
			newPasswordHash: { type: this.types.string, optional: true },
			expiresAt: { type: this.types.datetime, optional: true },
			used: { type: this.types.boolean, optional: true },
			attempts: { type: this.types.number, optional: true },
			createdAt: { type: this.types.datetime, optional: true },
			updatedAt: { type: this.types.datetime, optional: true }
		})
  
		this.queryInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			user: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			code: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			newPasswordHash: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			expiresAt: { type: this.types.datetime, optional: true, transform: true, allowAdvance: true },
			used: { type: this.types.boolean, optional: true, transform: true, allowAdvance: true },
			attempts: { type: this.types.number, optional: true, transform: true, allowAdvance: true },
			createdAt: { type: this.types.datetime, optional: true, transform: true },
			updatedAt: { type: this.types.datetime, optional: true, transform: true }
		})
  
		this.virtualsInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.string, optional: true, isVirtual: true },
			user: { type: this.types.objectId, optional: true, isVirtual: true },
			code: { type: this.types.string, optional: true, isVirtual: true },
			newPasswordHash: { type: this.types.string, optional: true, isVirtual: true },
			expiresAt: { type: this.types.datetime, optional: true, isVirtual: true },
			used: { type: this.types.boolean, optional: true, isVirtual: true },
			attempts: { type: this.types.number, optional: true, isVirtual: true },
			createdAt: { type: this.types.datetime, optional: true, isVirtual: true },
			updatedAt: { type: this.types.datetime, optional: true, isVirtual: true }
		})
  
		this.relationsInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.string, optional: true, isVirtual: true }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new Change_password_verification_codeInterfaces()
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

module.exports = Change_password_verification_codeInterfaces