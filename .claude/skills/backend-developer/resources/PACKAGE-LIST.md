# Available packages

These are the existing packages in `packages/` of the `backend` project
(namespace `@backend/*`). **Before implementing custom logic, check whether one of
these packages already covers the requirement.** Always consume them through their
**handler** in `apps/api/src/handlers/` (see rule `arch-use-handlers`).

| # | Package | Handler | Description |
| - | ------- | ------- | ----------- |
| 1 | `cors-policy` | `corsPolicy.js` | CORS (Cross-Origin Resource Sharing) configuration and policy. |
| 2 | `data-encrypt` | `dataEncrypt.js` | Encryption/hashing helpers (e.g. passwords) and JWT token management. |
| 3 | `data-validator` | `dataValidator.js` | Data validation (schemas with `types` and `validate`) and date handling via **luxon** (`getLuxon()`). |
| 4 | `db-connections` | `dbConnections.js` | Database connection (MongoDB/Mongoose). Provides `Schema` and `model` to the models. |
| 5 | `entity-queries` | — (used in `repositories/`) | Query constructor and Repository pattern abstraction (`add`, `list`, `update`, `replace`, `remove`) plus the `Operators`. |
| 6 | `env-variables` | `envVariables.js` | Loading and parsing of environment variables. |
| 7 | `external-api-config` | `externalApiConfig.js` | Configuration for consuming external APIs. |
| 8 | `file-manager` | `fileManager.js` | File upload and management (storage strategies, e.g. local disk) and Express middleware. |
| 9 | `handle-errors` | `handleErrors.js` | Custom error classes (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `InternalServerError`) and global error handling. |
| 10 | `handle-response` | `handleResponse.js` | Standardizes API responses (success/error format) via `buildResponse`. |
| 11 | `prototypes` | `prototypes.js` | JavaScript prototype extensions (Array, String) specific to the project. |
| 12 | `request-logger` | `requestLogger.js` | HTTP request logging middleware. |
| 13 | `server-configuration` | `serverConfiguration.js` | Express server configuration and startup. |
| 14 | `documentation-config` | `documentationConfig.js` | Swagger/OpenAPI documentation configuration and its UI. |

> Note: `entity-queries` is consumed from the `repositories/` layer (it has no
> handler of its own in `handlers/`). All other packages are consumed through their
> corresponding handler.
