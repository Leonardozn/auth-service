const crypto = require('crypto')

class GenerateNumericCode {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new GenerateNumericCode()
		return this.instance
	}

	/**
	 * Generates a random zero-padded numeric code (e.g. a 6-digit email verification code).
	 * @param { Object } [config]
	 * @param { Number } [config.digits] - Number of digits (defaults to 6).
	 * @returns { String } A random numeric string, zero-padded to `digits` length.
	 */
	execute({ digits = 6 } = {}) {
		const max = 10 ** digits
		return crypto.randomInt(0, max).toString().padStart(digits, '0')
	}
}

module.exports = GenerateNumericCode
