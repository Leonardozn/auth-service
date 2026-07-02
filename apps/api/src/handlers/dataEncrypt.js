const DataEncrypt = require('@auth-service/data-encrypt')

class DataEncryptHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	dataEncrypt

	constructor() {
	this.dataEncrypt = DataEncrypt.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new DataEncryptHandler()
		return this.instance
	}

	/**
	 * Returns a string hashed.
	 * @param { String } str - The string to be hashed (max 72 characters).
	 * @returns { String } The string hashed.
	 */
	encrypt(str) {
		return this.dataEncrypt.encrypt(str)
	}

	/**
	 * Returns a boolean value.
	 * @param { String } str - The original string to be compared with a hash (max 72 characters).
	 * @param { String } hash - The hash to verify the original string.
	 * @returns { Boolean } True if verification passed.
	 */
	verify(str, hash) {
		return this.dataEncrypt.verify(str, hash)
	}

	/**
	 * Returns a signed token.
	 * @param { Object } payload - The payload to encrypt.
	 * @param { String } key - A secret to sign.
	 * @param { String } expiresIn - The time in string format, for exaple, 15m, 16h or 20s.
	 * @returns { String } An signed token.
	 */
	createAndSignToken(payload, key, expiresIn) {
		return this.dataEncrypt.createAndSignToken(payload, key, expiresIn)
	}

	/**
	 * Returns a decoded token.
	 * @param { String } str - The signed token.
	 * @param { String } expiresIn - The secret key with which it was signed.
	 * @returns { Object } The payload that contained the token.
	 */
	verifyToken(singnedToken, key) {
		return this.dataEncrypt.verifyToken(singnedToken, key)
	}

	/**
	 * Returns a SHA-256 hex hash of the given string.
	 * @param { String } token - The string to hash.
	 * @returns { String } SHA-256 hex digest.
	 */
	hashToken(token) {
		return this.dataEncrypt.hashToken(token)
	}
}

module.exports = DataEncryptHandler