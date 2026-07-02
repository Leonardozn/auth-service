# Layered architecture

The `backend` project is a **monorepo** with two main zones:

- `apps/api/` — the HTTP application (API), organized by layers inside `apps/api/src/`.
- `packages/` — reusable packages (`@backend/*`) that encapsulate cross-cutting
  capabilities (validation, DB connection, errors, responses, etc.).

All business work happens inside `apps/api/src/`, respecting the flow:
**route → controller → service (→ commands) → repository → entity-queries → model**.

## Layers of `apps/api/src/`

| Layer           | Folder           | Purpose |
| --------------- | ---------------- | ------- |
| **Routes**      | `routes/`        | Declare the HTTP endpoints and bind each route to a controller method. No business logic. |
| **Controllers** | `controllers/`   | Receive `req`/`res`, extract `body`, `params`, `query`, and `files`, delegate to the service, and build the HTTP response with the response handler. No business logic. |
| **Services**    | `services/`      | **Layer where the business logic lives.** Each model has its service. They orchestrate validation, data access, and contract application. Every new task is implemented here (unless stated otherwise). |
| **Commands**    | `services/commands/` | Reusable steps. Each step of a process is a single-method class located here. Services compose their processes by invoking these commands. |
| **Interfaces**  | `interfaces/`    | Define the validation schemas (create, update, query, virtuals, relations) using the `data-validator` handler. They validate and transform input before it reaches the repository. |
| **Contracts**   | `contracts/`     | Define which fields of each model are exposed in responses. They are applied to the output to filter data models. |
| **Repositories**| `repositories/`  | Data access abstraction. They expose `add`, `list`, `update`, `replace`, `remove` by schema name and delegate to `entity-queries`. The only entry point to the database from services. |
| **Models**      | `models/`        | Mongoose schemas (via `db-connections`). They define the persisted shape of each model and its relations (`ref`). |
| **Handlers**    | `handlers/`      | Wrappers (singletons) over each `@backend/*` package. **The only place from which packages are consumed** in the app. |

## Dependency rules between layers

- **Controllers** only know about **services** and the response handler.
- **Services** orchestrate **interfaces**, **repositories**, **contracts**,
  **commands**, and **handlers**; they never access Mongoose directly.
- **Repositories** are the only component that uses `entity-queries`.
- Any external package is consumed only through its **handler**.
