const DataValidatorHandler = require('../handlers/dataValidator')
  
class UserInterfaces {
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
			name: { type: this.types.string, optional: true },
			email: { type: this.types.string, optional: true },
			password: { type: this.types.string, optional: true },
			role: { type: this.types.objectId, optional: true },
			active: { type: this.types.boolean, optional: true }
		})
  
		this.updateInterface = this.dataValidatorHandler.validate({
			name: { type: this.types.string, optional: true },
			email: { type: this.types.string, optional: true },
			password: { type: this.types.string, optional: true },
			role: { type: this.types.objectId, optional: true },
			active: { type: this.types.boolean, optional: true },
			createdAt: { type: this.types.datetime, optional: true },
			updatedAt: { type: this.types.datetime, optional: true }
		})
  
		this.queryInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			name: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			email: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			password: { type: this.types.string, optional: true, transform: true, allowAdvance: true },
			role: { type: this.types.objectId, optional: true, transform: true, allowAdvance: true },
			active: { type: this.types.boolean, optional: true, transform: true, allowAdvance: true },
			createdAt: { type: this.types.datetime, optional: true, transform: true },
			updatedAt: { type: this.types.datetime, optional: true, transform: true }
		})
  
		this.virtualsInterface = this.dataValidatorHandler.validate({
			_id: { type: this.types.string, optional: true, isVirtual: true },
			name: { type: this.types.string, optional: true, isVirtual: true },
			email: { type: this.types.string, optional: true, isVirtual: true },
			password: { type: this.types.string, optional: true, isVirtual: true },
			role: { type: this.types.objectId, optional: true, isVirtual: true },
			active: { type: this.types.boolean, optional: true, isVirtual: true },
			createdAt: { type: this.types.datetime, optional: true, isVirtual: true },
			updatedAt: { type: this.types.datetime, optional: true, isVirtual: true }
		})
  
		this.relationsInterface = this.dataValidatorHandler.validate({
			role: { type: this.types.string, optional: true, isVirtual: true }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserInterfaces()
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

module.exports = UserInterfaces