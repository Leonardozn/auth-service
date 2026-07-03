const Repository = require('../repositories')
const UserService = require('./user')
const AccountManagementInterfaces = require('../interfaces/accountManagement')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const EmailResendHandler = require('../handlers/emailResend')
const DbConnectionHandler = require('../handlers/dbConnections')
const envVariables = require('../handlers/envVariables')
const { UnauthorizedError } = require('../handlers/handleErrors')
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
		this.emailResendHandler = EmailResendHandler.getInstance()
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

		// Step 3: hash and persist the new password
		const hashedPassword = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password: newPassword })
		await this.userService.update({ id: session.user, body: { password: hashedPassword } })

		// Step 4: revoke every other session, keeping the current one alive
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
					emailResendHandler: this.emailResendHandler,
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

		// Step 2: hash and persist the new password
		const hashedPassword = await this.hashPassword.execute({ dataEncryptHandler: this.dataEncryptHandler, password: newPassword })
		await this.userService.update({ id: resetToken.user, body: { password: hashedPassword } })

		// Step 3: mark the reset token as used - it is single-use
		await this.repository.update('password_reset_token', { id: resetToken._id, data: { used: true } })

		// Step 4: revoke every active session for this user (no exception - the caller isn't authenticated)
		await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'session', userId: resetToken.user })

		return null
	}

	async editProfile(config = {}) {
		const { id, authorizationHeader } = config
		const { name, email } = this.accountInterface.getEditProfileInterface().parse(config.body)

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
		await this.authorizeAccountAccess.execute({ repository: this.repository, sessionUserId: session.user, targetUserId: id })

		// Step 3: reject an email already taken by a different user
		if (email) await this.checkEmailAvailable.execute({ repository: this.repository, email, excludeUserId: id })

		// Step 4: apply only the provided fields, reusing the User model's own service method
		const data = {}
		if (name !== undefined) data.name = name
		if (email !== undefined) data.email = email

		return this.userService.update({ id, body: data })
	}

	async deleteAccount(config = {}) {
		const { id, authorizationHeader } = config

		// Step 1: identify the authenticated user via the access token
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		// Step 2: only the account's own owner or an admin may delete it
		await this.authorizeAccountAccess.execute({ repository: this.repository, sessionUserId: session.user, targetUserId: id })

		// Step 3: delete the user and cascade its own Session/PasswordResetToken records together -
		// three collections are written, so this runs inside a transaction (cv-service is not
		// notified of the deletion, per DOCUMENTATION.md's modularity note - its Curriculum records
		// are orphaned by id on purpose).
		const { authDbMongodb } = this.dbConnectionHandler.getConnection()
		const dbSession = await authDbMongodb.startSession()
		// entity-queries' list() runs a raw aggregation ($match), which - unlike Mongoose's normal
		// query methods - never auto-casts a plain string to ObjectId. Session/PasswordResetToken's
		// `user` field is ObjectId-typed, so deleteResourcesByUser's lookup silently matches nothing
		// unless userId is already a real ObjectId (as it naturally is when it comes from a prior
		// aggregate read, e.g. session.user in changePassword/resetPassword - but `id` here is a raw
		// route param string, so it must be cast explicitly).
		const targetUserId = new authDbMongodb.Types.ObjectId(id)

		let result
		try {
			await dbSession.withTransaction(async () => {
				result = await this.userService.remove({ id, options: { session: dbSession } })
				await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'session', userId: targetUserId, options: { session: dbSession } })
				await this.deleteResourcesByUser.execute({ repository: this.repository, schemaName: 'password_reset_token', userId: targetUserId, options: { session: dbSession } })
			})
		} finally {
			dbSession.endSession()
		}

		return result
	}
}

module.exports = AccountManagementService
