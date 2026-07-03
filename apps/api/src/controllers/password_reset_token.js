const Password_reset_tokenService = require('../services/password_reset_token')
const HandleResponseHandler = require('../handlers/handleResponse')

class Password_reset_tokenController {
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
	password_reset_tokenService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.password_reset_tokenService = Password_reset_tokenService.getInstance()

		this.add = this.add.bind(this)
		this.findOne = this.findOne.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.replace = this.replace.bind(this)
		this.remove = this.remove.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new Password_reset_tokenController()
		return this.instance
	}

	async add(req, res) {
		try {
			const password_reset_token = await this.password_reset_tokenService.add({ body: req.body, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async findOne(req, res) {
		try {
			const password_reset_token = await this.password_reset_tokenService.findOne({ id: req.params.id, query: req.query, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
			
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async list(req, res) {
		try {
			const password_reset_token_list = await this.password_reset_tokenService.list({ query: req.query, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token_list)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async update(req, res) {
		try {
			const password_reset_token = await this.password_reset_tokenService.update({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async replace(req, res) {
		try {
			const password_reset_token = await this.password_reset_tokenService.replace({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async remove(req, res) {
		try {
			const password_reset_token = await this.password_reset_tokenService.remove({ id: req.params.id, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(password_reset_token)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = Password_reset_tokenController