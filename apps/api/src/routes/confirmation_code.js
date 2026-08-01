const Confirmation_codeController = require('../controllers/confirmation_code')

class Confirmation_codeRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	confirmation_codeController

	constructor() {
		this.confirmation_codeController = Confirmation_codeController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Confirmation_codeRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/confirmation_code',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.confirmation_codeController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.confirmation_codeController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.confirmation_codeController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.confirmation_codeController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.confirmation_codeController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.confirmation_codeController.remove }
			]
		}
	}
}

module.exports = Confirmation_codeRouter