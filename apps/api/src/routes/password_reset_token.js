const Password_reset_tokenController = require('../controllers/password_reset_token')

/**
 * @openapi
 * tags:
 *   - name: PasswordResetToken
 *     description: |
 *       Raw PasswordResetToken records (single-use recovery tokens). Normally created by
 *       `POST /auth/forgot-password` and consumed via `POST /auth/reset-password` - this is the
 *       generic model CRUD, unauthenticated like the rest of the raw model endpoints.
 *
 * /password_reset_token:
 *   post:
 *     tags: [PasswordResetToken]
 *     summary: Create a password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               token: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *           example: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false }
 *     responses:
 *       200:
 *         description: Password reset token created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false } }
 *       400:
 *         description: |
 *           Validation error (missing/invalid field). Zod reports the generic message
 *           "Invalid input" with the specific issue in `content`; both become arrays when more
 *           than one field is invalid.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid input", statusCode: 400, content: { code: "invalid_type", expected: "boolean", received: "string", path: ["used"], message: "Expected boolean, received string" } }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   get:
 *     tags: [PasswordResetToken]
 *     summary: List password reset tokens
 *     description: |
 *       Paginated list with filtering, operators, sorting and pagination.
 *         - Equality filter:  `query[field]=value`            (e.g. query[used]=false)
 *         - Operator filter:  `query[field][operator]=value`  (e.g. query[expiresAt][gte]=2024-01-01T00:00:00.000Z)
 *       Operators by type — eq/ne/in/notIn: any; like/notLike: string;
 *       gt/gte/lt/lte: number|date|datetime; between/notBetween: number|date|datetime (two values);
 *       or: combines conditions.
 *     parameters:
 *       - in: query
 *         name: query[field]
 *         schema: { type: string }
 *         description: Equality filter, e.g. `query[used]=false`
 *       - in: query
 *         name: query[field][operator]
 *         schema: { type: string }
 *         description: Operator filter, e.g. `query[expiresAt][gte]=2024-01-01T00:00:00.000Z`
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
 *             example: { success: true, message: "Success!", statusCode: 200, content: { count: 1, records: [{ user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false }] } }
 *       400:
 *         description: Invalid filter, operator, or value type (e.g. an operator not supported by that field's type)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Unrecognized key(s) in object: 'gte'", statusCode: 400, content: { code: "unrecognized_keys", keys: ["gte"], path: ["token"], message: "Unrecognized key(s) in object: 'gte'" } }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /password_reset_token/{id}:
 *   get:
 *     tags: [PasswordResetToken]
 *     summary: Get a password reset token by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: PasswordResetToken ObjectId
 *       - in: query
 *         name: relations[user]
 *         schema: { type: boolean }
 *         description: Include the referenced User document instead of just its id
 *     responses:
 *       200:
 *         description: Password reset token found
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false } }
 *       400:
 *         description: No password reset token matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Password reset token not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   put:
 *     tags: [PasswordResetToken]
 *     summary: Replace a password reset token
 *     description: Full replace - fields omitted from the body are cleared, not left untouched.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: PasswordResetToken ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               token: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *           example: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false }
 *     responses:
 *       200:
 *         description: Password reset token replaced
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: false } }
 *       400:
 *         description: Either a validation error (same shape as `POST /password_reset_token`), or no token matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Password reset token not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   patch:
 *     tags: [PasswordResetToken]
 *     summary: Update a password reset token
 *     description: Partial update.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: PasswordResetToken ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               token: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *           example: { used: true }
 *     responses:
 *       200:
 *         description: Password reset token updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", token: "sample text", expiresAt: "2024-01-01T00:00:00.000Z", used: true } }
 *       400:
 *         description: Either a validation error (same shape as `POST /password_reset_token`), or no token matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Password reset token not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   delete:
 *     tags: [PasswordResetToken]
 *     summary: Delete a password reset token
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: PasswordResetToken ObjectId
 *     responses:
 *       200:
 *         description: Password reset token deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { deletedCount: 1 } }
 *       400:
 *         description: No password reset token matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Password reset token not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 */
class Password_reset_tokenRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	password_reset_tokenController

	constructor() {
		this.password_reset_tokenController = Password_reset_tokenController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Password_reset_tokenRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/password_reset_token',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.password_reset_tokenController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.password_reset_tokenController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.password_reset_tokenController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.password_reset_tokenController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.password_reset_tokenController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.password_reset_tokenController.remove }
			]
		}
	}
}

module.exports = Password_reset_tokenRouter