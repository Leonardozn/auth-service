const { types, DataValidator, luxon } = require('@auth-service/data-validator')

class DataValidatorHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	dataValidator

	/**
	 * @private
	 */
	types

	/**
	 * @private
	 */
	luxon

	constructor() {
		this.dataValidator = DataValidator.getInstance()
		this.types = types
		this.luxon = luxon
	}

	static getInstance() {
		if (!this.instance) this.instance = new DataValidatorHandler()
		return this.instance
	}

	validate(objInterface={}) {
		return this.dataValidator.validate(objInterface)
	}

	getTypes() {
		return this.types
	}

	getLuxon() {
		return this.luxon
	}
}

module.exports = DataValidatorHandler