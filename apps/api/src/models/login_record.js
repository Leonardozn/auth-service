const { AuthDbMongodb } = require('@auth-service/db-connections')
const envVariables = require('../handlers/envVariables')

const Schema = AuthDbMongodb.Schema

// expireAfterSeconds needs a static number of seconds at index-creation time - LOGIN_RECORD_TTL
// arrives as a duration string ('90d'), so it's parsed once here. Duplicates the regex already in
// services/commands/computeExpiryDate.js on purpose: models/ must not depend on services/commands/.
function parseDurationToSeconds(duration) {
	const match = /^(\d+)(s|m|h|d)$/.exec(String(duration).trim())
	if (!match) return 90 * 86400
	const [, amountStr, unit] = match
	const unitSeconds = { s: 1, m: 60, h: 3600, d: 86400 }
	return Number(amountStr) * unitSeconds[unit]
}

class LoginRecordModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	login_recordSchema

	constructor() {
		this.login_recordSchema = new Schema({
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users'
			},
			email: {
				type: String
			},
			result: {
				type: String
			},
			method: {
				type: String
			},
			ip: {
				type: String
			},
			userAgent: {
				type: String
			}
		}, {
			collection: 'login_records',
			timestamps: true,
			toJSON: {
				transform: function (doc, ret) {
					delete ret.__v
					return ret
				}
			},
			toObject: {
				transform: function (doc, ret) {
					delete ret.__v
					return ret
				}
			}
		})

		// TTL index over createdAt (not an absolute expiry field like ConfirmationCode.expiresAt) -
		// note a later change to LOGIN_RECORD_TTL only applies to a freshly created index, it does
		// not re-index documents already inserted under the previous value.
		this.login_recordSchema.index(
			{ createdAt: 1 },
			{ expireAfterSeconds: parseDurationToSeconds(envVariables.LOGIN_RECORD_TTL || '90d') }
		)
	}

	static getInstance() {
		if (!this.instance) this.instance = new LoginRecordModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.LoginRecord || AuthDbMongodb.model('LoginRecord', this.login_recordSchema)
	}
}

module.exports = LoginRecordModel