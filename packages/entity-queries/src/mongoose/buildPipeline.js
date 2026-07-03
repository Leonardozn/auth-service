const { BadRequestError } = require('@auth-service/handle-errors')
const Operators = require('../operators')
const EntityQueryCommons = require('../commons')

class BuildPipeline {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	commons

	constructor() {
		this.commons = EntityQueryCommons.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new BuildPipeline()
		return this.instance
	}

	/**
	 * Returns an object with the match pipeline.
	 * @param { Object } query - The query object.
	 * @returns { Object } An object.
	 */
	match(query={}) {
		if (!this.commons.isJsonObject(query)) throw new BadRequestError('query must be an json object.')
			
		const keys = Object.keys(query)
		const match = keys.length ? { $and: [] } : {}
		
		if (keys.length) {
			let multipleOperator = null
			let multipleOperatorIndex = -1
			let operator = null
			const operators = Operators.allowedOperators()
			const keysAndValues = this.commons.findKeysAndValues(query)

			const verifyOperator = (opKey, value) => {
				if (opKey === 'like') return { $regex: value, $options: "i" }
				if (opKey === 'notLike') return { $not: { $regex: value, $options: "i" } }
				if (opKey === 'between') return { $gte: value[0], $lte: value[1] }
				if (opKey === 'notBetween') return { $not: { $gte: value[0], $lte: value[1] } }
				if (opKey === 'notIn') return { $nin: value }
				return { [`$${opKey}`]: value }
			}
			
			const findMultipleOperator = (op) => {
				if (op.multiple) {
					multipleOperator = `$${op.name}`
					multipleOperatorIndex = match.$and.findIndex(el => el[multipleOperator])

					if (multipleOperatorIndex < 0) {
						match.$and.push({ [multipleOperator]: [] })
						multipleOperatorIndex = match.$and.findIndex(el => el[multipleOperator])
					}
				}
			}

			for (const element of keysAndValues) {
				if (element.operator) {
					operator = operators.find(el => el.name === element.operator)
					if (!operator) throw new BadRequestError(`'${element.operator}' is not a valid operator.`)
				}

				if (operator && operator.multiple) {
					findMultipleOperator(operator)
					
					if (Array.isArray(element.value)) {
						for (const val of element.value) {
							if (this.commons.isJsonObject(val)) {
								const op = Object.keys(val)[0]
								match.$and[multipleOperatorIndex][`$${operator.name}`].push({ [element.key]: verifyOperator(op, val[op]) })
							} else {
								match.$and[multipleOperatorIndex][`$${operator.name}`].push({ [element.key]: val })
							}
						}
					} else {
						match.$and[multipleOperatorIndex][`$${operator.name}`].push({ [element.key]: element.value })
					}
				} else if (operator && element.pattern) {
					const pattern = operators.find(el => el.name === element.pattern)
					if (!pattern) throw new BadRequestError(`'${element.pattern}' is not a valid operator.`)
					
					if (pattern.multiple) {
						findMultipleOperator(pattern)
						match.$and[multipleOperatorIndex][`$${pattern.name}`].push({ [element.key]: verifyOperator(element.operator, element.value) })
					}
				} else {
					if (operator) {
						match.$and.unshift({ [element.key]: verifyOperator(element.operator, element.value) })
					} else {
						match.$and.unshift({ [element.key]: element.value })
					}
				}

				operator = null
			}
		}
		
		return match
	}

	/**
	 * Returns an object with the lookup pipeline.
	 * @param { Object } Entity - The entity object.
	 * @param { Object } relations - The relations of the entity.
	 ** @returns { Object[] } An array of object.
	 */
	lookUp(Entity, relations={}) {
		if (!this.commons.isJsonObject(relations)) throw new BadRequestError('relations must be an json object.')
	
		const relationsInfo = []

		for (const key in relations) {
			const schemaDef = Entity.schema.obj[key]
			const isArray = Array.isArray(schemaDef)
			const ref = isArray ? schemaDef[0]?.ref : schemaDef?.ref

			if (!ref) throw new BadRequestError(`'${key}' is not a valid relation.`)
		
			relationsInfo.push({
				$lookup: {
					from: ref.toLowerCase(),
					localField: key,
					foreignField: '_id',
					as: key
				}
			})

			if (!isArray) relationsInfo.push({ $unwind: { path: `$${key}`, preserveNullAndEmptyArrays: true } })
		}

		return relationsInfo
	}

	/**
	 * Returns an object with the project pipeline.
	 * @param { Object } virtuals - The virtuals object.
	 * @param { Object } relations - The relations object.
	 * @returns { Object } An object.
	 */
	project(virtuals={}, relations={}) {
		if (!this.commons.isJsonObject(virtuals)) throw new BadRequestError('virtuals must be an json object.')
		if (!this.commons.isJsonObject(relations)) throw new BadRequestError('relations must be an json object.')

		const project = {}
		const keys = Object.keys(virtuals)

		if (keys.length) {
			if (!keys.includes('_id')) project._id = 0
			const attributes = this.commons.findKeys(virtuals)
			for (const key of attributes) project[key] = 1
		} else {
			project.__v = 0
		}

		for (const key in relations) {
			if (project[key] !== 1) project[`${key}.__v`] = 0
		}

		return project
	}

	/**
	 * Returns an object with the pagination pipelines.
	 * @param { Number } size - The amount of records.
	 * @param { Number } page - The batch with an amount of records.
	 * @returns {{ $skip: number, $limit: number }} An object.
	 */
	pagination(size, page) {
		if (isNaN(size)) throw new BadRequestError('size param must be numeric.')
		if (isNaN(page)) throw new BadRequestError('page param must be numeric.')

		const pagination = {}

		if (size) {
			if (page) pagination.page = { $skip: (page - 1) * size }
			pagination.size = { $limit: size }
		}

		return pagination
	}

	/**
	 * Returns an object with the sort pipeline.
	 * @param { field: string, type: number } sort - The sort with field and type through which the records will be sorted.
	 * @returns {{ $sort: { field: type } }} An object.
	 */
	sort(sort={}) {
		const allowedTypes = [1, -1]
		const field = sort.field
		let type = sort.type

		if (field && type) {
			if (!isNaN(type)) type = Number(type)
			if (!allowedTypes.includes(type)) throw new BadRequestError('The type of sort must be 1 or -1.')
			return { $sort: { [field]: type } }
		}

		return { $sort: { createdAt: 1 } }
	}
}

module.exports = BuildPipeline