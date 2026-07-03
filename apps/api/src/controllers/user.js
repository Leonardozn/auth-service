const UserService = require('../services/user')
const AccountManagementService = require('../services/accountManagement')
const HandleResponseHandler = require('../handlers/handleResponse')

class UserController {
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
	userService

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.userService = UserService.getInstance()
		this.accountManagementService = AccountManagementService.getInstance()

		this.add = this.add.bind(this)
		this.findOne = this.findOne.bind(this)
		this.list = this.list.bind(this)
		this.update = this.update.bind(this)
		this.replace = this.replace.bind(this)
		this.remove = this.remove.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserController()
		return this.instance
	}

	async add(req, res) {
		try {
			const user = await this.userService.add({ body: req.body, files: req.files })
			const response = this.handleResponseHandler.buildResponse(user)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async findOne(req, res) {
		try {
			const user = await this.userService.findOne({ id: req.params.id, query: req.query })
			const response = this.handleResponseHandler.buildResponse(user)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
			
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async list(req, res) {
		try {
			const user_list = await this.userService.list({ query: req.query })
			const response = this.handleResponseHandler.buildResponse(user_list)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async update(req, res) {
		try {
			const user = await this.accountManagementService.editProfile({ body: req.body, id: req.params.id, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(user)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}

	async replace(req, res) {
		try {
			const user = await this.userService.replace({ body: req.body, id: req.params.id, files: req.files })
			const response = this.handleResponseHandler.buildResponse(user)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
	
	async remove(req, res) {
		try {
			const user = await this.accountManagementService.deleteAccount({ id: req.params.id, authorizationHeader: req.headers.authorization })
			const response = this.handleResponseHandler.buildResponse(user)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)
	
			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = UserController