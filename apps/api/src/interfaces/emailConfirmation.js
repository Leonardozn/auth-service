const DataValidatorHandler = require('../handlers/dataValidator')

class EmailConfirmationInterfaces {
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
	emailStatusInterface

	/**
	 * @private
	 */
	sendConfirmationCodeInterface

	/**
	 * @private
	 */
	verifyConfirmationCodeInterface

	/**
	 * @private
	 */
	types

	constructor() {
		this.dataValidatorHandler = DataValidatorHandler.getInstance()
		this.types = this.dataValidatorHandler.getTypes()

		this.emailStatusInterface = this.dataValidatorHandler.validate({
			email: { type: this.types.string }
		})

		this.sendConfirmationCodeInterface = this.dataValidatorHandler.validate({
			email: { type: this.types.string },
			medium: { type: this.types.string, optional: true }
		})

		this.verifyConfirmationCodeInterface = this.dataValidatorHandler.validate({
			email: { type: this.types.string },
			code: { type: this.types.string }
		})
	}

	static getInstance() {
		if (!this.instance) this.instance = new EmailConfirmationInterfaces()
		return this.instance
	}

	getEmailStatusInterface() {
		return this.emailStatusInterface
	}

	getSendConfirmationCodeInterface() {
		return this.sendConfirmationCodeInterface
	}

	getVerifyConfirmationCodeInterface() {
		return this.verifyConfirmationCodeInterface
	}
}

module.exports = EmailConfirmationInterfaces
