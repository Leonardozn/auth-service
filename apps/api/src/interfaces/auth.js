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
	loginInterface

	/**
	 * @private
	 */
	refreshInterface

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

		this.loginInterface = this.dataValidatorHandler.validate({
			email: { type: this.types.string },
			password: { type: this.types.string }
		})

		this.refreshInterface = this.dataValidatorHandler.validate({
			refreshToken: { type: this.types.string }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthInterfaces()
		return this.instance
	}

	getRegisterInterface() {
		return this.registerInterface
	}

	getLoginInterface() {
		return this.loginInterface
	}

	getRefreshInterface() {
		return this.refreshInterface
	}
}

module.exports = AuthInterfaces
