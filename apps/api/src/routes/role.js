const RoleController = require('../controllers/role')

class RoleRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	roleController

	constructor() {
		this.roleController = RoleController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new RoleRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/role',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.roleController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.roleController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.roleController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.roleController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.roleController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.roleController.remove }
			]
		}
	}
}

module.exports = RoleRouter