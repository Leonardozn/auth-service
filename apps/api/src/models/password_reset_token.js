const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

class PasswordResetTokenModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	password_reset_tokenSchema

	constructor() {
		this.password_reset_tokenSchema = new Schema({
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users'
			},
			token: {
				type: String
			},
			expiresAt: {
				type: Date
			},
			used: {
				type: Boolean
			}
		}, {
			collection: 'password_reset_tokens',
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
		if (!this.instance) this.instance = new PasswordResetTokenModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.PasswordResetToken || AuthDbMongodb.model('PasswordResetToken', this.password_reset_tokenSchema)
	}
}

module.exports = PasswordResetTokenModel