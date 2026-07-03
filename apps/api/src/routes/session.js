const SessionController = require('../controllers/session')

/**
 * @openapi
 * tags:
 *   - name: Session
 *     description: |
 *       Raw Session records (opaque access/refresh token pairs). Sessions are normally created
 *       by `POST /auth/login` and consumed via `POST /auth/validate`/`POST /auth/refresh` -
 *       Session is an internal identity record, so every raw CRUD operation on it here is
 *       admin-only, unconditionally.
 *
 * /session:
 *   post:
 *     tags: [Session]
 *     summary: Create a session
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               accessToken: { type: string }
 *               accessTokenExpiresAt: { type: string, format: date-time }
 *               refreshToken: { type: string }
 *               refreshTokenExpiresAt: { type: string, format: date-time }
 *           example: { user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" }
 *     responses:
 *       200:
 *         description: Session created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" } }
 *       400:
 *         description: |
 *           Validation error (missing/invalid field). Zod reports a type-specific message (e.g.
 *           "Invalid datetime" for a malformed date) with the issue in `content`; both become
 *           arrays when more than one field is invalid.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid datetime", statusCode: 400, content: { code: "invalid_string", validation: "datetime", message: "Invalid datetime", path: ["accessTokenExpiresAt"] } }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       403:
 *         description: The caller's session does not belong to an admin
 *         content:
 *           application/json:
 *             example: { success: false, message: "Not authorized to perform this action.", statusCode: 403, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   get:
 *     tags: [Session]
 *     summary: List sessions
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *       Paginated list with filtering, operators, sorting and pagination.
 *         - Equality filter:  `query[field]=value`            (e.g. query[user]=64b0c0ffee1234567890abcd)
 *         - Operator filter:  `query[field][operator]=value`  (e.g. query[accessTokenExpiresAt][gte]=2024-01-01T00:00:00.000Z)
 *       Operators by type — eq/ne/in/notIn: any; like/notLike: string;
 *       gt/gte/lt/lte: number|date|datetime; between/notBetween: number|date|datetime (two values);
 *       or: combines conditions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query[field]
 *         schema: { type: string }
 *         description: Equality filter, e.g. `query[user]=64b0c0ffee1234567890abcd`
 *       - in: query
 *         name: query[field][operator]
 *         schema: { type: string }
 *         description: Operator filter, e.g. `query[accessTokenExpiresAt][gte]=2024-01-01T00:00:00.000Z`
 *       - in: query
 *         name: sort[field]
 *         schema: { type: integer, enum: [1, -1] }
 *         description: Sort ascending (1) or descending (-1), e.g. `sort[createdAt]=-1`
 *       - in: query
 *         name: size
 *         schema: { type: integer }
 *         description: Records per page
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: 1-based page number
 *       - in: query
 *         name: relations[user]
 *         schema: { type: boolean }
 *         description: Include the referenced User document instead of just its id
 *     responses:
 *       200:
 *         description: List retrieved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { count: 1, records: [{ user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" }] } }
 *       400:
 *         description: Invalid filter, operator, or value type (e.g. an operator not supported by that field's type)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Unrecognized key(s) in object: 'gte'", statusCode: 400, content: { code: "unrecognized_keys", keys: ["gte"], path: ["accessToken"], message: "Unrecognized key(s) in object: 'gte'" } }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /session/{id}:
 *   get:
 *     tags: [Session]
 *     summary: Get a session by id
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Session ObjectId
 *       - in: query
 *         name: relations[user]
 *         schema: { type: boolean }
 *         description: Include the referenced User document instead of just its id
 *     responses:
 *       200:
 *         description: Session found
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" } }
 *       400:
 *         description: No session matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Session not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   put:
 *     tags: [Session]
 *     summary: Replace a session
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`. Full replace - fields omitted
 *       from the body are cleared, not left untouched.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Session ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               accessToken: { type: string }
 *               accessTokenExpiresAt: { type: string, format: date-time }
 *               refreshToken: { type: string }
 *               refreshTokenExpiresAt: { type: string, format: date-time }
 *           example: { user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" }
 *     responses:
 *       200:
 *         description: Session replaced
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", accessToken: "sample text", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" } }
 *       400:
 *         description: Either a validation error (same shape as `POST /session`), or no session matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Session not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   patch:
 *     tags: [Session]
 *     summary: Update a session
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`. Partial update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Session ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               accessToken: { type: string }
 *               accessTokenExpiresAt: { type: string, format: date-time }
 *               refreshToken: { type: string }
 *               refreshTokenExpiresAt: { type: string, format: date-time }
 *           example: { accessToken: "rotated-token" }
 *     responses:
 *       200:
 *         description: Session updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", accessToken: "rotated-token", accessTokenExpiresAt: "2024-01-01T00:00:00.000Z", refreshToken: "sample text", refreshTokenExpiresAt: "2024-01-01T00:00:00.000Z" } }
 *       400:
 *         description: Either a validation error (same shape as `POST /session`), or no session matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Session not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   delete:
 *     tags: [Session]
 *     summary: Delete a session
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Session ObjectId
 *     responses:
 *       200:
 *         description: Session deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { deletedCount: 1 } }
 *       400:
 *         description: No session matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Session not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 */
class SessionRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	sessionController

	constructor() {
		this.sessionController = SessionController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new SessionRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/session',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.sessionController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.sessionController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.sessionController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.sessionController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.sessionController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.sessionController.remove }
			]
		}
	}
}

module.exports = SessionRouter