const crypto = require('crypto')

class GenerateOpaqueToken {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new GenerateOpaqueToken()
		return this.instance
	}

	/**
	 * Generates a random opaque token.
	 * @param { Object } [config]
	 * @param { Number } [config.bytes] - Number of random bytes to use (defaults to 32).
	 * @returns { String } A random hex string.
	 */
	execute({ bytes = 32 } = {}) {
		return crypto.randomBytes(bytes).toString('hex')
	}
}

module.exports = GenerateOpaqueToken
