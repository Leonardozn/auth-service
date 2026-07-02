const Password_reset_tokenController = require('../controllers/password_reset_token')

class Password_reset_tokenRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	password_reset_tokenController

	constructor() {
		this.password_reset_tokenController = Password_reset_tokenController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Password_reset_tokenRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/password_reset_token',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.password_reset_tokenController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.password_reset_tokenController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.password_reset_tokenController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.password_reset_tokenController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.password_reset_tokenController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.password_reset_tokenController.remove }
			]
		}
	}
}

module.exports = Password_reset_tokenRouter