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

		// Plain index, NOT a TTL one: unconfirmed accounts are purged by an explicit process, still
		// to be defined - MongoDB no longer deletes anything on its own here. The index stays
		// because that process finds its candidates by this field (unconfirmedExpiresAt < now).
		// See decisions/scheduled-purge-over-ttl-indexes.
		this.userSchema.index({ unconfirmedExpiresAt: 1 })
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