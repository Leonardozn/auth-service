const DataValidatorHandler = require('../handlers/dataValidator')

class AccountManagementInterfaces {
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
	changePasswordInterface

	/**
	 * @private
	 */
	forgotPasswordInterface

	/**
	 * @private
	 */
	types

	constructor() {
		this.dataValidatorHandler = DataValidatorHandler.getInstance()
		this.types = this.dataValidatorHandler.getTypes()

		this.changePasswordInterface = this.dataValidatorHandler.validate({
			currentPassword: { type: this.types.string },
			newPassword: { type: this.types.string }
		})

		this.forgotPasswordInterface = this.dataValidatorHandler.validate({
			email: { type: this.types.string }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new AccountManagementInterfaces()
		return this.instance
	}

	getChangePasswordInterface() {
		return this.changePasswordInterface
	}

	getForgotPasswordInterface() {
		return this.forgotPasswordInterface
	}
}

module.exports = AccountManagementInterfaces
