class ComputeSecondsUntil {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ComputeSecondsUntil()
		return this.instance
	}

	/**
	 * Computes how many whole seconds remain until a future date. Used to answer with
	 * `expiresInSeconds` instead of an absolute `expiresAt`: a client with a skewed clock still
	 * gets a correct countdown, and the code's real duration never has to be duplicated as a
	 * hardcoded number in a client-side copy.
	 * @param { Object } config
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { Date } config.date - The future date.
	 * @returns { Number } Seconds remaining, floored at 0 (never negative).
	 */
	execute({ luxon, date }) {
		const { DateTime } = luxon
		const target = DateTime.fromJSDate(new Date(date), { zone: 'utc' })
		const now = DateTime.now().setZone('utc')
		const seconds = Math.round(target.diff(now, 'seconds').seconds)

		return Math.max(seconds, 0)
	}
}

module.exports = ComputeSecondsUntil
