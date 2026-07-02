---
title: Fetch data with findOne and list through the repository
impact: HIGH
impactDescription: Data fetching is done with the entity-queries package methods through the repository. findOne (one record) and list (collection) must use the correct parameter contract and validate the input with the model interfaces.
tags: data, repository, entity-queries, findOne, list, query, virtuals, relations
---

# Fetch data with `findOne` and `list` through the repository

## Why it matters

Data access in the project is done with the `entity-queries` package **through the
repository** (`repositories/index.js`), never with raw Mongoose from the service.
The repository exposes `list` by schema name and always returns `{ count, records }`.
On top of it, each service implements two reads:

- **`findOne`** → fetch **one** record (resolved with `list` filtering by `_id` and
  taking `records[0]`).
- **`list`** → fetch a **collection** with filters, projection, relations,
  pagination, and sorting.

The input is always validated/transformed with the model **interfaces** before
reaching the repository, and the output is filtered with the **contract** (see
`arch-contract-filtering`).

## `repository.list` signature

```javascript
repository.list(schemaName, { query, virtuals, relations, size, page, sort })
// Returns: { count: Number, records: Object[] }
```

| Parameter   | Type           | Default | Description |
| ----------- | -------------- | ------- | ----------- |
| `query`     | `Object`       | `{}`    | Filters. Direct equality or advanced operators on fields with `allowAdvance: true`. |
| `virtuals`  | `Object`       | `{}`    | Fields to project. Empty = all. Value is always `'1'` (string). |
| `relations` | `Object`       | `{}`    | ObjectId relations to populate (lookup). Value is always `'1'` (string). |
| `size`      | `Number\|null` | `null`  | Records per page. `null` = no limit. |
| `page`      | `Number\|null` | `null`  | Page number (starts at 1). `null` = no skip. |
| `sort`      | `Object`       | `{}`    | `{ field: string, type: 1 \| -1 }`. Empty = `createdAt ASC`. |

## Incorrect Example

Bypassing the repository/interfaces or passing raw Mongoose syntax.

```javascript
// ❌ Raw Mongoose in the service, without repository or interfaces
const data_model = await DataModel.findOne({ _id: id })

// ❌ Raw syntax and pagination inside the query
await this.repository.list('data_model', { query: { text: { $regex: 'sal' }, limit: 10 } })
```

## Correct Example

### `findOne` — one record

```javascript
// services/data_model.js
async findOne(config = {}) {
	const { id } = config
	let virtuals = {}
	let relations = {}
	// Input is validated/transformed with the model interfaces
	const query = this.data_modelInterface.getQueryInterface().parse({ _id: id, ...config.query?.query })
	if (config.query?.virtuals) virtuals = this.data_modelInterface.getVirtualsInterface().parse(config.query.virtuals)
	if (config.query?.relations) relations = this.data_modelInterface.getRelationsInterface().parse(config.query.relations)

	const result = await this.repository.list('data_model', { query, virtuals, relations })
	const data_model = result.records[0]
	if (!data_model) throw new BadRequestError('Data model not found.')

	return this.applayContract(data_model) // output filtered by contract
}
```

### `list` — collection

```javascript
// services/data_model.js
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
	data_model_list.records = this.applayContract(data_model_list.records) // array filtered by contract
	return data_model_list
}
```

## Query operators

Only available on fields with `allowAdvance: true` in the model's `queryInterface`.
Other fields only support direct equality (for an array field, equality matches
records whose array **contains** the value).

| Operator | Allowed types | Notes (how `buildPipeline` maps it) |
| -------- | ------------- | ----------------------------------- |
| `eq` / `ne` | string, number, date, datetime, boolean, objectId | `$eq` / `$ne` |
| `like` / `notLike` | string | `$regex` with `$options: 'i'` (case-insensitive contains) |
| `gt` / `gte` / `lt` / `lte` | number, date, datetime | comparison operators |
| `between` / `notBetween` | number, date, datetime | inclusive range `[min, max]` → `$gte`/`$lte` |
| `in` / `notIn` | string, number, date, datetime, boolean, objectId | list membership |
| `or` | all of the above | matches any value; supports nested operators |

> Dates: `date`/`datetime` fields fully support range operators. Pass ISO strings;
> the interface parses and normalizes them to UTC before the query runs.

```javascript
const query = {
	text: { like: 'sal' },                       // string
	amount: { gte: 10 },                          // number
	birthdate: { between: ['2024-01-01', '2024-12-31'] }, // date range
	arrival: { lt: '2024-06-16T00:00:00Z' },      // datetime
	active: true,                                 // direct equality (boolean)
	nested_object: { amount: { gte: 100 } },      // nested object (dot path auto-built)
	object_list: { nickname: { like: 'ma' } },    // array of objects (matches any element)
	numbers: 5                                    // simple array → contains 5 (no allowAdvance)
}
```

### Projection, relations, pagination & sort behavior

- **`virtuals`** build a `$project`. Value is always `'1'`. If `_id` is not listed,
  it is excluded automatically.
- **`relations`** build a `$lookup` by the field's `ref`. A **single** reference is
  `$unwind`-ed (returned as an object); an **array** reference stays an array.
- **`size`/`page`** become `$skip`/`$limit`. `page` only skips when `size` is set.
- **`sort`** needs **both** `field` and `type` (`1`/`-1`); otherwise it defaults to
  `createdAt` ASC. Any `type` other than `1`/`-1` throws `BadRequestError`.

## Key Rules

1. **Always through the repository** (`this.repository.list('<schema>', { ... })`),
   never raw Mongoose from the service.
2. `findOne` = `list` filtering by `_id` and taking `records[0]`; throw
   `BadRequestError` if it does not exist.
3. **Validate the input** with the model interfaces (`getQueryInterface`,
   `getVirtualsInterface`, `getRelationsInterface`) before querying.
4. `virtuals` and `relations` use **`'1'`** (string) as the value.
5. **Never** put `size`/`page` inside `query`: they are separate arguments.
6. **Filter the output** with the model's contract (see `arch-contract-filtering`).
