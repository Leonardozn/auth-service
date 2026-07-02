---
title: Filter response models with their contract
impact: CRITICAL
impactDescription: When a process response contains a project data model, that model must be filtered with its contract to expose only the allowed fields, even inside arrays or nested objects.
tags: architecture, contracts, response, security, models
---

# Filter response models with their contract

## Why it matters

Whenever the response of a main process (a service method) contains one of the
project's data models, that model must be **filtered with its contract**
(`contracts/<model>.js`). The contract defines which fields are exposed. This
applies when the response is:

- a **single object** of the model,
- an **array** of objects where each one is that model,
- an **object with one or more nested models**.

Each model service exposes `applayContract(payload)` for this. Returning the raw
Mongoose document under-filters and may expose disallowed fields.

## Incorrect Example

Returning the model without applying its contract.

```javascript
// services/data_model.js
async findOne(config = {}) {
	const result = await this.repository.list('data_model', { query: { _id: config.id } })
	return result.records[0]   // ❌ raw document, not filtered by contract
}
```

## Correct Example

Apply the contract to the output, whether object, array, or nested.

```javascript
// services/data_model.js — single object
async findOne(config = {}) {
	const result = await this.repository.list('data_model', { query: { _id: config.id } })
	const data_model = result.records[0]
	if (!data_model) throw new BadRequestError('Data model not found.')
	return this.applayContract(data_model)   // ✅ filtered by contract
}

// services/data_model.js — array
async list(config = {}) {
	const data_model_list = await this.repository.list('data_model', { query: {} })
	data_model_list.records = this.applayContract(data_model_list.records) // ✅ array filtered
	return data_model_list
}
```

For a multi-model process, filter **each** model with its corresponding contract
(through its service):

```javascript
// services/checkout.js
return {
	data_model: this.data_modelService.applayContract(data_model),        // ✅ data_model contract
	sub_data_model: this.sub_data_modelService.applayContract(sub_model)  // ✅ sub_data_model contract
}
```

## Key Rules

1. Filter **each** model in the payload with **its** contract (not another model's).
2. `applayContract` already handles a single object and an array; use it for both.
3. For nested data, make sure the containing model's contract describes the nested
   models you want to expose.
