const DataValidatorHandler = require('../handlers/dataValidator')

class AuthInterfaces {
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
	registerInterface

	/**
	 * @private
	 */
	types

	constructor() {
		this.dataValidatorHandler = DataValidatorHandler.getInstance()
		this.types = this.dataValidatorHandler.getTypes()

		this.registerInterface = this.dataValidatorHandler.validate({
			name: { type: this.types.string },
			email: { type: this.types.string },
			password: { type: this.types.string }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthInterfaces()
		return this.instance
	}

	getRegisterInterface() {
		return this.registerInterface
	}
}

module.exports = AuthInterfaces
