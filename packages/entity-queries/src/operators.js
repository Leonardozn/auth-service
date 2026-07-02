class Operators {
	/**
	 * @static
	 * @returns {{ name: string, allowedTypes: string[], isArray?: boolean, size?: boolean, multiple?: boolean }[]}
	 */
	static allowedOperators() {
		return [
			{ name: 'eq', allowedTypes: ['string', 'number', 'date', 'datetime', 'boolean', 'objectId'] },
			{ name: 'ne', allowedTypes: ['string', 'number', 'date', 'datetime', 'boolean', 'objectId'] },
			{ name: 'like', allowedTypes: ['string'] },
			{ name: 'notLike', allowedTypes: ['string'] },
			{ name: 'gt', allowedTypes: ['number', 'date', 'datetime'] },
			{ name: 'gte', allowedTypes: ['number', 'date', 'datetime'] },
			{ name: 'lt', allowedTypes: ['number', 'date', 'datetime'] },
			{ name: 'lte', allowedTypes: ['number', 'date', 'datetime'] },
			{ name: 'between', allowedTypes: ['number', 'date', 'datetime'], isArray: true, size: 2 },
			{ name: 'notBetween', allowedTypes: ['number', 'date', 'datetime'], isArray: true, size: 2 },
			{ name: 'in', allowedTypes: ['string', 'number', 'date', 'datetime', 'boolean', 'objectId'], isArray: true },
			{ name: 'notIn', allowedTypes: ['string', 'number', 'date', 'datetime', 'boolean', 'objectId'], isArray: true },
			{ name: 'or', allowedTypes: ['string', 'number', 'date', 'datetime', 'boolean', 'objectId'], multiple: true }
		]
	}
}

module.exports = Operators