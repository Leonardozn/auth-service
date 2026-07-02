class ComputeExpiryDate {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ComputeExpiryDate()
		return this.instance
	}

	/**
	 * Parses a short duration string (e.g. '15m', '5d') and returns the future UTC Date.
	 * @param { Object } config
	 * @param { Object } config.luxon - The luxon module, obtained through the data-validator handler.
	 * @param { String } config.duration - A duration string: an integer followed by s|m|h|d.
	 * @returns { Date } The UTC date `duration` from now.
	 */
	execute({ luxon, duration }) {
		const match = /^(\d+)(s|m|h|d)$/.exec(String(duration).trim())
		if (!match) throw new Error(`Invalid duration format: "${duration}". Expected e.g. "15m", "5d".`)

		const [, amountStr, unit] = match
		const unitMap = { s: 'seconds', m: 'minutes', h: 'hours', d: 'days' }

		const { DateTime } = luxon
		return DateTime.now().setZone('utc').plus({ [unitMap[unit]]: Number(amountStr) }).toJSDate()
	}
}

module.exports = ComputeExpiryDate
