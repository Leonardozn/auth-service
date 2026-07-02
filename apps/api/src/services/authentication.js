const Repository = require('../repositories')
const UserService = require('./user')
const AuthInterfaces = require('../interfaces/auth')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const ResolveDefaultRole = require('./commands/resolveDefaultRole')
const CheckEmailAvailable = require('./commands/checkEmailAvailable')
const HashPassword = require('./commands/hashPassword')

class AuthenticationService {
	/**
	 * @private
	 * @static
	 */
	instance

	constructor() {
		this.repository = Repository.getInstance()
		this.userService = UserService.getInstance()
		this.authInterface = AuthInterfaces.getInstance()
		this.dataEncryptHandler = DataEncryptHandler.getInstance()

		this.resolveDefaultRole = ResolveDefaultRole.getInstance()
		this.checkEmailAvailable = CheckEmailAvailable.getInstance()
		this.hashPassword = HashPassword.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthenticationService()
		return this.instance
	}

	async register(config = {}) {
		const { name, email, password } = this.authInterface.getRegisterInterface().parse(config.body)

		// Step 1: resolve the default "user" role new registrations are assigned
		const role = await this.resolveDefaultRole.execute({ repository: this.repository })

		// Step 2: reject registration if the email is already taken
		await this.checkEmailAvailable.execute({ repository: this.repository, email })

		// Step 3: hash the plain-text password before persisting it
		const hashedPassword = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password })

		// Step 4: create the user, reusing the User model's own service method
		const user = await this.userService.add({ body: { name, email, password: hashedPassword, role: String(role._id) } })

		return { user }
	}
}

module.exports = AuthenticationService
