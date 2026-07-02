const { MongooseEntityQueries } = require('@auth-service/entity-queries')

const FieldsModel = require('../models/fields')
const DbTypeModel = require('../models/dbType')
const DbNameModel = require('../models/dbName')
const CollectionNameModel = require('../models/collectionName')

class Repository {
	/**
	 * @private
	 * @static
	 */
	static instance

  /**
	 * @private
	 */
	models

	/**
	 * @private
	 */
	mongooseEntityQueries

	constructor() {
		this.models = {
			fields: FieldsModel,
			dbType: DbTypeModel,
			dbName: DbNameModel,
			collectionName: CollectionNameModel
		}

		this.mongooseEntityQueries = MongooseEntityQueries.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Repository()
		return this.instance
	}

	/**
	 * Resolves the Mongoose model for the given schema name.
	 * @private
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @returns { Object } The Mongoose model instance.
	 */
	_getModel(schemaName) {
		const SchemaModel = this.models[schemaName]
		if (!SchemaModel) throw new Error(`Repository: unknown schema "${schemaName}"`)
		return SchemaModel.getInstance().getModel()
	}

	/**
	 * Save and return an object or an array of objects saved.
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @param { Object } config - Configuration object.
	 * @param { Object|Object[] } config.data - The data to save (optional: Object or an array of objects).
	 * @param { Object } [config.options] - Optional Mongoose save/insertMany options.
	 * @returns { Object|Object[] } An object or an array of objects.
	 */
	async add(schemaName, config = {}) {
		return await this.mongooseEntityQueries.add(this._getModel(schemaName), config)
	}

	/**
	 * Returns an array of objects.
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @param { Object } config - Query configuration object.
	 * @param { Object } config.query - An object with the query to search.
	 * @param { Object } config.virtuals - An object with the unique fields in each record.
	 * @param { Object } config.relations - An object indicating the relations about which information is wanted.
	 * @param { Number } config.size - The amount of records.
	 * @param { Number } config.page - The batch with an amount of records.
	 * @param { { field: string, type: number } } config.sort - An object that indicates the field and the type (1 or -1) to sort the records.
	 * @returns { Object[] } An array of objects.
	 */
	async list(schemaName, config = {}) {
		return await this.mongooseEntityQueries.list(this._getModel(schemaName), config)
	}

	/**
	 * Update and return a record with the sent id.
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @param { Object } config - Configuration object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } config.data - The data to update.
	 * @param { Object } [config.options] - Optional Mongoose findByIdAndUpdate options.
	 * @returns { Object } An object.
	 */
	async update(schemaName, config = {}) {
		return await this.mongooseEntityQueries.update(this._getModel(schemaName), config)
	}

	/**
	 * Replace and return a record with the sent id.
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @param { Object } config - Configuration object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } config.data - The data to replace.
	 * @param { Object } [config.options] - Optional Mongoose findOneAndReplace options.
	 * @returns { Object } An object.
	 */
	async replace(schemaName, config = {}) {
		return await this.mongooseEntityQueries.replace(this._getModel(schemaName), config)
	}

	/**
	 * Remove a record with the sent id.
	 * @param { string } schemaName - The schema name in lowercase (e.g. "data_model").
	 * @param { Object } config - Configuration object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } [config.options] - Optional Mongoose deleteOne options.
	 * @returns { Object } An object with the number of the records affected.
	 */
	async remove(schemaName, config = {}) {
		return await this.mongooseEntityQueries.remove(this._getModel(schemaName), config)
	}
}

module.exports = Repository