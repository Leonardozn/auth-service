const Change_password_verification_codeService = require('../services/change_password_verification_code')
const HandleResponseHandler = require('../handlers/handleResponse')

class Change_password_verification_codeController {
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
	change_password_verification_codeService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.change_password_verification_codeService = Change_password_verification_codeService.getInstance()

		this.add = this.add.bind(this)
		this.findOne = this.findOne.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.replace = this.replace.bind(this)
		this.remove = this.remove.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new Change_password_verification_codeController()
		return this.instance
	}

	async add(req, res) {
		try {
			const change_password_verification_code = await this.change_password_verification_codeService.add({ body: req.body, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async findOne(req, res) {
		try {
			const change_password_verification_code = await this.change_password_verification_codeService.findOne({ id: req.params.id, query: req.query, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async list(req, res) {
		try {
			const change_password_verification_code_list = await this.change_password_verification_codeService.list({ query: req.query, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code_list)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async update(req, res) {
		try {
			const change_password_verification_code = await this.change_password_verification_codeService.update({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async replace(req, res) {
		try {
			const change_password_verification_code = await this.change_password_verification_codeService.replace({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async remove(req, res) {
		try {
			const change_password_verification_code = await this.change_password_verification_codeService.remove({ id: req.params.id, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(change_password_verification_code)

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = Change_password_verification_codeController
