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
	validateInterface

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

		this.validateInterface = this.dataValidatorHandler.validate({
			token: { type: this.types.string },
			// Both optional, but required together (enforced in AuthenticationService.validate(),
			// not here - zod has no clean "both or neither" primitive) - when present, the token's
			// role is checked for permission to `action` on `resource`, not just validated.
			resource: { type: this.types.string, optional: true },
			action: { type: this.types.string, optional: true }
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

	getValidateInterface() {
		return this.validateInterface
	}
}

module.exports = AuthInterfaces
