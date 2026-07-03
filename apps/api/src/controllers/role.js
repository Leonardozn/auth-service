const RoleService = require('../services/role')
const HandleResponseHandler = require('../handlers/handleResponse')

class RoleController {
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
	roleService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.roleService = RoleService.getInstance()

		this.add = this.add.bind(this)
		this.findOne = this.findOne.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.replace = this.replace.bind(this)
		this.remove = this.remove.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new RoleController()
		return this.instance
	}

	async add(req, res) {
		try {
			const role = await this.roleService.add({ body: req.body, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(role)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async findOne(req, res) {
		try {
			const role = await this.roleService.findOne({ id: req.params.id, query: req.query })
			const response = this.handleResponseHandler.buildResponse(role)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
			
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async list(req, res) {
		try {
			const role_list = await this.roleService.list({ query: req.query })
			const response = this.handleResponseHandler.buildResponse(role_list)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async update(req, res) {
		try {
			const role = await this.roleService.update({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(role)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async replace(req, res) {
		try {
			const role = await this.roleService.replace({ body: req.body, id: req.params.id, files: req.files, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(role)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async remove(req, res) {
		try {
			const role = await this.roleService.remove({ id: req.params.id, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(role)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = RoleController