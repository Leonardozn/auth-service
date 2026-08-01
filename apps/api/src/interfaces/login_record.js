const DataValidatorHandler = require('../handlers/dataValidator')
  
class Login_recordInterfaces {
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
			email: { type: this.types.string, optional: true },
			result: { type: this.types.string, optional: true },
			method: { type: this.types.string, optional: true },
			ip: { type: this.types.string, optional: true },
			userAgent: { type: this.types.string, optional: true }
		})
  
		this.updateInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.objectId, optional: true },
			email: { type: this.types.string, optional: true },
			result: { type: this.types.string, optional: true },
			method: { type: this.types.string, optional: true },
			ip: { type: this.types.string, optional: true },
			userAgent: { type: this.types.string, optional: true },
			createdAt: { type: this.types.datetime, optional: true },
			updatedAt: { type: this.types.datetime, optional: true }
		})
  
		this.queryInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			user: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			email: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			result: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			method: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			ip: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			userAgent: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			createdAt: { type: this.types.datetime, optional: true, transform: true },
			updatedAt: { type: this.types.datetime, optional: true, transform: true }
		})
  
		this.virtualsInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.string, optional: true, isVirtual: true },
			user: { type: this.types.objectId, optional: true, isVirtual: true },
			email: { type: this.types.string, optional: true, isVirtual: true },
			result: { type: this.types.string, optional: true, isVirtual: true },
			method: { type: this.types.string, optional: true, isVirtual: true },
			ip: { type: this.types.string, optional: true, isVirtual: true },
			userAgent: { type: this.types.string, optional: true, isVirtual: true },
			createdAt: { type: this.types.datetime, optional: true, isVirtual: true },
			updatedAt: { type: this.types.datetime, optional: true, isVirtual: true }
		})
  
		this.relationsInterface = this.dataValidatorHandler.validate({
			user: { type: this.types.string, optional: true, isVirtual: true }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new Login_recordInterfaces()
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

module.exports = Login_recordInterfaces