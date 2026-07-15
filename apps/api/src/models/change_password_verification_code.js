const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

class ChangePasswordVerificationCodeModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	change_password_verification_codeSchema

	constructor() {
		this.change_password_verification_codeSchema = new Schema({
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users'
			},
			code: {
				type: String
			},
			newPasswordHash: {
				type: String
			},
			expiresAt: {
				type: Date
			},
			used: {
				type: Boolean
			},
			attempts: {
				type: Number
			}
		}, {
			collection: 'change_password_verification_codes',
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
	}

	static getInstance() {
		if (!this.instance) this.instance = new ChangePasswordVerificationCodeModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.ChangePasswordVerificationCode || AuthDbMongodb.model('ChangePasswordVerificationCode', this.change_password_verification_codeSchema)
	}
}

module.exports = ChangePasswordVerificationCodeModel