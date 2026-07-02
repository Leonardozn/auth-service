const Repository = require('../repositories')
const UserService = require('./user')
const AccountManagementInterfaces = require('../interfaces/accountManagement')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const DataValidatorHandler = require('../handlers/dataValidator')
const { UnauthorizedError } = require('../handlers/handleErrors')
const ExtractBearerToken = require('./commands/extractBearerToken')
const FindSessionByToken = require('./commands/findSessionByToken')
const FindUserById = require('./commands/findUserById')
const VerifyPassword = require('./commands/verifyPassword')
const HashPassword = require('./commands/hashPassword')
const RevokeSessions = require('./commands/revokeSessions')

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

		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.findUserById = FindUserById.getInstance()
		this.verifyPassword = VerifyPassword.getInstance()
		this.hashPassword = HashPassword.getInstance()
		this.revokeSessions = RevokeSessions.getInstance()
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
		await this.revokeSessions.execute({ repository: this.repository, userId: session.user, exceptSessionId: session._id })

		return null
	}
}

module.exports = AccountManagementService
