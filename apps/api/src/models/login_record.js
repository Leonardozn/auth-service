const { AuthDbMongodb } = require('@auth-service/db-connections')

const Schema = AuthDbMongodb.Schema

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

		// Plain index over createdAt, NOT a TTL one: login records are kept indefinitely and no
		// scheduled purge is planned for them either. The index stays because the collection is read
		// chronologically. See decisions/scheduled-purge-over-ttl-indexes.
		this.login_recordSchema.index({ createdAt: 1 })
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