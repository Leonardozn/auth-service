const { BadRequestError } = require('@auth-service/handle-errors')

/** Trailing slashes are cosmetic in a URL, so they must not decide whether a base is allowed. */
const normalize = (value) => String(value || '').trim().replace(/\/+$/, '')

class ResolvePasswordResetUrlBase {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ResolvePasswordResetUrlBase()
		return this.instance
	}

	/**
	 * Decides which base URL the password-recovery link points at.
	 *
	 * This service is consumed by more than one frontend (an admin panel and a public storefront),
	 * and a single hardcoded base can only ever be right for one of them - the other one's users get
	 * a recovery link into an application they never asked for. So the caller may name its own base.
	 *
	 * **A caller-supplied base is only honoured when it appears in the allow list**, and that is the
	 * whole point of this command rather than a security afterthought: whoever chooses the link in
	 * the email chooses where a valid, single-use reset token gets delivered. Accepting an arbitrary
	 * base would turn this service into a machine that emails working password-reset tokens to any
	 * address an attacker names, over the service's own domain and reputation.
	 *
	 * An empty allow list therefore does **not** mean "anything goes" - it means only the configured
	 * default is accepted. Defaults that fail closed are the only kind worth having here.
	 *
	 * @param { Object } config
	 * @param { String } [config.requested] - The base the caller asked for, if any.
	 * @param { String } config.defaultUrlBase - PASSWORD_RESET_URL_BASE, used when none was asked for.
	 * @param { String } [config.allowedUrlBases] - PASSWORD_RESET_ALLOWED_URL_BASES, comma-separated.
	 * @returns { String } The base URL to embed in the recovery link.
	 */
	execute({ requested, defaultUrlBase, allowedUrlBases }) {
		const fallback = normalize(defaultUrlBase)
		if (!requested) return fallback

		const allowed = String(allowedUrlBases || '')
			.split(',')
			.map(normalize)
			.filter(Boolean)

		// The default is always acceptable: it is configured by whoever runs the service, so a
		// deployment that names a single frontend never has to repeat it in the allow list.
		if (fallback && !allowed.includes(fallback)) allowed.push(fallback)

		const candidate = normalize(requested)
		if (!allowed.includes(candidate)) throw new BadRequestError('Reset URL base is not allowed.')

		return candidate
	}
}

module.exports = ResolvePasswordResetUrlBase
