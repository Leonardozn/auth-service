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
				{ requestMethod: 'post', path: '/register', controllerMethod: this.authController.register },
				{ requestMethod: 'post', path: '/login', controllerMethod: this.authController.login },
				{ requestMethod: 'post', path: '/refresh', controllerMethod: this.authController.refresh },
				{ requestMethod: 'post', path: '/validate', controllerMethod: this.authController.validate },
				{ requestMethod: 'post', path: '/logout', controllerMethod: this.authController.logout },
				{ requestMethod: 'post', path: '/change-password', controllerMethod: this.authController.changePassword },
				{ requestMethod: 'post', path: '/forgot-password', controllerMethod: this.authController.forgotPassword },
				{ requestMethod: 'post', path: '/reset-password', controllerMethod: this.authController.resetPassword }
			]
		}
	}
}

module.exports = AuthRouter
