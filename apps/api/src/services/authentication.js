const Repository = require('../repositories')
const UserService = require('./user')
const AuthInterfaces = require('../interfaces/auth')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const envVariables = require('../handlers/envVariables')
const { ForbiddenError } = require('../handlers/handleErrors')
const ResolveDefaultRole = require('./commands/resolveDefaultRole')
const CheckEmailAvailable = require('./commands/checkEmailAvailable')
const HashPassword = require('./commands/hashPassword')
const VerifyCredentials = require('./commands/verifyCredentials')
const IssueTokenPair = require('./commands/issueTokenPair')
const GenerateOpaqueToken = require('./commands/generateOpaqueToken')
const ComputeExpiryDate = require('./commands/computeExpiryDate')
const FindSessionByToken = require('./commands/findSessionByToken')
const ExtractBearerToken = require('./commands/extractBearerToken')
const RemoveSessionByToken = require('./commands/removeSessionByToken')

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
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.removeSessionByToken = RemoveSessionByToken.getInstance()
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

		// Step 4: create the user (active by default), reusing the User model's own service method -
		// trustedRoleAssignment skips the admin check since this role came from resolveDefaultRole, not the client
		const user = await this.userService.add({ body: { name, email, password: hashedPassword, role: String(role._id), active: true }, trustedRoleAssignment: true })

		return { user }
	}

	async login(config = {}) {
		const { email, password } = this.authInterface.getLoginInterface().parse(config.body)

		// Step 1: find the user and verify their password
		const user = await this.verifyCredentials.execute({ repository: this.repository, dataEncryptHandler: this.dataEncryptHandler, email, password })

		// Step 2: a deactivated account may not start a new session
		if (user.active === false) throw new ForbiddenError('Account is deactivated.')

		// Step 3: issue a fresh access/refresh token pair
		const tokenPair = this.issueTokenPair.execute(this._tokenPairConfig())

		// Step 4: persist a new session for this login
		await this.repository.add('session', { data: { user: String(user._id), ...tokenPair } })

		return {
			token: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			user: this.userService.applayContract(user)
		}
	}

	async refresh(config = {}) {
		const { refreshToken } = this.authInterface.getRefreshInterface().parse(config.body)

		// Step 1: find a still-valid session matching the given refresh token
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'refreshToken',
			expiryField: 'refreshTokenExpiresAt',
			token: refreshToken
		})

		// Step 2: issue a fresh access/refresh token pair, rotating the old one
		const tokenPair = this.issueTokenPair.execute(this._tokenPairConfig())

		// Step 3: persist the rotated tokens on the existing session
		await this.repository.update('session', { id: session._id, data: tokenPair })

		// Step 4: return the renewed tokens with the session's user
		const user = await this.userService.findOne({ id: session.user })

		return {
			token: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			user
		}
	}

	async validate(config = {}) {
		const { token } = this.authInterface.getValidateInterface().parse(config.body)

		// Step 1: find a still-valid session matching the given access token
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: return the session's user (including role) - the caller never decodes the token itself
		const user = await this.userService.findOne({ id: session.user })

		return { user }
	}

	async logout(config = {}) {
		// Step 1: extract the access token from the Authorization header
		const token = this.extractBearerToken.execute({ authorizationHeader: config.authorizationHeader })

		// Step 2: revoke the matching session, if any - idempotent, no error when already gone
		await this.removeSessionByToken.execute({ repository: this.repository, tokenField: 'accessToken', token })

		return null
	}

	/**
	 * @private
	 */
	_tokenPairConfig() {
		return {
			generateOpaqueToken: this.generateOpaqueToken,
			computeExpiryDate: this.computeExpiryDate,
			luxon: this.luxon,
			// Fallbacks match the documented defaults (DOCUMENTATION.md "Variables de entorno") -
			// keeps token issuance working (and testable without a local .env) even before these are set.
			sessionTokenDuration: envVariables.SESSION_TOKEN_DEFAULT_TIME || '15m',
			refreshTokenDuration: envVariables.REFRESH_TOKEN_DEFAULT_TIME || '5d'
		}
	}
}

module.exports = AuthenticationService
