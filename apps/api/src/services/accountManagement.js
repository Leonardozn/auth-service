const Repository = require('../repositories')
const UserService = require('./user')
const AccountManagementInterfaces = require('../interfaces/accountManagement')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const EmailManagerHandler = require('../handlers/emailManager')
const DbConnectionHandler = require('../handlers/dbConnections')
const envVariables = require('../handlers/envVariables')
const { UnauthorizedError, InternalServerError } = require('../handlers/handleErrors')
const ExtractBearerToken = require('./commands/extractBearerToken')
const FindSessionByToken = require('./commands/findSessionByToken')
const FindUserById = require('./commands/findUserById')
const VerifyPassword = require('./commands/verifyPassword')
const HashPassword = require('./commands/hashPassword')
const DeleteResourcesByUser = require('./commands/deleteResourcesByUser')
const GenerateOpaqueToken = require('./commands/generateOpaqueToken')
const ComputeExpiryDate = require('./commands/computeExpiryDate')
const SendPasswordResetEmail = require('./commands/sendPasswordResetEmail')
const FindValidPasswordResetToken = require('./commands/findValidPasswordResetToken')
const AuthorizeAccountAccess = require('./commands/authorizeAccountAccess')
const CheckEmailAvailable = require('./commands/checkEmailAvailable')
const ValidatePasswordPolicy = require('./commands/validatePasswordPolicy')
const GenerateNumericCode = require('./commands/generateNumericCode')
const SendChangePasswordVerificationEmail = require('./commands/sendChangePasswordVerificationEmail')
const FindValidChangePasswordCode = require('./commands/findValidChangePasswordCode')

class AccountManagementService {
	/**
	 * @private
	 * @static
	 */
	instance

	constructor() {
		this.repository = Repository.getInstance()
		this.userService = UserService.getInstance()
		this.accountInterface = AccountManagementInterfaces.getInstance()
		this.dataEncryptHandler = DataEncryptHandler.getInstance()
		this.luxon = DataValidatorHandler.getInstance().getLuxon()
		this.emailManagerHandler = EmailManagerHandler.getInstance()
		this.dbConnectionHandler = DbConnectionHandler.getInstance()

		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.findUserById = FindUserById.getInstance()
		this.verifyPassword = VerifyPassword.getInstance()
		this.hashPassword = HashPassword.getInstance()
		this.deleteResourcesByUser = DeleteResourcesByUser.getInstance()
		this.generateOpaqueToken = GenerateOpaqueToken.getInstance()
		this.computeExpiryDate = ComputeExpiryDate.getInstance()
		this.sendPasswordResetEmail = SendPasswordResetEmail.getInstance()
		this.findValidPasswordResetToken = FindValidPasswordResetToken.getInstance()
		this.authorizeAccountAccess = AuthorizeAccountAccess.getInstance()
		this.checkEmailAvailable = CheckEmailAvailable.getInstance()
		this.validatePasswordPolicy = ValidatePasswordPolicy.getInstance()
		this.generateNumericCode = GenerateNumericCode.getInstance()
		this.sendChangePasswordVerificationEmail = SendChangePasswordVerificationEmail.getInstance()
		this.findValidChangePasswordCode = FindValidChangePasswordCode.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new AccountManagementService()
		return this.instance
	}

	async changePassword(config = {}) {
		const { currentPassword, newPassword } = this.accountInterface.getChangePasswordInterface().parse(config.body)

		// Step 1: identify the authenticated user's session from the access token
		const token = this.extractBearerToken.execute({ authorizationHeader: config.authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: fetch the raw user (contract hides the password hash) and verify the current password
		const user = await this.findUserById.execute({ repository: this.repository, id: session.user })
		const matches = this.verifyPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password: currentPassword, hash: user.password })
		if (!matches) throw new UnauthorizedError('Current password does not match.')

		// Step 3: reject a new password that doesn't meet the required policy
		this.validatePasswordPolicy.execute({ password: newPassword })

		// Step 4: discard any previous pending verification code for this user - only the latest request stays valid
		await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'change_password_verification_code', userId: session.user })

		// Step 5: pre-hash the new password so it's never stored (or resent) in plain text while the change is pending
		const newPasswordHash = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password: newPassword })

		// Step 6: generate a 6-digit verification code and persist it alongside the pending password change
		const code = this.generateNumericCode.execute()
		const expiresAt = this.computeExpiryDate.execute({ luxon: this.luxon, duration: envVariables.CHANGE_PASSWORD_CODE_DEFAULT_TIME || '5m' })
		await this.repository.add('change_password_verification_code', { data: { user: String(session.user), code, newPasswordHash, expiresAt, used: false, attempts: 0 } })

		// Step 7: email the verification code - the caller is already authenticated, so a delivery failure must surface (unlike forgot-password).
		// Wrapped so a raw provider error (e.g. Resend rejecting the API key with its own 401) never
		// reaches the client with a status code that could be confused with an auth/credentials failure.
		try {
			await this.sendChangePasswordVerificationEmail.execute({
				emailManagerHandler: this.emailManagerHandler,
				apiUrl: envVariables.RESEND_API_URL || 'https://api.resend.com/emails',
				resendToken: envVariables.RESEND_TOKEN,
				from: envVariables.ADMIN_MAIL_FROM || 'onboarding@resend.dev',
				to: user.email,
				code
			})
		} catch (error) {
			console.error('Failed to send change-password verification email:', error)
			throw new InternalServerError('Failed to send the verification email.')
		}

		return null
	}

	async verifyChangePassword(config = {}) {
		const { code } = this.accountInterface.getVerifyChangePasswordInterface().parse(config.body)

		// Step 1: identify the authenticated user's session from the access token
		const token = this.extractBearerToken.execute({ authorizationHeader: config.authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: find the pending code for this user, validating it matches, isn't expired, and hasn't exceeded the attempt limit
		const verification = await this.findValidChangePasswordCode.execute({
			repository: this.repository,
			luxon: this.luxon,
			userId: session.user,
			code,
			maxAttempts: Number(envVariables.CHANGE_PASSWORD_CODE_MAX_ATTEMPTS) || 5
		})

		// Step 3: apply the new password hash that was prepared when the code was requested
		await this.userService.update({ id: session.user, body: { password: verification.newPasswordHash } })

		// Step 4: mark the verification code as used - it is single-use
		await this.repository.update('change_password_verification_code', { id: verification._id, data: { used: true } })

		// Step 5: revoke every other session, keeping the current one alive
		await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'session', userId: session.user, exceptId: session._id })

		return null
	}

	async forgotPassword(config = {}) {
		const { email } = this.accountInterface.getForgotPasswordInterface().parse(config.body)

		// Step 1: look up the user by email - silently continue either way, never reveal existence
		const result = await this.repository.list('user', { query: { email } })
		const user = result.records[0]

		if (user) {
			// Step 2: create an opaque, single-use password reset token
			const token = this.generateOpaqueToken.execute()
			const expiresAt = this.computeExpiryDate.execute({ luxon: this.luxon, duration: envVariables.RESET_TOKEN_DEFAULT_TIME || '30m' })
			await this.repository.add('password_reset_token', { data: { user: String(user._id), token, expiresAt, used: false } })

			// Step 3: send the recovery email - a delivery failure must never surface to the client
			try {
				await this.sendPasswordResetEmail.execute({
					emailManagerHandler: this.emailManagerHandler,
					// Fallbacks match the documented defaults (DOCUMENTATION.md "Variables de entorno") -
					// keeps this working (and testable without a local .env) even before these are set.
					apiUrl: envVariables.RESEND_API_URL || 'https://api.resend.com/emails',
					resendToken: envVariables.RESEND_TOKEN,
					from: envVariables.ADMIN_MAIL_FROM || 'onboarding@resend.dev',
					to: email,
					resetUrlBase: envVariables.PASSWORD_RESET_URL_BASE || 'http://localhost:5173/reset-password',
					passwordResetToken: token
				})
			} catch (error) {
				console.error('Failed to send password reset email:', error)
			}
		}

		return null
	}

	async resetPassword(config = {}) {
		const { token, newPassword } = this.accountInterface.getResetPasswordInterface().parse(config.body)

		// Step 1: find a still-valid (unused, not expired) password reset token
		const resetToken = await this.findValidPasswordResetToken.execute({ repository: this.repository, luxon: this.luxon, token })

		// Step 2: reject a new password that doesn't meet the required policy
		this.validatePasswordPolicy.execute({ password: newPassword })

		// Step 3: hash and persist the new password
		const hashedPassword = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password: newPassword })
		await this.userService.update({ id: resetToken.user, body: { password: hashedPassword } })

		// Step 4: mark the reset token as used - it is single-use
		await this.repository.update('password_reset_token', { id: resetToken._id, data: { used: true } })

		// Step 5: revoke every active session for this user (no exception - the caller isn't authenticated)
		await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'session', userId: resetToken.user })

		return null
	}

	async editProfile(config = {}) {
		const { id, authorizationHeader } = config
		const { name, email, active } = this.accountInterface.getEditProfileInterface().parse(config.body)

		// Step 1: identify the authenticated user via the access token
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: only the account's own owner or an admin may edit it
		const isSelf = String(session.user) === String(id)
		await this.authorizeAccountAccess.execute({ repository: this.repository, sessionUserId: session.user, targetUserId: id })

		// Step 3: reject an email already taken by a different user
		if (email) await this.checkEmailAvailable.execute({ repository: this.repository, email, excludeUserId: id })

		// Step 4: apply only the provided fields, reusing the User model's own service method.
		// `active` (de/reactivation) is admin-only - reaching this point with !isSelf already
		// proves the caller is an admin (authorizeAccountAccess only allows self or admin through).
		// Self-deactivation goes through POST /auth/deactivate instead, which also revokes sessions.
		const data = {}
		if (name !== undefined) data.name = name
		if (email !== undefined) data.email = email
		if (active !== undefined && !isSelf) data.active = active

		return this.userService.update({ id, body: data })
	}

	async deactivateAccount(config = {}) {
		const { authorizationHeader } = config

		// Step 1: identify the authenticated user via the access token - this endpoint only ever
		// acts on the caller's own account (no :id - see DOCUMENTATION.md "Desactivar la propia
		// cuenta"); an admin deactivating someone else uses PATCH /user/:id { active: false } instead.
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: mark the account inactive and revoke its sessions/reset tokens together - three
		// collections are written, so this runs inside a transaction (data-transactions-multi-write).
		const { authDbMongodb } = this.dbConnectionHandler.getConnection()
		const dbSession = await authDbMongodb.startSession()

		let user
		try {
			await dbSession.withTransaction(async () => {
				user = await this.userService.update({ id: session.user, body: { active: false }, options: { session: dbSession } })
				await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'session', userId: session.user, options: { session: dbSession } })
				await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'password_reset_token', userId: session.user, options: { session: dbSession } })
			})
		} finally {
			dbSession.endSession()
		}

		return user
	}
}

module.exports = AccountManagementService
