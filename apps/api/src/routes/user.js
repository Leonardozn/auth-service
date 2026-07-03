const UserController = require('../controllers/user')

class UserRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	userController

	constructor() {
		this.userController = UserController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/user',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.userController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.userController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.userController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.userController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.userController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.userController.remove }
			]
		}
	}
}

module.exports = UserRouter