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

		// No TTL index here on purpose: MongoDB no longer deletes anything on its own. An expired
		// code is already rejected by the validation, which compares expiresAt against the current
		// time - so letting it stay in the collection changes nothing for security, only storage.
		// See decisions/scheduled-purge-over-ttl-indexes.
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