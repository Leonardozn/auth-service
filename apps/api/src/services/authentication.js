const Repository = require('../repositories')
const UserService = require('./user')
const AuthInterfaces = require('../interfaces/auth')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const EmailManagerHandler = require('../handlers/emailManager')
const DbConnectionHandler = require('../handlers/dbConnections')
const envVariables = require('../handlers/envVariables')
const { BadRequestError, ForbiddenError } = require('../handlers/handleErrors')
const ResolveDefaultRole = require('./commands/resolveDefaultRole')
const CheckEmailAvailable = require('./commands/checkEmailAvailable')
const ValidatePasswordPolicy = require('./commands/validatePasswordPolicy')
const HashPassword = require('./commands/hashPassword')
const VerifyCredentials = require('./commands/verifyCredentials')
const IssueTokenPair = require('./commands/issueTokenPair')
const GenerateOpaqueToken = require('./commands/generateOpaqueToken')
const ComputeExpiryDate = require('./commands/computeExpiryDate')
const ComputeSecondsUntil = require('./commands/computeSecondsUntil')
const ParseDurationSeconds = require('./commands/parseDurationSeconds')
const FindSessionByToken = require('./commands/findSessionByToken')
const ExtractBearerToken = require('./commands/extractBearerToken')
const RemoveSessionByToken = require('./commands/removeSessionByToken')
const EnforceSessionLimit = require('./commands/enforceSessionLimit')
const FindRoleById = require('./commands/findRoleById')
const CheckResourcePermission = require('./commands/checkResourcePermission')
const DeleteResourcesByUser = require('./commands/deleteResourcesByUser')
const GenerateNumericCode = require('./commands/generateNumericCode')
const EnforceConfirmationCodeCooldown = require('./commands/enforceConfirmationCodeCooldown')
const InvalidatePendingConfirmationCodes = require('./commands/invalidatePendingConfirmationCodes')
const IssueConfirmationCode = require('./commands/issueConfirmationCode')
const SendConfirmationCodeEmail = require('./commands/sendConfirmationCodeEmail')
const ResolveEmailBrand = require('./commands/resolveEmailBrand')
const CreateSessionForUser = require('./commands/createSessionForUser')
const EnforceLoginRecordLimit = require('./commands/enforceLoginRecordLimit')
const WriteLoginRecord = require('./commands/writeLoginRecord')

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
		this.emailManagerHandler = EmailManagerHandler.getInstance()
		this.dbConnectionHandler = DbConnectionHandler.getInstance()

		this.resolveDefaultRole = ResolveDefaultRole.getInstance()
		this.checkEmailAvailable = CheckEmailAvailable.getInstance()
		this.validatePasswordPolicy = ValidatePasswordPolicy.getInstance()
		this.hashPassword = HashPassword.getInstance()
		this.verifyCredentials = VerifyCredentials.getInstance()
		this.issueTokenPair = IssueTokenPair.getInstance()
		this.generateOpaqueToken = GenerateOpaqueToken.getInstance()
		this.computeExpiryDate = ComputeExpiryDate.getInstance()
		this.computeSecondsUntil = ComputeSecondsUntil.getInstance()
		this.parseDurationSeconds = ParseDurationSeconds.getInstance()
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.removeSessionByToken = RemoveSessionByToken.getInstance()
		this.enforceSessionLimit = EnforceSessionLimit.getInstance()
		this.findRoleById = FindRoleById.getInstance()
		this.checkResourcePermission = CheckResourcePermission.getInstance()
		this.deleteResourcesByUser = DeleteResourcesByUser.getInstance()
		this.generateNumericCode = GenerateNumericCode.getInstance()
		this.enforceConfirmationCodeCooldown = EnforceConfirmationCodeCooldown.getInstance()
		this.invalidatePendingConfirmationCodes = InvalidatePendingConfirmationCodes.getInstance()
		this.issueConfirmationCode = IssueConfirmationCode.getInstance()
		this.sendConfirmationCodeEmail = SendConfirmationCodeEmail.getInstance()
		this.resolveEmailBrand = ResolveEmailBrand.getInstance()
		this.createSessionForUser = CreateSessionForUser.getInstance()
		this.enforceLoginRecordLimit = EnforceLoginRecordLimit.getInstance()
		this.writeLoginRecord = WriteLoginRecord.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthenticationService()
		return this.instance
	}

	async register(config = {}) {
		const { name, email, password } = this.authInterface.getRegisterInterface().parse(config.body)

		// Step 1: reject a password that doesn't meet the required policy
		this.validatePasswordPolicy.execute({ password })

		// Step 2: resolve the default "user" role new registrations are assigned
		const role = await this.resolveDefaultRole.execute({ repository: this.repository })

		// Step 3: does this email already have an account? An unconfirmed one never had a session
		// and never could have operated (login rejects unconfirmed accounts), so there is nothing to
		// protect - registering again replaces it instead of failing with "already registered".
		// A confirmed account (or a legacy one predating this field, emailConfirmed === undefined)
		// still blocks registration exactly as before.
		const existingResult = await this.repository.list('user', { query: { email } })
		const existingUser = existingResult.records[0]

		let existingUnconfirmedUser = null
		if (existingUser) {
			if (existingUser.emailConfirmed === false) {
				existingUnconfirmedUser = existingUser
			} else {
				await this.checkEmailAvailable.execute({ repository: this.repository, email })
			}
		}

		// Step 4: replacing an unconfirmed account still has to respect the resend cooldown, checked
		// against the code most recently sent to the account being replaced - if this were skipped,
		// or checked against the brand-new account instead (which by definition never had a code),
		// someone could register over and over with a stranger's email and flood their mailbox, since
		// every registration attempt sends a new code.
		const cooldownSeconds = this.parseDurationSeconds.execute({ duration: envVariables.CONFIRMATION_CODE_RESEND_COOLDOWN || '60s' })
		if (existingUnconfirmedUser) {
			await this.enforceConfirmationCodeCooldown.execute({
				repository: this.repository,
				luxon: this.luxon,
				userId: existingUnconfirmedUser._id,
				purpose: 'registration',
				cooldownSeconds
			})
		}

		// Step 5: hash the plain-text password before persisting it
		const hashedPassword = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password })

		// Step 6: create the account (replacing the unconfirmed one, if any) and issue its
		// confirmation code together - two collections (user, confirmation_code), so this runs
		// inside a transaction (data-transactions-multi-write).
		const { authDbMongodb } = this.dbConnectionHandler.getConnection()
		const dbSession = await authDbMongodb.startSession()
		const unconfirmedExpiresAt = this.computeExpiryDate.execute({ luxon: this.luxon, duration: envVariables.UNCONFIRMED_ACCOUNT_TTL || '7d' })

		let user, code, expiresAt
		try {
			await dbSession.withTransaction(async () => {
				if (existingUnconfirmedUser) {
					await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'confirmation_code', userId: existingUnconfirmedUser._id, options: { session: dbSession } })
					await this.repository.remove('user', { id: existingUnconfirmedUser._id, options: { session: dbSession } })
				}

				// trustedRoleAssignment skips the admin check since this role came from resolveDefaultRole, not the client
				user = await this.userService.add({
					body: { name, email, password: hashedPassword, role: String(role._id), active: true, emailConfirmed: false, unconfirmedExpiresAt },
					trustedRoleAssignment: true,
					options: { session: dbSession }
				})

				const issued = await this.issueConfirmationCode.execute({
					repository: this.repository,
					luxon: this.luxon,
					dataEncryptHandler: this.dataEncryptHandler,
					generateNumericCode: this.generateNumericCode,
					computeExpiryDate: this.computeExpiryDate,
					invalidatePendingConfirmationCodes: this.invalidatePendingConfirmationCodes,
					enforceConfirmationCodeCooldown: this.enforceConfirmationCodeCooldown,
					userId: user._id,
					purpose: 'registration',
					medium: 'email',
					// The cooldown was already checked in Step 4, against the account being replaced -
					// the brand-new account itself never had a code, so re-checking here would always
					// pass regardless, and skipping it explicitly documents that the gate already happened.
					skipCooldownCheck: true,
					codeDuration: envVariables.CONFIRMATION_CODE_DEFAULT_TIME || '5m',
					options: { session: dbSession }
				})
				code = issued.code
				expiresAt = issued.expiresAt
			})
		} finally {
			dbSession.endSession()
		}

		const expiresInSeconds = this.computeSecondsUntil.execute({ luxon: this.luxon, date: expiresAt })

		// Step 7: email the code after the transaction commits, never inside it - a retried
		// transaction callback must not risk sending the email twice. No try/catch, same contract as
		// send-confirmation-code: a Resend failure surfaces as 502.
		await this.sendConfirmationCodeEmail.execute({
			emailManagerHandler: this.emailManagerHandler,
			apiUrl: envVariables.RESEND_API_URL || 'https://api.resend.com/emails',
			resendToken: envVariables.RESEND_TOKEN,
			from: envVariables.ADMIN_MAIL_FROM || 'onboarding@resend.dev',
			to: email,
			code,
			expiresInSeconds,
			...this.resolveEmailBrand.execute()
		})

		// No session is opened here, and no LoginRecord is written - registering isn't logging in;
		// the session comes from POST /auth/verify-confirmation-code.
		return { user, expiresInSeconds }
	}

	async login(config = {}) {
		const { email, password } = this.authInterface.getLoginInterface().parse(config.body)
		const { ip, userAgent } = config
		const maxPerEmail = Number(envVariables.LOGIN_RECORD_MAX_PER_EMAIL) || 10

		let user
		try {
			// Step 1: find the user and verify their password
			user = await this.verifyCredentials.execute({ repository: this.repository, dataEncryptHandler: this.dataEncryptHandler, email, password })

			// Step 2: an unconfirmed email may not start a session either - a distinct message from
			// "invalid credentials" so the client can route to the code screen instead of accusing the
			// user of a wrong password.
			if (user.emailConfirmed === false) throw new ForbiddenError('Email not confirmed.')

			// Step 3: a deactivated account may not start a new session
			if (user.active === false) throw new ForbiddenError('Account is deactivated.')
		} catch (error) {
			// Every attempt is audited, success or failure - including "no such user", where `user`
			// stays undefined and the record is kept unassociated (LoginRecord.user is optional).
			await this.writeLoginRecord.execute({
				repository: this.repository,
				enforceLoginRecordLimit: this.enforceLoginRecordLimit,
				user: user ? user._id : null,
				email,
				result: 'failed',
				method: 'password',
				ip,
				userAgent,
				maxPerEmail
			})
			throw error
		}

		// Step 4: evict the oldest session if the user's role has a configured session limit, and
		// issue the new one - same shared command verify-confirmation-code() also uses.
		const tokenPair = await this.createSessionForUser.execute({
			repository: this.repository,
			enforceSessionLimit: this.enforceSessionLimit,
			issueTokenPair: this.issueTokenPair,
			generateOpaqueToken: this.generateOpaqueToken,
			computeExpiryDate: this.computeExpiryDate,
			luxon: this.luxon,
			userId: user._id,
			roleId: user.role,
			sessionTokenDuration: envVariables.SESSION_TOKEN_DEFAULT_TIME || '15m',
			refreshTokenDuration: envVariables.REFRESH_TOKEN_DEFAULT_TIME || '5d'
		})

		// Step 5: audit the successful attempt
		await this.writeLoginRecord.execute({
			repository: this.repository,
			enforceLoginRecordLimit: this.enforceLoginRecordLimit,
			user: user._id,
			email,
			result: 'success',
			method: 'password',
			ip,
			userAgent,
			maxPerEmail
		})

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

		// Step 4: return the renewed tokens with the session's user - already authenticated via the
		// refresh token itself, so this internal read skips User's own session check
		const user = await this.userService.findOne({ id: session.user, skipAuthCheck: true })

		return {
			token: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			user
		}
	}

	async validate(config = {}) {
		const { token, resource, action } = this.authInterface.getValidateInterface().parse(config.body)

		// Step 1: find a still-valid session matching the given access token
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: return the session's user - the caller never decodes the token itself; already
		// authenticated via the access token, so this internal read skips User's own session check
		const user = await this.userService.findOne({ id: session.user, skipAuthCheck: true })

		// Step 3: resolve the full Role in one query - both to expose its name (the contract every
		// other service, e.g. cv-service, already authorizes off - 'admin'/'user', never an id) and,
		// when a resource/action pair was requested, to check its permissions list below.
		const role = await this.findRoleById.execute({ repository: this.repository, roleId: user.role })
		user.role = role ? role.name : null

		// Step 4: a caller asking "can this token do X on Y" must supply both resource and action
		// together - one without the other is ambiguous, not a partial check. No role name is ever
		// special-cased here (not even "admin"): the answer comes entirely from role.permissions.
		if (resource || action) {
			if (!resource || !action) throw new BadRequestError('Both resource and action are required together.')
			this.checkResourcePermission.execute({ permissions: role ? role.permissions : [], resource, action })
		}

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
