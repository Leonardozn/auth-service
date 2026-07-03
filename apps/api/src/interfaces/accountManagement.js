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
	resetPasswordInterface

	/**
	 * @private
	 */
	editProfileInterface

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

		this.resetPasswordInterface = this.dataValidatorHandler.validate({
			token: { type: this.types.string },
			newPassword: { type: this.types.string }
		})

		this.editProfileInterface = this.dataValidatorHandler.validate({
			name: { type: this.types.string, optional: true },
			email: { type: this.types.string, optional: true }
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

	getResetPasswordInterface() {
		return this.resetPasswordInterface
	}

	getEditProfileInterface() {
		return this.editProfileInterface
	}
}

module.exports = AccountManagementInterfaces
