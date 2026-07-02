---
title: All logic lives in the services layer
impact: CRITICAL
impactDescription: Business logic must be encapsulated in the services layer to keep responsibilities separated. Controllers only handle the HTTP request/response and the repository only accesses data.
tags: architecture, services, business-logic, separation-of-concerns
---

# All logic lives in the services layer

## Why it matters

Every task must be implemented in the **services layer**, unless explicitly stated
otherwise. Controllers only translate HTTP (`req`/`res`) and the repository only
accesses data. Mixing business logic into other layers breaks the separation of
concerns and hurts reusability and testing.

## Incorrect Example

Putting validation and business logic inside the controller.

```javascript
// controllers/data_model.js
async add(req, res) {
	if (!req.body.text) throw new Error('text required')   // ❌ logic in the controller
	const data_model = await this.repository.add('data_model', { data: req.body }) // ❌ controller using the repository
	res.json(data_model)
}
```

## Correct Example

The controller delegates to the service; the logic lives in the service.

```javascript
// controllers/data_model.js
async add(req, res) {
	const data_model = await this.data_modelService.add({ body: req.body, files: req.files })
	const response = this.handleResponseHandler.buildResponse(data_model)
	res.status(response[this.responseBody.STATUS]).json(response)
}

// services/data_model.js
async add(config = {}) {
	const { body, options = {} } = config
	const data = this.data_modelInterface.getCreateInterface().parse(body) // validation
	const data_model = await this.repository.add('data_model', { data, options })
	return this.applayContract(data_model)
}
```

## Exception

Only implement outside the services layer when the requirement explicitly says so
(for example, a middleware, a new handler, or a route configuration).
