class ParseDurationSeconds {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ParseDurationSeconds()
		return this.instance
	}

	/**
	 * Parses a short duration string (e.g. '60s', '5m') into a plain number of seconds - used
	 * wherever a duration is compared against elapsed time (a cooldown) rather than turned into a
	 * future Date (that's computeExpiryDate.js).
	 * @param { Object } config
	 * @param { String } config.duration - A duration string: an integer followed by s|m|h|d.
	 * @returns { Number } The duration in seconds.
	 */
	execute({ duration }) {
		const match = /^(\d+)(s|m|h|d)$/.exec(String(duration).trim())
		if (!match) throw new Error(`Invalid duration format: "${duration}". Expected e.g. "60s", "5m".`)

		const [, amountStr, unit] = match
		const unitSeconds = { s: 1, m: 60, h: 3600, d: 86400 }

		return Number(amountStr) * unitSeconds[unit]
	}
}

module.exports = ParseDurationSeconds
