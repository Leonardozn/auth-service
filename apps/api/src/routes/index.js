const Password_reset_tokenRouter = require('./password_reset_token')
const SessionRouter = require('./session')
const UserRouter = require('./user')
const RoleRouter = require('./role')
const HealthRouter = require('./health')
const AuthRouter = require('./auth')

class Routes {	/**
	 * @private
   */
	password_reset_tokenRouter

	/**
	 * @private
   */
	sessionRouter

	/**
	 * @private
   */
	userRouter

	/**
	 * @private
   */
	roleRouter


	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	healthRouter

	/**
	 * @private
	 */
	authRouter

	constructor() {
		this.healthRouter = HealthRouter.getInstance().getRoutes()
		this.roleRouter = RoleRouter.getInstance().getRoutes()
		this.userRouter = UserRouter.getInstance().getRoutes()
		this.sessionRouter = SessionRouter.getInstance().getRoutes()
		this.password_reset_tokenRouter = Password_reset_tokenRouter.getInstance().getRoutes()
		this.authRouter = AuthRouter.getInstance().getRoutes()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Routes()
		return this.instance
	}

	getRoutes() {
		return {
			password_reset_tokenRouter: this.password_reset_tokenRouter,
			sessionRouter: this.sessionRouter,
			userRouter: this.userRouter,
			roleRouter: this.roleRouter,
			healthRouter: this.healthRouter,
			authRouter: this.authRouter
		}
	}
}

module.exports = Routes
