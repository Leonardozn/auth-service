const Repository = require('../repositories')
const UserService = require('./user')
const AuthInterfaces = require('../interfaces/auth')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const envVariables = require('../handlers/envVariables')
const ResolveDefaultRole = require('./commands/resolveDefaultRole')
const CheckEmailAvailable = require('./commands/checkEmailAvailable')
const HashPassword = require('./commands/hashPassword')
const VerifyCredentials = require('./commands/verifyCredentials')
const IssueTokenPair = require('./commands/issueTokenPair')
const GenerateOpaqueToken = require('./commands/generateOpaqueToken')
const ComputeExpiryDate = require('./commands/computeExpiryDate')

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
		this.luxon = DataValidatorHandler.getInstance().getLuxon()

		this.resolveDefaultRole = ResolveDefaultRole.getInstance()
		this.checkEmailAvailable = CheckEmailAvailable.getInstance()
		this.hashPassword = HashPassword.getInstance()
		this.verifyCredentials = VerifyCredentials.getInstance()
		this.issueTokenPair = IssueTokenPair.getInstance()
		this.generateOpaqueToken = GenerateOpaqueToken.getInstance()
		this.computeExpiryDate = ComputeExpiryDate.getInstance()
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

	async login(config = {}) {
		const { email, password } = this.authInterface.getLoginInterface().parse(config.body)

		// Step 1: find the user and verify their password
		const user = await this.verifyCredentials.execute({ repository: this.repository, dataEncryptHandler: this.dataEncryptHandler, email, password })

		// Step 2: issue a fresh access/refresh token pair
		const tokenPair = this.issueTokenPair.execute({
			generateOpaqueToken: this.generateOpaqueToken,
			computeExpiryDate: this.computeExpiryDate,
			luxon: this.luxon,
			sessionTokenDuration: envVariables.SESSION_TOKEN_DEFAULT_TIME,
			refreshTokenDuration: envVariables.REFRESH_TOKEN_DEFAULT_TIME
		})

		// Step 3: persist a new session for this login
		await this.repository.add('session', { data: { user: String(user._id), ...tokenPair } })

		return {
			token: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			user: this.userService.applayContract(user)
		}
	}
}

module.exports = AuthenticationService
