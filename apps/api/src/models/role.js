const { AuthDbMongodb } = require('@auth-service/db-connections')
const Schema = AuthDbMongodb.Schema

const RolePermissionsItemSchema = new Schema({
	resource: {
		type: String,
		required: true
	},
	read: {
		type: Boolean
	},
	write: {
		type: Boolean
	}
}, {
	_id: false
})

class RoleModel {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	roleSchema

	constructor() {
		this.roleSchema = new Schema({
			name: {
				type: String
			},
			active: {
				type: Boolean
			},
			maxSessions: {
				type: Number
			},
			permissions: {
				type: [RolePermissionsItemSchema]
			}
		}, {
			collection: 'roles',
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
		if (!this.instance) this.instance = new RoleModel()
		return this.instance
	}

	getModel() {
		return AuthDbMongodb.models.Role || AuthDbMongodb.model('Role', this.roleSchema)
	}
}

module.exports = RoleModel