const Operators = require('./operators')

/**
 * @typedef { Object } ElementType
 * @property { string } key
 * @property { any } value
 * @property { string } [operator]
 * @property { string } [pattern]
 */

class EntityQueryCommons {
	/**
	 * @private
	 * @static
	 */
	instance

	constructor() {

	}

	static getInstance() {
		if (!this.instance) this.instance = new EntityQueryCommons()
		return this.instance
	}

	isJsonObject(value) {
		if (typeof value !== 'object' || value === null) return false
		if (Array.isArray(value)) return false
		if (value instanceof Date || value instanceof RegExp) return false

		// Treat BSON/ObjectId and binary-like payloads as atomic values.
		if (value?._bsontype === 'ObjectId' || value?._bsontype === 'ObjectID') return false
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(value)) return false
		if (value instanceof Uint8Array || value instanceof ArrayBuffer) return false

		return true
	}

	/**
	 * Return an array with the objects that describe the key, operators and it's values.
	 * @param { Object } type - The query object.
	 * @returns { ElementType[] } An array of objects.
	 */
	findKeysAndValues(obj) {
		const operators = Operators.allowedOperators()
		const keysAndValues = []

		const pushRecord = (key, value, operator, pattern) => {
			const rec = { key, value }
			if (operator) rec.operator = operator
			if (pattern && pattern !== operator) rec.pattern = pattern
			keysAndValues.push(rec)
		}

		const walk = (node, base = '', activeOp = null, parentPattern = null) => {
			// objects (no arrays)
			if (this.isJsonObject(node)) {
				for (const [key, value] of Object.entries(node)) {
					const isOp = operators.some(el => el.name === key)
					const isArrOp = operators.some(el => el.name === key && el.isArray)
					const nextOp = isOp ? key : activeOp
					const nextBase = isOp ? base : (base ? `${base}.${key}` : key)
					const nextPattern = isOp ? (activeOp ?? parentPattern) : parentPattern

					// array operators
					if (isOp && isArrOp) {
						pushRecord(nextBase, value, key, nextPattern)
						continue
					}

					if (this.isJsonObject(value)) {
						walk(value, nextBase, nextOp, nextPattern)
					} else if (!isOp && Array.isArray(value) && value.some(el => this.isJsonObject(el))) {
						value.forEach(val => {
							if (this.isJsonObject(val)) {
								walk(val, nextBase, nextOp, nextPattern)
							} else {
								pushRecord(nextBase, val, nextOp, nextPattern)
							}
						})
					} else {
						// capture value; if it comes from an operator, include the operator
						pushRecord(nextBase, value, nextOp, nextPattern)
					}
				}

				return
			}

			// primitive
			pushRecord(base, node, activeOp, parentPattern)
		}

		walk(obj, '')

		return keysAndValues
	}

	/**
	 * Return an array with the objects that describe it's keys.
	 * @param { Object } type - The query object.
	 * @returns { String[] } An array of strings.
	 */
	findKeys(obj) {
		const keys = []

		const walk = (node, base = "") => {
			if (this.isJsonObject(node)) {
				for (const [key, value] of Object.entries(node)) {
					const path = base ? `${base}.${key}` : key

					if (value && this.isJsonObject(value)) {
						walk(value, path)
					} else {
						keys.push(path)
					}
				}
			}
		}

		walk(obj)
		return keys
	}
}

module.exports = EntityQueryCommons