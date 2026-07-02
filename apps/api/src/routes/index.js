const SessionRouter = require('./session')
const UserRouter = require('./user')
const RoleRouter = require('./role')
const HealthRouter = require('./health')

class Routes {	/**
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

	constructor() {
		this.healthRouter = HealthRouter.getInstance().getRoutes()
		this.roleRouter = RoleRouter.getInstance().getRoutes()
		this.userRouter = UserRouter.getInstance().getRoutes()
		this.sessionRouter = SessionRouter.getInstance().getRoutes()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Routes()
		return this.instance
	}

	getRoutes() {
		return {
			sessionRouter: this.sessionRouter,
			userRouter: this.userRouter,
			roleRouter: this.roleRouter,
			healthRouter: this.healthRouter
		}
	}
}

module.exports = Routes