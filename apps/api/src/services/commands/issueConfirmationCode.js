class IssueConfirmationCode {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new IssueConfirmationCode()
		return this.instance
	}

	/**
	 * Persists a new ConfirmationCode for a user: enforces the resend cooldown, invalidates any
	 * previous unused code for the same purpose, generates a fresh 6-digit code, hashes it with the
	 * same slow algorithm used for passwords (a fast hash like SHA-256 would make a 6-digit code -
	 * one million combinations - brute-forceable from a leaked database in under a second), and
	 * stores it. Shared by register() (issuing the first code for a brand-new account) and
	 * send-confirmation-code (resending) - "two doors to the same send" per the spec, one
	 * implementation. Never sends the email itself: the plain-text code is returned so the caller
	 * can email it right after this resolves, deliberately outside of any surrounding transaction
	 * (a retried transaction callback must never re-send an email).
	 * @param { Object } config
	 * @param { Object } config.repository - The repository instance.
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { Object } config.dataEncryptHandler - The data-encrypt handler instance.
	 * @param { Object } config.generateNumericCode - The GenerateNumericCode command instance.
	 * @param { Object } config.computeExpiryDate - The ComputeExpiryDate command instance.
	 * @param { Object } config.invalidatePendingConfirmationCodes - The InvalidatePendingConfirmationCodes command instance.
	 * @param { Object } config.enforceConfirmationCodeCooldown - The EnforceConfirmationCodeCooldown command instance.
	 * @param { String } config.userId - The user this code is issued for.
	 * @param { String } config.purpose - The ConfirmationCode purpose (e.g. 'registration').
	 * @param { String } config.medium - The channel the code will be sent through (e.g. 'email').
	 * @param { Number } config.cooldownSeconds - Minimum seconds required since the last send.
	 * @param { String } config.codeDuration - How long the new code stays valid (e.g. '5m').
	 * @param { Boolean } [config.skipCooldownCheck] - Skip the cooldown check - only for register()
	 * replacing an unconfirmed account, where the cooldown was already checked one step earlier
	 * against the *old* user being replaced (the new user, by definition, never had a code before).
	 * @param { Object } [config.options] - Forwarded to every write (e.g. { session } for a transaction).
	 * @returns { Object } { code, expiresAt } - `code` is plain text, only for emailing it once.
	 */
	async execute({
		repository, luxon, dataEncryptHandler, generateNumericCode, computeExpiryDate,
		invalidatePendingConfirmationCodes, enforceConfirmationCodeCooldown,
		userId, purpose, medium, cooldownSeconds, codeDuration, skipCooldownCheck = false, options = {}
	}) {
		if (!skipCooldownCheck) {
			await enforceConfirmationCodeCooldown.execute({ repository, luxon, userId, purpose, cooldownSeconds })
		}

		await invalidatePendingConfirmationCodes.execute({ repository, userId, purpose, options })

		const code = generateNumericCode.execute()
		const codeHash = dataEncryptHandler.encrypt(code)
		const expiresAt = computeExpiryDate.execute({ luxon, duration: codeDuration })

		await repository.add('confirmation_code', {
			data: { user: String(userId), purpose, codeHash, medium, expiresAt, used: false, attempts: 0 },
			options
		})

		return { code, expiresAt }
	}
}

module.exports = IssueConfirmationCode
