/**
 * repository-queries.js
 *
 * Complete catalog of all possible parameters for fetching data with the
 * `entity-queries` package THROUGH THE REPOSITORY, based on the backend project.
 *
 *  - repository.list('data_model', { query, virtuals, relations, size, page, sort })
 *  - apps/api/src/interfaces/data_model.js (queryInterface, virtualsInterface, relationsInterface)
 *  - @backend/entity-queries → Operators (src/operators.js) and the commons walker
 *  - @backend/data-validator  → DataValidator (validates/transforms the input)
 *
 * Repository signature (config object, NOT positional args):
 *   repository.list(schemaName, { query={}, virtuals={}, relations={}, size=null, page=null, sort={} })
 *   → returns { count: Number, records: Object[] }
 *
 * `findOne` is built on top of `list`: filter by `_id` and take `records[0]`.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * data_model FIELDS (apps/api/src/models/data_model.js)
 * ──────────────────────────────────────────────────────────────────────────────
 *  - _id              ObjectId
 *  - text             String
 *  - amount           Number
 *  - active           Boolean
 *  - birthdate        Date        (date type → day granularity, normalized to UTC)
 *  - arrival          Date        (datetime type → full timestamp, normalized to UTC)
 *  - image_url        String
 *  - numbers          [Number]
 *  - limited_numbers  [Number]    (enum [3,6,9])
 *  - sub_data_model   ObjectId    (ref: 'sub_data_models')
 *  - sub_data_models  [ObjectId]  (ref: 'sub_data_models')
 *  - nested_object    Object      { text, amount, checkIn(datetime), nested_url, sub_data_model, sub_data_models[], nested_numbers[] }
 *  - second_nested    Object      { name, age, sub_nested: { nested_name, sub_nested_url, sub_data_model, sub_data_models[] } }
 *  - object_list      [Object]    { nickname, event_date(date), list_nested_numbers[], sub_data_model, sub_image_url,
 *                                    sub_object_list: [{ my_date(date), my_datetime(datetime), my_time }],
 *                                    nested_sub_object: { name, sub_time, nested_sub_url } }
 *  - createdAt        Date (datetime, timestamps)
 *  - updatedAt        Date (datetime, timestamps)
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * FIELDS WITH allowAdvance: true IN queryInterface (support advanced operators)
 * ──────────────────────────────────────────────────────────────────────────────
 *  _id, text, amount, active, birthdate, arrival, image_url, sub_data_model,
 *  nested_object.{text, amount, checkIn, nested_url, sub_data_model},
 *  second_nested.{name, age}, second_nested.sub_nested.{nested_name, sub_nested_url, sub_data_model},
 *  object_list.{nickname, event_date, sub_data_model, sub_image_url},
 *  object_list.sub_object_list.{my_date, my_datetime, my_time},
 *  object_list.nested_sub_object.{name, sub_time, nested_sub_url}
 *
 * FIELDS WITHOUT allowAdvance (direct equality only):
 *  numbers, limited_numbers, sub_data_models, nested_object.sub_data_models,
 *  nested_object.nested_numbers, second_nested.sub_nested.sub_data_models,
 *  object_list.list_nested_numbers, createdAt, updatedAt
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * AVAILABLE OPERATORS (entity-queries/src/operators.js) — note: date/datetime ARE supported
 * ──────────────────────────────────────────────────────────────────────────────
 *  string   → eq, ne, like, notLike, in, notIn, or
 *  number   → eq, ne, gt, gte, lt, lte, between, notBetween, in, notIn, or
 *  date     → eq, ne, gt, gte, lt, lte, between, notBetween, in, notIn, or
 *  datetime → eq, ne, gt, gte, lt, lte, between, notBetween, in, notIn, or
 *  boolean  → eq, ne, in, notIn, or
 *  objectId → eq, ne, in, notIn, or   (only on fields with allowAdvance)
 */

const Repository = require('../repositories')
const Contract = require('../contracts')
const Data_modelInterfaces = require('../interfaces/data_model')
const Data_modelContract = require('../contracts/data_model')
const { BadRequestError } = require('../handlers/handleErrors')

class Data_modelService {
	constructor() {
		this.repository = Repository.getInstance()
		this.contract = Contract.getInstance()
		this.data_modelInterface = Data_modelInterfaces.getInstance()
		this.data_modelContract = Data_modelContract.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Data_modelService()
		return this.instance
	}

	// --- findOne: a single record (list filtered by _id → records[0]) --------
	async findOne(config = {}) {
		const { id } = config
		let virtuals = {}
		let relations = {}
		const query = this.data_modelInterface.getQueryInterface().parse({ _id: id, ...config.query?.query })
		if (config.query?.virtuals) virtuals = this.data_modelInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.data_modelInterface.getRelationsInterface().parse(config.query.relations)

		const result = await this.repository.list('data_model', { query, virtuals, relations })
		const data_model = result.records[0]
		if (!data_model) throw new BadRequestError('Data model not found.')
		return this.applayContract(data_model)
	}

	// --- list: collection with filters, projection, relations and pagination -
	async list(config = {}) {
		let query = {}
		let virtuals = {}
		let relations = {}
		if (config.query?.query) query = this.data_modelInterface.getQueryInterface().parse(config.query.query)
		if (config.query?.virtuals) virtuals = this.data_modelInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.data_modelInterface.getRelationsInterface().parse(config.query.relations)
		const size = config.query?.size ? Number(config.query.size) : null
		const page = config.query?.page ? Number(config.query.page) : null
		const sort = config.query?.sort || {}

		const data_model_list = await this.repository.list('data_model', { query, virtuals, relations, size, page, sort })
		data_model_list.records = this.applayContract(data_model_list.records)
		return data_model_list // { count, records }
	}

	applayContract(payload) {
		const contract = this.data_modelContract.getContract()
		const normalize = (p) => (p && typeof p.toObject === 'function' ? p.toObject() : p)
		if (Array.isArray(payload)) return payload.map(item => this.contract.applyContract(contract, normalize(item)))
		if (payload && typeof payload === 'object') return this.contract.applyContract(contract, normalize(payload))
		return payload
	}
}

module.exports = Data_modelService

// ╔══════════════════════════════════════════════════════════════════╗
// ║  1. QUERY — Direct match (no advanced operators)                  ║
// ╚══════════════════════════════════════════════════════════════════╝

// 1.1 No filters — returns all records
const queryEmpty = {}

// 1.2 Exact match on a string field
const queryByText = { text: 'Hello' }

// 1.3 Exact match on a number field
const queryByAmount = { amount: 100 }

// 1.4 Exact match on a boolean field
const queryByActive = { active: true }
const queryByActiveFalse = { active: false }

// 1.5 Exact match on an ObjectId reference (allowAdvance, but equality is also valid)
const queryBySubDataModel = { sub_data_model: '60c72b2f9b1d8e001c8e4abc' }

// 1.6 Combination of multiple direct filters
const queryMultipleDirect = {
	text: 'Hello',
	active: true,
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  2. QUERY — Advanced operators on STRING fields (text, image_url) ║
// ╚══════════════════════════════════════════════════════════════════╝

const queryTextEq = { text: { eq: 'Salt' } }                       // equal to
const queryTextNe = { text: { ne: 'Sugar' } }                      // not equal to
const queryTextLike = { text: { like: 'sal' } }                    // contains (case insensitive)
const queryTextNotLike = { text: { notLike: 'oil' } }              // does not contain
const queryTextIn = { text: { in: ['Salt', 'Sugar', 'Flour'] } }   // within a list
const queryTextNotIn = { text: { notIn: ['Salt', 'Sugar'] } }      // not within a list
const queryTextOr = { text: { or: ['Salt', 'Flour'] } }            // matches any value

// or with nested operators
const queryTextOrWithOperators = { text: { or: [{ like: 'sal' }, { like: 'sug' }] } }
// or mixed (literal value + object with operator)
const queryTextOrMixed = { text: { or: ['Salt', { like: 'flo' }] } }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  3. QUERY — Advanced operators on NUMBER fields (amount)          ║
// ╚══════════════════════════════════════════════════════════════════╝

const queryAmountEq = { amount: { eq: 50 } }
const queryAmountNe = { amount: { ne: 0 } }
const queryAmountGt = { amount: { gt: 10 } }
const queryAmountGte = { amount: { gte: 5 } }
const queryAmountLt = { amount: { lt: 100 } }
const queryAmountLte = { amount: { lte: 200.5 } }
const queryAmountBetween = { amount: { between: [10, 100] } }       // inclusive range [min, max]
const queryAmountNotBetween = { amount: { notBetween: [0, 5] } }    // outside the range
const queryAmountIn = { amount: { in: [10, 20, 50] } }
const queryAmountNotIn = { amount: { notIn: [0, 1, 2] } }
const queryAmountOr = { amount: { or: [10, 20, 50] } }
const queryAmountOrWithOperators = { amount: { or: [{ gte: 50 }, { lte: 5 }] } }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  4. QUERY — Advanced operators on DATE / DATETIME fields          ║
// ║  (birthdate = date, arrival = datetime)                           ║
// ╚══════════════════════════════════════════════════════════════════╝
// Date/datetime values are parsed by data-validator and normalized to UTC.
// Pass ISO strings; the interface transforms them into JS Dates.

const queryBirthdateEq = { birthdate: { eq: '1990-05-20' } }
const queryBirthdateGte = { birthdate: { gte: '2000-01-01' } }                 // born on/after
const queryBirthdateBetween = { birthdate: { between: ['1990-01-01', '1999-12-31'] } } // born in the 90s
const queryArrivalLt = { arrival: { lt: '2024-06-16T00:00:00Z' } }             // arrived before
const queryArrivalBetween = { arrival: { between: ['2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z'] } }
const queryArrivalNotBetween = { arrival: { notBetween: ['2024-06-01T00:00:00Z', '2024-06-30T23:59:59Z'] } }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  5. QUERY — Advanced operators on BOOLEAN fields (active)         ║
// ╚══════════════════════════════════════════════════════════════════╝

const queryActiveEq = { active: { eq: true } }
const queryActiveNe = { active: { ne: false } }
const queryActiveIn = { active: { in: [true] } }
const queryActiveNotIn = { active: { notIn: [false] } }
const queryActiveOr = { active: { or: [true, false] } }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  6. QUERY — Advanced operators on ObjectId field (_id)            ║
// ╚══════════════════════════════════════════════════════════════════╝

const queryIdEq = { _id: { eq: '60c72b2f9b1d8e001c8e4a01' } }
const queryIdNe = { _id: { ne: '60c72b2f9b1d8e001c8e4a01' } }
const queryIdIn = { _id: { in: ['60c72b2f9b1d8e001c8e4a01', '60c72b2f9b1d8e001c8e4a02'] } }
const queryIdNotIn = { _id: { notIn: ['60c72b2f9b1d8e001c8e4a99'] } }
const queryIdOr = { _id: { or: ['60c72b2f9b1d8e001c8e4a01', '60c72b2f9b1d8e001c8e4a02'] } }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  7. QUERY — NESTED OBJECT fields (dot path built automatically)   ║
// ╚══════════════════════════════════════════════════════════════════╝
// For object fields, nest the structure; the commons walker builds the
// dot-notation key path (e.g. 'nested_object.amount') automatically.
// Operators apply only to subfields with allowAdvance: true.

// 7.1 Exact match on a nested string subfield
const queryNestedText = { nested_object: { text: 'inner' } }

// 7.2 Advanced operator on a nested number subfield
const queryNestedAmountGte = { nested_object: { amount: { gte: 100 } } }

// 7.3 Advanced operator on a nested datetime subfield (checkIn)
const queryNestedCheckInBetween = {
	nested_object: { checkIn: { between: ['2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z'] } },
}

// 7.4 Match on a nested ObjectId reference
const queryNestedSubDataModel = { nested_object: { sub_data_model: '60c72b2f9b1d8e001c8e4abc' } }

// 7.5 Multiple subfields combined (both conditions must match)
const queryNestedCombined = {
	nested_object: {
		text: { like: 'inn' },
		amount: { gte: 10 },
	},
}

// 7.6 Deeper nesting (second_nested.sub_nested.*)
const queryDeepNested = {
	second_nested: {
		name: { like: 'jo' },
		sub_nested: { nested_name: { eq: 'leaf' } },
	},
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  8. QUERY — ARRAY OF OBJECTS (object_list)                        ║
// ╚══════════════════════════════════════════════════════════════════╝
// For arrays of subdocuments, nest the subfield; MongoDB matches ANY element
// of the array that satisfies the condition (implicit $elemMatch behavior).

// 8.1 Exact match on a subdocument string field
const queryListByNickname = { object_list: { nickname: 'main' } }

// 8.2 Advanced operator on a subdocument date field (event_date)
const queryListEventDateGte = { object_list: { event_date: { gte: '2024-01-01' } } }

// 8.3 Match on a subdocument ObjectId reference
const queryListSubDataModel = { object_list: { sub_data_model: '60c72b2f9b1d8e001c8e4abc' } }

// 8.4 Combining subdocument fields
const queryListCombined = {
	object_list: {
		nickname: { like: 'ma' },
		event_date: { between: ['2024-01-01', '2024-12-31'] },
	},
}

// 8.5 Deeper array nesting (object_list.sub_object_list.my_datetime)
const queryListDeep = {
	object_list: { sub_object_list: { my_datetime: { gte: '2024-06-01T00:00:00Z' } } },
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  9. QUERY — Simple-primitive ARRAY fields (numbers, sub_data_models) ║
// ╚══════════════════════════════════════════════════════════════════╝
// These fields have NO allowAdvance → equality only.
// Direct value → matches records whose array CONTAINS that value.

const queryNumbersContains = { numbers: 5 }                              // array contains 5
const queryLimitedNumbersContains = { limited_numbers: 3 }              // array contains 3
const querySubDataModelsContains = { sub_data_models: '60c72b2f9b1d8e001c8e4abc' } // array contains the id

// ╔══════════════════════════════════════════════════════════════════╗
// ║  10. QUERY — Combinations across multiple fields                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const queryCombined1 = {
	text: { like: 'sal' },
	amount: { gte: 10 },
	active: true,
}

const queryCombined2 = {
	sub_data_model: '60c72b2f9b1d8e001c8e4abc',
	amount: { between: [50, 500] },
	arrival: { gte: '2024-01-01T00:00:00Z' },
}

const queryCombined3 = {
	_id: { in: ['60c72b2f9b1d8e001c8e4a01', '60c72b2f9b1d8e001c8e4a02'] },
	nested_object: { amount: { gte: 1 } },
	active: { ne: false },
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  11. VIRTUALS — Field projection                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// When virtuals are provided, only those fields are returned.
// The value MUST always be '1' (string).

const virtualsNone = {}                               // returns all fields
const virtualsTextAmount = { text: '1', amount: '1' } // only text and amount
const virtualsWithId = { _id: '1', text: '1' }        // include the id explicitly
const virtualsNested = { nested_object: '1' }         // a whole nested object
const virtualsAllScalars = {
	_id: '1', text: '1', amount: '1', active: '1', birthdate: '1', arrival: '1', image_url: '1',
}

// ╔══════════════════════════════════════════════════════════════════╗
// ║  12. RELATIONS — Populate (lookup) of ObjectId references         ║
// ╚══════════════════════════════════════════════════════════════════╝
// Only ObjectId fields with a `ref` and declared in relationsInterface.
// data_model relationsInterface supports: sub_data_model, sub_data_models.
// The value is always '1'.

const relationsNone = {}                                              // no lookup
const relationsSubDataModel = { sub_data_model: '1' }                 // populate the single reference
const relationsSubDataModels = { sub_data_models: '1' }               // populate the array of references
const relationsAll = { sub_data_model: '1', sub_data_models: '1' }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  13. PAGINATION — size and page (separate arguments)              ║
// ╚══════════════════════════════════════════════════════════════════╝
// size: records per page. page: page number (starts at 1).
// size null → no limit; page null → no skip. NEVER put them inside `query`.

const firstPage = { size: 10, page: 1 }
const secondPage = { size: 10, page: 2 }
const noPagination = { size: null, page: null }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  14. SORT — Ordering                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
// sort.field → field name; sort.type → 1 (ASC) | -1 (DESC).
// Empty sort defaults to createdAt ASC.

const sortDefault = {}                              // createdAt ASC
const sortTextAsc = { field: 'text', type: 1 }
const sortTextDesc = { field: 'text', type: -1 }
const sortAmountDesc = { field: 'amount', type: -1 }
const sortArrivalDesc = { field: 'arrival', type: -1 }

// ╔══════════════════════════════════════════════════════════════════╗
// ║  15. FULL EXAMPLES — config passed to repository.list(...)        ║
// ╚══════════════════════════════════════════════════════════════════╝
// Shape: repository.list('data_model', { query, virtuals, relations, size, page, sort })

// 15.1 — List all, no filters
const exampleListAll = {
	query: {}, virtuals: {}, relations: {}, size: null, page: null, sort: {},
}

// 15.2 — Filter by text (like), paginated and sorted
const exampleByTextPaginated = {
	query: { text: { like: 'sal' } },
	virtuals: {},
	relations: {},
	size: 10,
	page: 1,
	sort: { field: 'text', type: 1 },
}

// 15.3 — Active records with amount range, populating the single reference
const exampleActiveWithRelation = {
	query: { active: true, amount: { between: [50, 500] } },
	virtuals: {},
	relations: { sub_data_model: '1' },
	size: 20,
	page: 1,
	sort: { field: 'amount', type: -1 },
}

// 15.4 — Arrivals within a date range, projecting minimal fields
const exampleArrivalRange = {
	query: { arrival: { between: ['2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z'] } },
	virtuals: { _id: '1', text: '1', arrival: '1' },
	relations: {},
	size: 50,
	page: 1,
	sort: { field: 'arrival', type: 1 },
}

// 15.5 — Advanced search: text or + nested amount + populate both references
const exampleAdvancedSearch = {
	query: {
		text: { or: [{ like: 'sal' }, { like: 'sug' }] },
		nested_object: { amount: { gte: 10 } },
		active: { ne: false },
	},
	virtuals: {},
	relations: { sub_data_model: '1', sub_data_models: '1' },
	size: 25,
	page: 2,
	sort: { field: 'amount', type: 1 },
}

// 15.6 — Filter by specific IDs with minimal projection, no pagination
const exampleFilterByIds = {
	query: { _id: { in: ['60c72b2f9b1d8e001c8e4a01', '60c72b2f9b1d8e001c8e4a02'] } },
	virtuals: { _id: '1', text: '1', amount: '1' },
	relations: {},
	size: null,
	page: null,
	sort: {},
}

// 15.7 — Array-of-objects filter combined with a top-level field
const exampleObjectListAndActive = {
	query: {
		active: true,
		object_list: { event_date: { gte: '2024-01-01' }, nickname: { like: 'ma' } },
	},
	virtuals: {},
	relations: {},
	size: 20,
	page: 1,
	sort: { field: 'createdAt', type: -1 },
}

// ──────────────────────────────────────────────────────────────────────────────
// HOW NESTED / ARRAY QUERIES WORK INTERNALLY (entity-queries commons walker)
// ──────────────────────────────────────────────────────────────────────────────
//
// `findKeysAndValues` traverses the query object recursively. For nested fields
// it builds dot-notation paths and detects operators:
//
//   { nested_object: { amount: { gte: 10 } } }
//     → key: 'nested_object.amount', value: 10, operator: 'gte'
//
//   { object_list: { nickname: 'main', event_date: { gte: '2024-01-01' } } }
//     → key: 'object_list.nickname',   value: 'main',        operator: null
//     → key: 'object_list.event_date', value: <Date>,        operator: 'gte'
//
// MongoDB then matches ANY array element satisfying the condition ($elemMatch).
// For simple arrays:
//   { numbers: 5 }            → matches records whose `numbers` array contains 5
//   { numbers: { in: [3,6] } }→ only if the field were allowAdvance (numbers is not)
//
// ──────────────────────────────────────────────────────────────────────────────
// SERVICE USAGE (quick reference)
// ──────────────────────────────────────────────────────────────────────────────
//
//   const repository = Repository.getInstance()
//
//   const result = await repository.list('data_model', {
//       query,      // search filters (validated with getQueryInterface)
//       virtuals,   // field projection (validated with getVirtualsInterface)
//       relations,  // reference populate (validated with getRelationsInterface)
//       size,       // records per page
//       page,       // page number
//       sort,       // { field: string, type: 1 | -1 }
//   })
//
//   result → { count: Number, records: Object[] }
//   // findOne → take result.records[0] after filtering by _id
// ──────────────────────────────────────────────────────────────────────────────
