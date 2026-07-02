---
title: Service granularity (one model, one service)
impact: CRITICAL
impactDescription: Correct granularity keeps services focused. Every model has its service; a single-model process goes into its service, and a multi-model process goes into a service exclusive to that process.
tags: architecture, services, granularity, responsibility
---

# Service granularity (one model, one service)

## Why it matters

Every data model in the project has **its own service** (e.g.
`services/data_model.js` for the `data_model` model). Where to implement a feature
depends on how many models the process involves:

- **Single-model process** → implement it in that model's service.
- **Multi-model process** → create a **service exclusive to that process**.

This keeps a model service from accumulating unrelated logic and keeps multi-model
processes identifiable and reusable. Once you know where the logic lives, see
`arch-controller-route-wiring` for how to actually expose it — extending a generated CRUD action,
adding a sibling action, or (rarely) exposing it through a separate controller.

## Incorrect Example

Putting a process that coordinates `data_model` and `sub_data_model` inside a
single model's service.

```javascript
// services/data_model.js
// ❌ A process requiring TWO models must not live in the service of just one
async checkoutWithSubModels(config = {}) {
	const data_model = await this.repository.add('data_model', { data: config.data })
	// ...logic that also creates/updates sub_data_model
	const sub = await this.repository.add('sub_data_model', { data: config.sub })
	return { data_model, sub }
}
```

## Correct Example

Single-model feature in its service; multi-model process in its exclusive service.

```javascript
// services/data_model.js  → SINGLE-model process
async activate(config = {}) {
	const data_model = await this.repository.update('data_model', { id: config.id, data: { active: true } })
	return this.applayContract(data_model)
}
```

```javascript
// services/checkout.js  → service EXCLUSIVE to a multi-model process
class CheckoutService {
	// orchestrates data_model + sub_data_model through commands (see arch-command-steps)
	async execute(config = {}) { /* ... */ }
}
```

## Process service naming

Name the process service after the process (not after a model): `CheckoutService`,
`OrderProcessingService`, etc. Place it in `services/`.
