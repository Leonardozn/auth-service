const Repository = require('../repositories')
const UserService = require('./user')
const EmailConfirmationInterfaces = require('../interfaces/emailConfirmation')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const EmailManagerHandler = require('../handlers/emailManager')
const DbConnectionHandler = require('../handlers/dbConnections')
const envVariables = require('../handlers/envVariables')
const { NotFoundError, BadRequestError, ForbiddenError } = require('../handlers/handleErrors')
const GenerateNumericCode = require('./commands/generateNumericCode')
const ComputeExpiryDate = require('./commands/computeExpiryDate')
const ComputeSecondsUntil = require('./commands/computeSecondsUntil')
const ParseDurationSeconds = require('./commands/parseDurationSeconds')
const EnforceConfirmationCodeCooldown = require('./commands/enforceConfirmationCodeCooldown')
const InvalidatePendingConfirmationCodes = require('./commands/invalidatePendingConfirmationCodes')
const IssueConfirmationCode = require('./commands/issueConfirmationCode')
const FindValidConfirmationCode = require('./commands/findValidConfirmationCode')
const SendConfirmationCodeEmail = require('./commands/sendConfirmationCodeEmail')
const ResolveEmailBrand = require('./commands/resolveEmailBrand')
const CreateSessionForUser = require('./commands/createSessionForUser')
const EnforceSessionLimit = require('./commands/enforceSessionLimit')
const IssueTokenPair = require('./commands/issueTokenPair')
const GenerateOpaqueToken = require('./commands/generateOpaqueToken')
const EnforceLoginRecordLimit = require('./commands/enforceLoginRecordLimit')
const WriteLoginRecord = require('./commands/writeLoginRecord')

// The only channel implemented today - `medium` already exists on ConfirmationCode so SMS/WhatsApp
// can be added later without changing the contract (see EXTENSION-AUTH-CODIGO-CONFIRMACION.md #11).
const SUPPORTED_MEDIUMS = ['email']

class EmailConfirmationService {
	/**
	 * @private
	 * @static
	 */
	instance

	constructor() {
		this.repository = Repository.getInstance()
		this.userService = UserService.getInstance()
		this.emailConfirmationInterface = EmailConfirmationInterfaces.getInstance()
		this.dataEncryptHandler = DataEncryptHandler.getInstance()
		this.luxon = DataValidatorHandler.getInstance().getLuxon()
		this.emailManagerHandler = EmailManagerHandler.getInstance()
		this.dbConnectionHandler = DbConnectionHandler.getInstance()

		this.generateNumericCode = GenerateNumericCode.getInstance()
		this.computeExpiryDate = ComputeExpiryDate.getInstance()
		this.computeSecondsUntil = ComputeSecondsUntil.getInstance()
		this.parseDurationSeconds = ParseDurationSeconds.getInstance()
		this.enforceConfirmationCodeCooldown = EnforceConfirmationCodeCooldown.getInstance()
		this.invalidatePendingConfirmationCodes = InvalidatePendingConfirmationCodes.getInstance()
		this.issueConfirmationCode = IssueConfirmationCode.getInstance()
		this.findValidConfirmationCode = FindValidConfirmationCode.getInstance()
		this.sendConfirmationCodeEmail = SendConfirmationCodeEmail.getInstance()
		this.resolveEmailBrand = ResolveEmailBrand.getInstance()
		this.createSessionForUser = CreateSessionForUser.getInstance()
		this.enforceSessionLimit = EnforceSessionLimit.getInstance()
		this.issueTokenPair = IssueTokenPair.getInstance()
		this.generateOpaqueToken = GenerateOpaqueToken.getInstance()
		this.enforceLoginRecordLimit = EnforceLoginRecordLimit.getInstance()
		this.writeLoginRecord = WriteLoginRecord.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new EmailConfirmationService()
		return this.instance
	}

	async checkEmailStatus(config = {}) {
		const { email } = this.emailConfirmationInterface.getEmailStatusInterface().parse(config.body)

		// registered is true whether or not the account has confirmed its email yet - the client
		// only needs to decide "show password field or registration form" (see the flow diagram in
		// EXTENSION-AUTH-CODIGO-CONFIRMACION.md #2). login() is what tells the two apart afterward.
		const result = await this.repository.list('user', { query: { email } })

		return { registered: result.records.length > 0 }
	}

	async sendCode(config = {}) {
		const { email, medium } = this.emailConfirmationInterface.getSendConfirmationCodeInterface().parse(config.body)
		const resolvedMedium = medium || 'email'

		// Step 1: the email must belong to an account - this is the one deliberate exception to
		// this service never emitting 404 (see decisions/decision-confirmation-code-introduces-404.md)
		const result = await this.repository.list('user', { query: { email } })
		const user = result.records[0]
		if (!user) throw new NotFoundError('No account found for this email.')

		// Step 2: reject a channel that isn't implemented yet
		if (!SUPPORTED_MEDIUMS.includes(resolvedMedium)) throw new BadRequestError(`Unsupported medium: ${resolvedMedium}.`)

		// Step 3-5: cooldown, invalidate any previous unused code, generate/hash/persist the new one -
		// a single collection write, no transaction needed
		const { code, expiresAt } = await this.issueConfirmationCode.execute({
			repository: this.repository,
			luxon: this.luxon,
			dataEncryptHandler: this.dataEncryptHandler,
			generateNumericCode: this.generateNumericCode,
			computeExpiryDate: this.computeExpiryDate,
			invalidatePendingConfirmationCodes: this.invalidatePendingConfirmationCodes,
			enforceConfirmationCodeCooldown: this.enforceConfirmationCodeCooldown,
			userId: user._id,
			purpose: 'registration',
			medium: resolvedMedium,
			cooldownSeconds: this.parseDurationSeconds.execute({ duration: envVariables.CONFIRMATION_CODE_RESEND_COOLDOWN || '60s' }),
			codeDuration: envVariables.CONFIRMATION_CODE_DEFAULT_TIME || '5m'
		})

		const expiresInSeconds = this.computeSecondsUntil.execute({ luxon: this.luxon, date: expiresAt })

		// Step 6: send the email - no try/catch on purpose, a Resend failure must surface as 502
		// (unlike forgot-password, which swallows it): there is nothing left to hide about the
		// email's existence at this point, and someone waiting on a code that never arrives would
		// otherwise be stuck without knowing it.
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

		return { expiresInSeconds }
	}

	async verifyCode(config = {}) {
		const { email, code } = this.emailConfirmationInterface.getVerifyConfirmationCodeInterface().parse(config.body)
		const { ip, userAgent } = config

		// Step 1: the email must belong to an account - deliberately 400 here (not 404, which is
		// acotado to send-confirmation-code only), same shape as "no pending code"
		const result = await this.repository.list('user', { query: { email } })
		const user = result.records[0]
		if (!user) throw new BadRequestError('No pending confirmation code.')

		// Step 2: validate the submitted code (hash compare, expiry, attempts) - outside the
		// transaction below, a single-collection read/write
		const record = await this.findValidConfirmationCode.execute({
			repository: this.repository,
			luxon: this.luxon,
			dataEncryptHandler: this.dataEncryptHandler,
			userId: user._id,
			code,
			purpose: 'registration',
			maxAttempts: Number(envVariables.CONFIRMATION_CODE_MAX_ATTEMPTS) || 5
		})

		// Step 3: burn the code and confirm the account together - two collections, so this runs
		// inside a transaction (data-transactions-multi-write), same pattern as
		// AccountManagementService.deactivateAccount(). This always happens once the code matches,
		// regardless of whether the account turns out to be active: confirming an email proves
		// mailbox ownership, which has nothing to do with account status, and the code is single-use
		// either way. Kept deliberately separate from session creation below - a ForbiddenError
		// thrown for an inactive account must not roll back the confirmation itself.
		const { authDbMongodb } = this.dbConnectionHandler.getConnection()
		const dbSession = await authDbMongodb.startSession()

		let confirmedUser
		try {
			await dbSession.withTransaction(async () => {
				await this.repository.update('confirmation_code', { id: record._id, data: { used: true }, options: { session: dbSession } })

				// A single update operation sets emailConfirmed and clears unconfirmedExpiresAt together -
				// if these were two writes and the second failed, the account would stay confirmed with
				// its delete-me date still alive, and the TTL index would delete it.
				confirmedUser = await this.userService.update({
					id: user._id,
					body: { emailConfirmed: true, unconfirmedExpiresAt: null },
					options: { session: dbSession }
				})
			})
		} finally {
			dbSession.endSession()
		}

		// Step 4: a deactivated account may not start a new session - same rule as login(), checked
		// only now so it never undoes the confirmation that just committed.
		if (confirmedUser.active === false) throw new ForbiddenError('Account is deactivated.')

		// Step 5: open a session - same shared command (and therefore the same maxSessions rules) as login()
		const tokenPair = await this.createSessionForUser.execute({
			repository: this.repository,
			enforceSessionLimit: this.enforceSessionLimit,
			issueTokenPair: this.issueTokenPair,
			generateOpaqueToken: this.generateOpaqueToken,
			computeExpiryDate: this.computeExpiryDate,
			luxon: this.luxon,
			userId: user._id,
			roleId: confirmedUser.role,
			sessionTokenDuration: envVariables.SESSION_TOKEN_DEFAULT_TIME || '15m',
			refreshTokenDuration: envVariables.REFRESH_TOKEN_DEFAULT_TIME || '5d'
		})

		// Step 6: only the success path writes a LoginRecord here - the spec (section 7) mentions it
		// only for the success step, unlike login() which is explicit about auditing every attempt
		// ("tanto si entra como si no"). Confirmed with the project owner.
		await this.writeLoginRecord.execute({
			repository: this.repository,
			enforceLoginRecordLimit: this.enforceLoginRecordLimit,
			user: user._id,
			email,
			result: 'success',
			method: 'confirmation_code',
			ip,
			userAgent,
			maxPerEmail: Number(envVariables.LOGIN_RECORD_MAX_PER_EMAIL) || 10
		})

		return {
			token: tokenPair.accessToken,
			refreshToken: tokenPair.refreshToken,
			user: confirmedUser
		}
	}
}

module.exports = EmailConfirmationService
