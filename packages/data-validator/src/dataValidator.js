const { z } = require('zod')
const { ObjectId } = require('bson')
const { DateTime } = require('luxon')
const { Operators } = require('@auth-service/entity-queries')

const types = {
	string: 'string',
	number: 'number',
	boolean: 'boolean',
	date: 'date',
	datetime: 'datetime',
	objectId: 'objectId',
	object: 'object',
	array: 'array'
}

class DataValidator {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new DataValidator()
		return this.instance
	}

	/**
	 * @private
	 */
	configValidation(obj) {
		let attribute
		let definite = false

		if (obj.isVirtual) {
			attribute = z.string().refine(val => Number(val) === 1, { message: "Virtuals only allow '1' as value." })
			attribute = attribute.transform(val => Number(val))
			return attribute
		}

		if (obj.type === types.string) {
			attribute = z.string()
			if (obj.min) attribute = z.string().min(obj.min)
			if (obj.max) attribute = z.string().max(obj.max)
			if (obj.uuid) attribute = z.string().uuid(obj.uuid)
			definite = true
		}
  
		if (obj.type === types.number) {
			attribute = z.preprocess(
				(val) => (typeof val === "string" ? Number(val) : val),
				z.number()
			)

			if (obj.min) attribute = z.number().min(obj.min)
			if (obj.max) attribute = z.number().max(obj.max)
			if (obj.transform) attribute = attribute.transform(val => Number(val))
			definite = true
		}

		if (obj.type === types.boolean) {
			attribute = z.preprocess(
				(val) => {
					if (typeof val === "string") {
						if (val.toLowerCase() === "true" || val === '1') return true
						if (val.toLowerCase() === "false" || val === '0') return false
					}
					return val
				},
				z.boolean()
			)

			if (obj.transform) attribute = attribute.transform(val => Boolean(val))
			definite = true
		}

		if (obj.type === types.date) {
			const isDate = (val) => val instanceof Date || DateTime.isDateTime(val)
			
			attribute = z.any().superRefine((val, ctx) => {
				if (isDate(val)) {
					const dt = val instanceof Date ? DateTime.fromJSDate(val, { zone: 'UTC' }) : val.setZone('UTC')

					if (dt.hour !== 0 || dt.minute !== 0 || dt.second !== 0 || dt.millisecond !== 0) {
						ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date objects must be date-only (midnight UTC) without time components." })
						return z.NEVER
					}

					return true
				}
				
				const parsed = z.string().date().safeParse(val)
				
				if (!parsed.success) {
					parsed.error.issues.forEach(issue => ctx.addIssue(issue))
					return z.NEVER
				}
			})

			if (obj.transform) {
				attribute = attribute.transform(val => {
					if (val instanceof Date) return val
					if (DateTime.isDateTime(val)) return val.toJSDate()
					return DateTime.fromISO(val, { zone: 'UTC' }).startOf('day').toJSDate()
				})
			}
			
			definite = true
		}

		if (obj.type === types.datetime) {
			const isDate = (val) => val instanceof Date || DateTime.isDateTime(val)
			
			attribute = z.any().superRefine((val, ctx) => {
				if (isDate(val)) return true
				
				const parsed = z.string().datetime().safeParse(val)
				
				if (!parsed.success) {
					parsed.error.issues.forEach(issue => ctx.addIssue(issue))
					return z.NEVER
				}
			})

			if (obj.transform) {
				attribute = attribute.transform(val => {
					if (val instanceof Date) return val
					if (DateTime.isDateTime(val)) return val.toJSDate()
					return DateTime.fromISO(val).toJSDate()
				})
			}
			definite = true
		}

		if (obj.type === types.objectId) {
			const isObjectId = (val) => val instanceof ObjectId || (val && val._bsontype === 'ObjectID')
			
			attribute = z.any().superRefine((val, ctx) => {
				if (isObjectId(val)) return true
				
				if (typeof val !== 'string' && !ObjectId.isValid(val)) {
					ctx.addIssue({ code: z.ZodIssueCode.custom, message: "The value is not a valid ObjectId." })
					return z.NEVER
				}
			})

			if (obj.transform) {
				attribute = attribute.transform(val => isObjectId(val) ? val : new ObjectId(val))
			}

			definite = true
		}

		if (definite && obj.allowed && obj.allowed.length) {
			attribute = attribute.superRefine((val, ctx) => {
				if (!obj.allowed.includes(val)) {
					ctx.addIssue({
						message: `${ctx.path.join('.')} only allow ${obj.allowed.join()} as a ${obj.allowed.length > 1 ? 'values' : 'value'}.`
					})
			}
			})
		}

		if (!definite) throw new Error(`Unsupported type: ${obj.type}`)
		if (obj.optional) attribute = attribute.nullish()

		return attribute
	}

	/**
	 * @private
	 */
	allowAdvanceQuery(obj) {
		const operators = Operators.allowedOperators()
		const options = {}

		for (const op of operators) {
			if (op.allowedTypes.includes(obj.type)) {
				if (op.isArray) {
					options[op.name] = z.array(this.configValidation(obj))
					if (op.size) options[op.name] = options[op.name].length(op.size)
				} else if (op.multiple) {
					const simpleValidation = this.configValidation(obj)
					const simpleArray = z.array(simpleValidation)
					const nestedOperators = {}

					for (const nestedOp of operators) {
						if (!nestedOp.multiple && nestedOp.allowedTypes.includes(obj.type)) {
							if (nestedOp.isArray) {
								nestedOperators[nestedOp.name] = z.array(simpleValidation)
								if (nestedOp.size) nestedOperators[nestedOp.name] = nestedOperators[nestedOp.name].length(nestedOp.size)
							} else {
								nestedOperators[nestedOp.name] = simpleValidation
							}

						nestedOperators[nestedOp.name] = nestedOperators[nestedOp.name].optional()
						}
					}

					const nestedSchema = z.object(nestedOperators).strict()

					options[op.name] = z.union([
						simpleValidation,
						simpleArray,
						nestedSchema,
						z.array(nestedSchema)
					])
				} else {
					options[op.name] = this.configValidation(obj)
				}

				options[op.name] = options[op.name].optional()
			}
		}

		return z.object(options).strict()
	}

	/**
	 * Returns an object scheme to validate the entry data.
	 * @param { Object } objInterface - The object with the valid data types for the entry data.
	 * @returns { Object } An object scheme.
	 */
	validate(objInterface) {
		const parseValue = (obj, key) => {
			let attribute

			if (obj.type === types.object) {
				if (!obj.structure) throw new Error(`'${key}' attribute must have a structure.`)
				attribute = this.validate(obj.structure)
			
				return z.preprocess((val) => {
					if (typeof val === 'string') {
						try { return JSON.parse(val); } catch { return val; }
					}
					return val;
				}, attribute)
			} else if (obj.type === types.array) {
				if (!obj.contentType) throw new Error(`'${key}' attribute must have a contentType.`)

				if (obj.contentType === types.object) {
					if (!obj.structure) throw new Error(`'${key}' attribute must have a structure.`)
					attribute = this.validate(obj.structure)
				} else if (obj.contentType === types.array) {
					if (!obj.structure || !obj.structure.inner) throw new Error(`'${key}' attribute must have a structure with an 'inner' property for nested arrays.`)
					attribute = parseValue(obj.structure.inner, key)
				} else if(types[obj.contentType.type]) {
					attribute = this.configValidation(obj.contentType)
				} else if (types[obj.contentType]) {
					attribute = this.configValidation({ type: obj.contentType, allowed: obj.allowed })
				}

				if (!attribute) throw new Error(`Unsupported contentType: ${obj.contentType}`)

				return z.preprocess((val) => {
					if (typeof val === 'string') {
						try { return JSON.parse(val) } catch { return val }
					}
					return val
				}, z.array(attribute))
			} else {
				attribute = this.configValidation(obj)
				return attribute
			}
		}

		let schema = {}

		for (const key in objInterface) {
			if (!objInterface[key].type) throw new Error(`'${key}' attribute must have a type.`)
			const validations = [parseValue(objInterface[key], key)]
			if (objInterface[key].allowAdvance) validations.push(this.allowAdvanceQuery(objInterface[key]))
			if (objInterface[key].canBeVirtual) validations.push(this.configValidation({ type: types.number, allowed: [1] }))

			schema[key] = z.union(validations)

			if (objInterface[key].optional) schema[key] = schema[key].optional()
		}

		return z.object(schema).strict()
	}
}

module.exports = {
	types,
	DataValidator
}