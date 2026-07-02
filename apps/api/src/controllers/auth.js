const AuthenticationService = require('../services/authentication')
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

		this.register = this.register.bind(this)
		this.login = this.login.bind(this)
		this.refresh = this.refresh.bind(this)
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
}

module.exports = AuthController
