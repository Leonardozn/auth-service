const AuthenticationService = require('../services/authentication')
const AccountManagementService = require('../services/accountManagement')
const HandleResponseHandler = require('../handlers/handleResponse')
const { HttpStatus } = require('../handlers/handleErrors')

class AuthController {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	handleResponseHandler

	/**
	 * @private
	 */
	authenticationService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.authenticationService = AuthenticationService.getInstance()
		this.accountManagementService = AccountManagementService.getInstance()

		this.register = this.register.bind(this)
		this.login = this.login.bind(this)
		this.refresh = this.refresh.bind(this)
		this.validate = this.validate.bind(this)
		this.logout = this.logout.bind(this)
		this.changePassword = this.changePassword.bind(this)
		this.verifyChangePassword = this.verifyChangePassword.bind(this)
		this.forgotPassword = this.forgotPassword.bind(this)
		this.resetPassword = this.resetPassword.bind(this)
		this.deactivate = this.deactivate.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthController()
		return this.instance
	}

	async register(req, res) {
		try {
			const result = await this.authenticationService.register({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result, HttpStatus.CREATED)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async login(req, res) {
		try {
			const result = await this.authenticationService.login({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async refresh(req, res) {
		try {
			const result = await this.authenticationService.refresh({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async validate(req, res) {
		try {
			const result = await this.authenticationService.validate({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async logout(req, res) {
		try {
			const result = await this.authenticationService.logout({ authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async changePassword(req, res) {
		try {
			const result = await this.accountManagementService.changePassword({ body: req.body, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async verifyChangePassword(req, res) {
		try {
			const result = await this.accountManagementService.verifyChangePassword({ body: req.body, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async forgotPassword(req, res) {
		try {
			const result = await this.accountManagementService.forgotPassword({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async resetPassword(req, res) {
		try {
			const result = await this.accountManagementService.resetPassword({ body: req.body })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async deactivate(req, res) {
		try {
			const result = await this.accountManagementService.deactivateAccount({ authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(result)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = AuthController
