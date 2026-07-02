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