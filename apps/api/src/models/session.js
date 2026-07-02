const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

class SessionModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	sessionSchema

	constructor() {
		this.sessionSchema = new Schema({
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users'
			},
			accessToken: {
				type: String
			},
			accessTokenExpiresAt: {
				type: Date
			},
			refreshToken: {
				type: String
			},
			refreshTokenExpiresAt: {
				type: Date
			}
		}, {
			collection: 'sessions',
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
		if (!this.instance) this.instance = new SessionModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.Session || AuthDbMongodb.model('Session', this.sessionSchema)
	}
}

module.exports = SessionModel