const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

class ConfirmationCodeModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	confirmation_codeSchema

	constructor() {
		this.confirmation_codeSchema = new Schema({
			user: {
				type: Schema.Types.ObjectId,
				ref: 'users'
			},
			purpose: {
				type: String
			},
			codeHash: {
				type: String
			},
			medium: {
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
			collection: 'confirmation_codes',
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

		// TTL index: Mongo deletes a code once its own expiresAt passes, so expired codes never
		// accumulate - no scheduled cleanup job needed.
		this.confirmation_codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
	}

	static getInstance() {
		if (!this.instance) this.instance = new ConfirmationCodeModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.ConfirmationCode || AuthDbMongodb.model('ConfirmationCode', this.confirmation_codeSchema)
	}
}

module.exports = ConfirmationCodeModel