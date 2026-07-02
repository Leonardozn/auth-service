const BuildPipeline = require('./buildPipeline')

class MongooseEntityQueries {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	buildPipeline

	constructor() {
		this.buildPipeline = BuildPipeline.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new MongooseEntityQueries()
		return this.instance
	}

	/**
	 * Save and return an object or an array of objects saved.
	 * @param { Object } Entity - The entity object.
	 * @param { Object|Object[] } config.data - The data to save (optional: Object or an array of objects).
	 * @param { Object } [config.options] - Optional Mongoose save/insertMany options.
	 * @returns { Object|Object[] } An object or an array of objects.
	 */
	async add(Entity, config = {}) {
		const { data, options = {} } = config
		if (!Array.isArray(data)) {
			const entity = new Entity(data)
			return await entity.save(options)
		} else {
			const entity_list = await Entity.insertMany(data, options)
			return entity_list
		}
	}
	
	/**
	 * Returns an array of objects.
	 * @param { Object } Entity - The entity object.
	 * @param { Object } config.query - An object with the query to search.
	 * @param { Object } config.virtuals - An object with the unique fields in each record.
	 * @param { Object } config.relations - An object indicating the relations about which information is wanted.
	 * @param { Number } config.size - The amount of records.
	 * @param { Number } config.page - The batch with an amount of records.
	 * @param { { field: string, type: number } } config.sort - An object that indicates the field and the type (1 or -1) to sort the records.
	 * @returns { Object[] } An array of objects.
	 */
	async list(Entity, config = {}) {
		const { query = {}, virtuals = {}, relations = {}, size = null, page = null, sort = {}, options = {} } = config
		let pipelines = []
		const match = this.buildPipeline.match(query)
		pipelines.push({ $match: match })

		pipelines.push(this.buildPipeline.sort(sort))
	
		const relationsInfo = this.buildPipeline.lookUp(Entity, relations)
		if (relationsInfo.length) pipelines = pipelines.concat(relationsInfo)
		
		const project = this.buildPipeline.project(virtuals, relations)
		pipelines.push({ $project: project })
	
		const pagination = this.buildPipeline.pagination(size, page)
		if (pagination.page) pipelines.push(pagination.page)
		if (pagination.size) pipelines.push(pagination.size)
	
		const records = await Entity.aggregate(pipelines).option(options)
		const amountRecords = await Entity.aggregate([{ $match: match }, { $count: 'count' }]).option(options)
		const count = amountRecords[0] ? amountRecords[0].count : 0

		return { count, records }
	}
	
	/**
	 * Update and return a record with the sent id.
	 * @param { Object } Entity - The entity object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } config.data - The data to update.
	 * @param { Object } [config.options] - Optional Mongoose findByIdAndUpdate options.
	 * @returns { Object } An object.
	 */
	async update(Entity, config = {}) {
		const { id, data, options = {} } = config
		const dataToUpdate = Object.fromEntries(
			Object.entries(data).filter(
				([_, value]) => value !== undefined
			)
		)
      
		return await Entity.findByIdAndUpdate(id, dataToUpdate, { new: true, runValidators: true, ...options })
	}

	/**
	 * Replace and return a record with the sent id.
	 * @param { Object } Entity - The entity object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } config.data - The data to replace.
	 * @param { Object } [config.options] - Optional Mongoose findOneAndReplace options.
	 * @returns { Object } An object.
	 */
	async replace(Entity, config = {}) {
		const { id, data, options = {} } = config
		return await Entity.findOneAndReplace({ _id: id }, data, { new: true, runValidators: true, ...options })
	}
	
	/**
	 * Remove a record with the sent id.
	 * @param { Object } Entity - The entity object.
	 * @param { ObjectId } config.id - The id of the record.
	 * @param { Object } [config.options] - Optional Mongoose deleteOne options.
	 * @returns { Object } An object with the number of the records affected.
	 */
	async remove(Entity, config = {}) {
		const { id, options = {} } = config
		return await Entity.deleteOne({ _id: id }, options)
	}
}

module.exports = MongooseEntityQueries