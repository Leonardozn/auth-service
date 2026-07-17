# auth-service

Identity microservice of the Generador de CV system. It owns the full account lifecycle -
registration, login/refresh/logout with opaque access + refresh tokens, password change/recovery
by email, self-deactivation - and is the single source of truth for RBAC roles (`user`/`admin`).
Other microservices never decode tokens themselves: they forward the caller's access token to
`POST /auth/validate` and trust the returned `user`.

## Features

- Registration, login, refresh and logout backed by opaque `Session` tokens (short-lived access +
  longer-lived refresh, durations configurable per environment)
- `POST /auth/validate` - the token-introspection endpoint every other protected service in the
  system calls to authorize a request instead of decoding the token itself
- Two-step password change (`POST /auth/change-password` emails a 6-digit code,
  `POST /auth/change-password/verify` confirms it and applies the pre-hashed new password)
- Password recovery via a single-use `PasswordResetToken` emailed through Resend
  (`POST /auth/forgot-password` / `POST /auth/reset-password`); never reveals whether an email exists
- Self-deactivation (`POST /auth/deactivate`, soft delete) separate from an admin deactivating
  another account via `PATCH /user/:id`
- `Role`-based access control with a configurable `maxSessions` per role - login evicts the oldest
  session once the limit is reached
- Full CRUD for `User`, `Role`, `Session`, `PasswordResetToken` and
  `ChangePasswordVerificationCode`; raw CRUD on the last three is admin-only since they hold
  session/recovery material
- Swagger/OpenAPI docs generated from route annotations, served at `/api-docs`
- Prometheus metrics at `GET <METRICS_ROUTE>` (default `/metrics`), optionally gated by a bearer
  token (`METRICS_TOKEN`)
- CORS origin whitelist (open by default), security headers via Helmet, and two-tier rate
  limiting (generous baseline on the whole API, strict per-IP budget on
  register/login/forgot-password/reset-password)

## Prerequisites

- Node.js - the `Dockerfile` pins `node:22-bookworm-slim`; CI (`.github/workflows/ci.yml`) runs on
  Node 24. `package.json` declares no `engines` field, so no single version is enforced by npm.
- npm (the repo is an npm-workspaces monorepo: `apps/*`, `packages/*`)
- A reachable MongoDB instance (configured via the `AUTH_DB_*` variables, or a single
  `AUTH_DB_MONGODB_URI`)
- A Resend account/API key if you need to exercise the password-recovery or change-password email
  flows

## Installation

```bash
npm install
```

This installs `apps/api` and every `packages/*` workspace in one pass.

Then, in the service root, create a `.env` file (loaded by `apps/api` via `dotenv` from
`process.cwd()`) with at least the variables listed in [Configuration](#configuration) - none of
them fall back to a value that works outside a configured `docker-compose.yml`/Railway
environment.

Before calling `POST /auth/register`, seed at least one active `Role` document named `user` in the
`roles` collection of `auth_db` - registration resolves this role by name and fails with `500` if
it is missing (`apps/api/src/services/commands/resolveDefaultRole.js`). Seed an `admin` role too if
you need to exercise the admin-gated endpoints (creating roles, deleting users, assigning roles,
etc.).

### Docker

```bash
docker build -t auth-service .
docker run -p 3000:3000 --env-file .env auth-service
```

The image installs the whole monorepo and runs `npm start` (`CMD ["npm", "start"]`, port `3000`
exposed). It never reads a `.env` file from inside the image (`.dockerignore` excludes `.env`,
`.env.*` and `settings.json`) - configuration must be injected as real environment variables at
run time (`docker run --env-file`/`-e`, a compose `environment:` block, or your platform's
variable store, e.g. Railway).

## Configuration

Every variable below is read in `packages/env-variables/src/envVariables.js`. "Default" is the
fallback actually present in code (`||`) - a blank default means the service has no code fallback
and the variable must be set explicitly for that behavior to work.

| Variable | Purpose | Default |
| -------- | ------- | ------- |
| `API_PORT` | Port the Express server listens on | *(none - must be set)* |
| `API_HOST` | Host/interface the server binds to | *(none - must be set)* |
| `API_PATH` | Prefix under which the API router is mounted (e.g. `/api`) | *(none - must be set; missing it mounts routes at the root instead of under the prefix)* |
| `DEVELOP_MODE` | `"true"` switches protocol/URL building to `http` and disables HSTS | *(none - must be set)* |
| `API_UPLOAD_PATH` | Filesystem folder for uploaded files (generic scaffold feature) | `<serviceRoot>/api-uploads` |
| `API_UPLOAD_INCLUDE_PATHS` | Comma-separated extra paths where the upload middleware also runs | `''` (disabled) |
| `API_FILE_FIELDS` | Comma-separated file-field config for generic CRUD (no model in this service currently declares file fields) | *(none - must be set if used)* |
| `AUTH_DB_DATABASE_NAME` | Mongo database name | *(none - must be set)* |
| `AUTH_DB_DATABASE_HOST` | Mongo host | *(none - must be set)* |
| `AUTH_DB_DATABASE_PORT` | Mongo port | *(none - must be set)* |
| `AUTH_DB_DATABASE_USERNAME` | Mongo username | *(none - must be set)* |
| `AUTH_DB_DATABASE_PASSWORD` | Mongo password | *(none - must be set)* |
| `AUTH_DB_DATABASE_AUTO_CREATE` | `mongoose.set('autoCreate', ...)` - `"true"`/`"false"` (JSON-parsed, throws if unset/invalid) | *(none - must be set)* |
| `AUTH_DB_MONGODB_URI` | Full Mongo connection URI; when set it wins over the discrete `AUTH_DB_DATABASE_*` credentials | *(none - falls back to the discrete vars above)* |
| `AUTH_DB_DATABASE_REPLICA_SET` | Mongo replica set name | `''` |
| `SESSION_TOKEN_DEFAULT_TIME` | Access token lifetime (Luxon duration string) | `15m` |
| `REFRESH_TOKEN_DEFAULT_TIME` | Refresh token lifetime | `5d` |
| `RESET_TOKEN_DEFAULT_TIME` | `PasswordResetToken` lifetime | `30m` |
| `CHANGE_PASSWORD_CODE_DEFAULT_TIME` | Change-password verification code lifetime | `5m` |
| `CHANGE_PASSWORD_CODE_MAX_ATTEMPTS` | Wrong-code attempts allowed before the pending code is invalidated | `5` |
| `RESEND_TOKEN` | Resend API key (secret) | *(none - must be set)* |
| `RESEND_API_URL` | Resend send-email endpoint | `https://api.resend.com/emails` |
| `ADMIN_MAIL_FROM` | Sender address for transactional email | `onboarding@resend.dev` |
| `PASSWORD_RESET_URL_BASE` | Base URL the reset-password link in the email points to | `http://localhost:5173/reset-password` (**a development-only value** - must be overridden with the real frontend URL in any deployed environment) |
| `METRICS_ROUTE` | Path Prometheus scrapes | `/metrics` |
| `METRICS_PREFIX` | Prefix applied to exported metric names | `''` |
| `METRICS_TOKEN` | Bearer token required to read `/metrics`; empty leaves the endpoint public | `''` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origin whitelist | `''` (empty means fully open: `origin: '*'`) |
| `SECURITY_CORP_POLICY` | `Cross-Origin-Resource-Policy` header value | `same-origin` |
| `RATE_LIMIT_WINDOW_MS` | Baseline rate-limit rolling window (ms), applied to the whole API | `60000` |
| `RATE_LIMIT_MAX` | Baseline max requests per IP per window | `300` |
| `RATE_LIMIT_STRICT_WINDOW_MS` | Strict rate-limit window (ms) for register/login/forgot-password/reset-password | `900000` |
| `RATE_LIMIT_STRICT_MAX` | Strict max requests per IP per window on those endpoints | `10` |

## Usage

```bash
npm start          # node apps/api/index.js - starts the API on API_HOST:API_PORT
npm run stop        # pkill -f "node apps/api/index.js"
npm run lint         # eslint .
npm test            # runs unit + e2e + smoke + crud suites
```

Once running, interactive API docs are served at `/api-docs` and a liveness check at `GET /health`
(always `200`, static payload - used by orchestration tooling to know the server finished
booting).

## API / Route reference

All non-CRUD identity flows are mounted under `/auth`; every other resource follows the standard
`POST` (create) / `GET` (list, findOne) / `PUT` (replace) / `PATCH` (update) / `DELETE` shape.
Responses are wrapped as `{ success, message, statusCode, content }`. Status codes actually
emitted by this service: `200`, `201` (create), `400` (validation / business-rule), `401`
(missing/invalid/expired token or bad credentials), `403` (authenticated but not permitted),
`404`/`400` (not found - CRUD "not found" cases return `400`, see below), `429` (rate limit,
`packages/rate-limiter`), `500` (unexpected error), `502` is reserved for upstream failures per the
project's error convention but is not raised anywhere in this service's current code.

> Note: for the generated CRUD routes (`/user`, `/role`, `/session`, `/password_reset_token`,
> `/change_password_verification_code`), a "record not found" on `GET`/`PUT`/`PATCH`/`DELETE` is
> returned as `400`, not `404` - see the annotations in `apps/api/src/routes/*.js`.

### Auth (`/auth`) - the inter-service authentication protocol

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/auth/register` | none | Register a user; always assigns the default `user` role |
| POST | `/auth/login` | none | Log in; returns `{ token, refreshToken, user }` and persists a `Session` |
| POST | `/auth/refresh` | none (`refreshToken` in body) | Rotates access + refresh tokens on the same `Session` |
| POST | `/auth/validate` | none (`token` in body) | Validates an access token; returns `{ user }` incl. `role` (by **name**) - this is the endpoint other services call |
| POST | `/auth/logout` | Bearer | Revokes the current `Session`; idempotent |
| POST | `/auth/change-password` | Bearer | Step 1: verifies `currentPassword`, emails a 6-digit code |
| POST | `/auth/change-password/verify` | Bearer | Step 2: confirms the code, applies the new password, revokes other sessions |
| POST | `/auth/forgot-password` | none | Always `200`; emails a reset link if the account exists |
| POST | `/auth/reset-password` | none (`token` in body) | Consumes a `PasswordResetToken`, sets the new password, revokes active sessions |
| POST | `/auth/deactivate` | Bearer | Soft-deletes the caller's own account and revokes its `Session`/`PasswordResetToken` records |

Passwords (register, change-password, reset-password) must be at least 8 characters and include
one uppercase letter, one digit and one special character
(`apps/api/src/services/commands/validatePasswordPolicy.js`).

### User (`/user`)

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/user` | Bearer | Creates a user; setting `role` additionally requires an admin session |
| GET | `/user` | Bearer (any role) | Paginated list with `query[field]`/`query[field][operator]` filtering, `sort`, `size`, `page`, `relations[role]` |
| GET | `/user/:id` | Bearer (any role) | Get by id |
| PUT | `/user/:id` | Bearer | Full replace; setting `role` requires admin |
| PATCH | `/user/:id` | Bearer | Profile edit (account management, not raw field update) - only `name`/`email`/`active`; caller must own the account or be admin; `active` is ignored unless the caller is admin |
| DELETE | `/user/:id` | Bearer + admin | Delete |

### Role (`/role`)

Reading (`GET`) requires any authenticated session; every mutation (`POST`/`PUT`/`PATCH`/`DELETE`)
requires an admin session. Fields: `name`, `active`, `maxSessions` (omitted or `<= 0` = unlimited).

### Session / PasswordResetToken / ChangePasswordVerificationCode

`/session`, `/password_reset_token`, `/change_password_verification_code` expose the same
`POST`/`GET`(list)/`GET /:id`/`PUT`/`PATCH`/`DELETE` shape. These are internal identity/recovery
records normally created by the `/auth/*` flows above, not by direct clients - every operation on
them here (including `GET`) requires an admin session.

### Health & observability

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/health` | none | Liveness check, always `200` |
| GET | `<METRICS_ROUTE>` (default `/metrics`) | none, or Bearer `METRICS_TOKEN` if set | Prometheus scrape endpoint, mounted outside the API router |
| GET | `/api-docs` | none | Swagger UI generated from the route annotations |

## Project structure

```
apps/api/                     API application (the only app in this workspace)
  index.js                    Express bootstrap: middleware order, routing, Swagger, metrics
  src/contracts/               Response-shaping contracts per model (field filtering)
  src/controllers/              Request handlers - call services, build the HTTP response
  src/handlers/                 Wiring layer: turns env vars + packages into ready-to-use middleware
  src/interfaces/                Zod validation schemas per model/flow
  src/models/                    Mongoose schemas (role, user, session, password_reset_token, change_password_verification_code)
  src/repositories/               Generic Mongo CRUD over the models above
  src/routes/                      Express routers + OpenAPI (@openapi) annotations, one file per resource
  src/services/                     Business logic (authentication, accountManagement, per-model CRUD)
  src/services/commands/             Single-purpose command classes used by the services (hashing, token issuance, policy checks, email senders, etc.)
  tests/                        unit / e2e / crud / smoke suites (see Testing)
packages/                     Workspace packages consumed via `@auth-service/*` (cors-policy,
                               data-encrypt, data-validator, db-connections, documentation-config,
                               email-manager, entity-queries, env-variables, external-api-config,
                               file-manager, handle-errors, handle-response, prototypes,
                               rate-limiter, request-logger, security-headers,
                               server-configuration, analytics-manager)
settings.json                 Model/field/env-var definitions this service was generated from
Dockerfile                    Production image (Node 22, npm workspaces install, npm start)
.github/workflows/ci.yml      Lint, test suites and commitlint on push/PR to main/develop
.githooks/                    Local git hooks (commit-msg -> commitlint, pre-commit -> lint+test)
```

## Testing

```bash
npm test              # everything: unit + e2e + smoke + crud
npm run test:unit       # apps/*/tests/unit/**/*.test.js
npm run test:e2e         # apps/*/tests/e2e/**/*.test.js
npm run test:smoke        # apps/*/tests/smoke/**/*.test.js
npm run test:crud          # apps/*/tests/crud/**/*.test.js
```

Tests run on Node's built-in test runner (`node --test`). `tests/e2e` and `tests/crud` boot the
real app (`tests/support/run-app.js`) against mocked dependencies (`tests/support/mock-*-preload.js`
for the repository and the email manager), rather than a live MongoDB or Resend account.

## Contributing

Commits are linted with `@commitlint/config-conventional` (`commitlint.config.js`) via a
`commit-msg` git hook, and `npm run lint && npm test` runs on every commit via a `pre-commit` hook
(`.githooks/`, wired up automatically by the `prepare` script on `npm install`). CI
(`.github/workflows/ci.yml`) re-runs lint, all four test suites, and commitlint on every push/PR
to `main`/`develop`.
