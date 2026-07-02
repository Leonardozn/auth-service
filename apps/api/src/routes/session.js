const SessionController = require('../controllers/session')

class SessionRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	sessionController

	constructor() {
		this.sessionController = SessionController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new SessionRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/session',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.sessionController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.sessionController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.sessionController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.sessionController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.sessionController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.sessionController.remove }
			]
		}
	}
}

module.exports = SessionRouter