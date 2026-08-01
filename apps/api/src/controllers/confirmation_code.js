const Confirmation_codeService = require('../services/confirmation_code')
const HandleResponseHandler = require('../handlers/handleResponse')

class Confirmation_codeController {
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
	confirmation_codeService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.confirmation_codeService = Confirmation_codeService.getInstance()

		this.add = this.add.bind(this)
		this.findOne = this.findOne.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.replace = this.replace.bind(this)
		this.remove = this.remove.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new Confirmation_codeController()
		return this.instance
	}

	async add(req, res) {
		try {
			const confirmation_code = await this.confirmation_codeService.add({ body: req.body, files: req.files })
			const response = this.handleResponseHandler.buildResponse(confirmation_code)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async findOne(req, res) {
		try {
			const confirmation_code = await this.confirmation_codeService.findOne({ id: req.params.id, query: req.query })
			const response = this.handleResponseHandler.buildResponse(confirmation_code)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
			
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async list(req, res) {
		try {
			const confirmation_code_list = await this.confirmation_codeService.list({ query: req.query })
			const response = this.handleResponseHandler.buildResponse(confirmation_code_list)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async update(req, res) {
		try {
			const confirmation_code = await this.confirmation_codeService.update({ body: req.body, id: req.params.id, files: req.files })
			const response = this.handleResponseHandler.buildResponse(confirmation_code)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async replace(req, res) {
		try {
			const confirmation_code = await this.confirmation_codeService.replace({ body: req.body, id: req.params.id, files: req.files })
			const response = this.handleResponseHandler.buildResponse(confirmation_code)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async remove(req, res) {
		try {
			const confirmation_code = await this.confirmation_codeService.remove({ id: req.params.id })
			const response = this.handleResponseHandler.buildResponse(confirmation_code)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = Confirmation_codeController