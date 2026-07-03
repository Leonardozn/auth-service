const { BadRequestError } = require('@auth-service/handle-errors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

class DataEncrypt {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new DataEncrypt()
		return this.instance
	}

	/**
	 * Returns a string hashed.
	 * @param { String } str - The string to be hashed (max 72 characters).
	 * @returns { String } The string hashed.
	 */
	encrypt(str) {
		if (str.length > 72) throw new BadRequestError('The string to be encrypted must not have more than 72 characters.')
		return bcrypt.hashSync(str, 12)
	}

	/**
	 * Returns a boolean value.
	 * @param { String } str - The original string to be compared with a hash (max 72 characters).
	 * @param { String } hash - The hash to verify the original string.
	 * @returns { Boolean } True if verification passed.
	 */
	verify(str, hash) {
		if (str.length > 72) throw new BadRequestError('The string to be compared must not have more than 72 characters.')
		return bcrypt.compareSync(str, hash)
	}

	/**
	 * Returns a signed token.
	 * @param { Object } payload - The payload to encrypt.
	 * @param { String } key - A secret to sign.
	 * @param { String } expiresIn - The time in string format, for exaple, 15m, 16h or 20s.
	 * @returns { String } An signed token.
	 */
	createAndSignToken(payload, key, expiresIn) {
		const token = jwt.sign(payload, key, { expiresIn })
		return token
	}

	/**
	 * Returns a decoded token.
	 * @param { String } str - The signed token.
	 * @param { String } expiresIn - The secret key with which it was signed.
	 * @returns { Object } The payload that contained the token.
	 */
	verifyToken(singnedToken, key) {
		const decoded = jwt.verify(singnedToken, key)
		return decoded
	}

	/**
	 * Returns a SHA-256 hex hash of the given string.
	 * @param { String } token - The string to hash.
	 * @returns { String } SHA-256 hex digest.
	 */
	hashToken(token) {
		return crypto.createHash('sha256').update(token).digest('hex')
	}
}

module.exports = DataEncrypt