'use strict'

// Database mock for this project's own test suite — loaded via `node --require` (e2e/smoke/crud,
// spawned as a subprocess) or required directly at the top of a unit test file (same-process).
// The generated stack is: route -> controller -> service -> require('../repositories')
// (a Repository singleton) -> models -> @<project>/db-connections (which calls mongoose.connect()
// on import). Intercepting that single require both mocks the data-access layer with an
// in-memory store and prevents any real database connection.
//
// Adapted from easy-node's own tests/backend/javascript/support/mock-repository-preload.js —
// the one difference is MOCK_SEED_RECORD, which lets each model's test seed a complete record
// matching that model's own fields instead of a hardcoded shape.

const Module = require('node:module')
const crypto = require('node:crypto')
const fs = require('node:fs')

const SEED_ID = process.env.MOCK_SEED_ID || ''
const SEED_SCHEMA = process.env.MOCK_SEED_SCHEMA || ''
const SEED_RECORD = process.env.MOCK_SEED_RECORD || ''
const CAPTURE_FILE = process.env.MOCK_CAPTURE_FILE || ''

function objectId() {
	return crypto.randomBytes(12).toString('hex')
}

function applyOperator(op, value, operand) {
	switch (op) {
		case 'eq': return String(value) === String(operand)
		case 'ne': return String(value) !== String(operand)
		case 'gt': return value > operand
		case 'gte': return value >= operand
		case 'lt': return value < operand
		case 'lte': return value <= operand
		case 'like': return String(value == null ? '' : value).includes(String(operand))
		case 'notLike': return !String(value == null ? '' : value).includes(String(operand))
		case 'in': return Array.isArray(operand) && operand.map(String).includes(String(value))
		case 'notIn': return Array.isArray(operand) && !operand.map(String).includes(String(value))
		case 'between': return Array.isArray(operand) && value >= operand[0] && value <= operand[1]
		case 'notBetween': return Array.isArray(operand) && !(value >= operand[0] && value <= operand[1])
		case 'or': return Array.isArray(operand) && operand.map(String).includes(String(value))
		default: return true
	}
}

// Only a *plain* object is an operator condition (e.g. { gt: 10 }). Values like an ObjectId or
// Date are objects too, but must be compared by equality - never iterated as operators.
function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value) &&
		Object.getPrototypeOf(value) === Object.prototype
}

function matches(record, query) {
	for (const [field, condition] of Object.entries(query || {})) {
		const value = record[field]
		if (isPlainObject(condition)) {
			for (const [op, operand] of Object.entries(condition)) {
				if (!applyOperator(op, value, operand)) return false
			}
		} else if (String(value) !== String(condition)) {
			return false
		}
	}
	return true
}

function toObject(value) {
	if (typeof value === 'string') { try { return JSON.parse(value) } catch { return {} } }
	return value && typeof value === 'object' ? value : {}
}

function captureListConfig(schemaName, config) {
	if (!CAPTURE_FILE) return
	try {
		fs.writeFileSync(CAPTURE_FILE, JSON.stringify({
			schemaName,
			query: config.query,
			virtuals: config.virtuals,
			relations: config.relations,
			size: config.size,
			sizeType: typeof config.size,
			page: config.page,
			pageType: typeof config.page,
			sort: config.sort
		}, (k, v) => (typeof v === 'bigint' ? String(v) : v)))
	} catch { /* capture is best-effort */ }
}

class MockRepository {
	static instance

	constructor() {
		this.collections = {}

		if (SEED_SCHEMA && SEED_ID && SEED_RECORD) {
			const now = new Date().toISOString()
			const record = JSON.parse(SEED_RECORD)
			this._collection(SEED_SCHEMA).set(SEED_ID, { _id: SEED_ID, ...record, createdAt: now, updatedAt: now })
		}
	}

	static getInstance() {
		if (!this.instance) this.instance = new MockRepository()
		return this.instance
	}

	// test-only escape hatch: clear in-memory state between test() blocks within the same process.
	// Clears in place (keeps the same instance) because a service built earlier in the file already
	// cached its own reference to this singleton via Repository.getInstance() in its constructor -
	// replacing the instance itself would leave that cached reference pointing at stale data.
	static reset() {
		if (this.instance) this.instance.collections = {}
	}

	_collection(name) {
		if (!this.collections[name]) this.collections[name] = new Map()
		return this.collections[name]
	}

	async add(schemaName, config = {}) {
		const collection = this._collection(schemaName)
		const create = (data) => {
			const now = new Date().toISOString()
			const record = { _id: objectId(), ...data, createdAt: now, updatedAt: now }
			collection.set(String(record._id), record)
			return record
		}
		const { data } = config
		return Array.isArray(data) ? data.map(create) : create(data || {})
	}

	async list(schemaName, config = {}) {
		captureListConfig(schemaName, config)

		let records = [...this._collection(schemaName).values()].filter(r => matches(r, config.query || {}))
		const count = records.length

		const sort = toObject(config.sort)
		for (const [field, direction] of Object.entries(sort)) {
			const dir = Number(direction) < 0 ? -1 : 1
			records = records.sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * dir)
		}

		const size = Number(config.size)
		const page = Number(config.page)
		if (size && page) records = records.slice((page - 1) * size, (page - 1) * size + size)

		return { count, records }
	}

	async update(schemaName, config = {}) {
		const collection = this._collection(schemaName)
		const id = String(config.id)
		const record = collection.get(id)
		if (!record) return null
		Object.assign(record, config.data || {}, { updatedAt: new Date().toISOString() })
		collection.set(id, record)
		return record
	}

	async replace(schemaName, config = {}) {
		const collection = this._collection(schemaName)
		const id = String(config.id)
		const existing = collection.get(id)
		if (!existing) return null
		const replaced = { _id: existing._id, ...(config.data || {}), createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
		collection.set(id, replaced)
		return replaced
	}

	async remove(schemaName, config = {}) {
		const removed = this._collection(schemaName).delete(String(config.id))
		return { deletedCount: removed ? 1 : 0 }
	}
}

// Intercept the generated services' require('../repositories') and hand back the mock.
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
	if (request === '../repositories') return MockRepository
	return originalLoad.apply(this, arguments)
}

module.exports = MockRepository
