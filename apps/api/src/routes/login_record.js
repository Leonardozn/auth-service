const Login_recordController = require('../controllers/login_record')

class Login_recordRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	login_recordController

	constructor() {
		this.login_recordController = Login_recordController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Login_recordRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/login_record',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.login_recordController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.login_recordController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.login_recordController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.login_recordController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.login_recordController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.login_recordController.remove }
			]
		}
	}
}

module.exports = Login_recordRouter