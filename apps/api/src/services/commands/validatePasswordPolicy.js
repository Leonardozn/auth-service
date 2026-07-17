const { BadRequestError } = require('../../handlers/handleErrors')

// Requires: 8+ chars, at least one uppercase letter, one digit, and one of the special
// characters below. Built from individually-escaped chars (not a hand-typed class) so every
// character in the allowed list - including ] and \, which are special inside a regex class -
// is matched literally and unambiguously.
const SPECIAL_CHARS = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'
const PASSWORD_POLICY_REGEX = new RegExp(
	'^(?=.*[A-Z])(?=.*\\d)(?=.*[' + SPECIAL_CHARS.split('').map(ch => '\\' + ch).join('') + ']).{8,}$'
)

class ValidatePasswordPolicy {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ValidatePasswordPolicy()
		return this.instance
	}

	/**
	 * Throws if a plain-text password does not meet the required policy: minimum 8 characters,
	 * at least one uppercase letter, one digit, and one special character.
	 * @param { Object } config
	 * @param { String } config.password - The plain-text password to check.
	 */
	execute({ password }) {
		if (!PASSWORD_POLICY_REGEX.test(password || '')) {
			throw new BadRequestError(
				'Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character (' + SPECIAL_CHARS + ').'
			)
		}
	}
}

module.exports = ValidatePasswordPolicy
