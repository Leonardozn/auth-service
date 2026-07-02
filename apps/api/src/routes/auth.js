const AuthController = require('../controllers/auth')

class AuthRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	authController

	constructor() {
		this.authController = AuthController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/auth',
			paths: [
				{ requestMethod: 'post', path: '/register', controllerMethod: this.authController.register }
			]
		}
	}
}

module.exports = AuthRouter
