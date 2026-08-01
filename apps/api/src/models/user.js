const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

class UserModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	userSchema

	constructor() {
		this.userSchema = new Schema({
			name: {
				type: String
			},
			email: {
				type: String
			},
			password: {
				type: String
			},
			role: {
				type: Schema.Types.ObjectId,
				ref: 'roles'
			},
			active: {
				type: Boolean
			},
			emailConfirmed: {
				type: Boolean
			},
			unconfirmedExpiresAt: {
				type: Date
			}
		}, {
			collection: 'users',
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

		// TTL index: an account never confirmed is deleted once unconfirmedExpiresAt passes. Mongo
		// ignores this index on documents where the field is absent or not a Date, which is exactly
		// what happens once a user confirms (the field is unset) or for legacy users who never had
		// it - so this never touches confirmed accounts.
		this.userSchema.index({ unconfirmedExpiresAt: 1 }, { expireAfterSeconds: 0 })
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.User || AuthDbMongodb.model('User', this.userSchema)
	}
}

module.exports = UserModel