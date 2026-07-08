const Change_password_verification_codeController = require('../controllers/change_password_verification_code')

/**
 * @openapi
 * tags:
 *   - name: ChangePasswordVerificationCode
 *     description: |
 *       Raw ChangePasswordVerificationCode records (the pending 6-digit code and the pre-hashed
 *       new password awaiting confirmation). Normally created by `POST /auth/change-password` and
 *       consumed via `POST /auth/change-password/verify` - it holds sensitive material (the code
 *       and the new password hash), so every raw CRUD operation on it here is admin-only,
 *       unconditionally.
 *
 * /change_password_verification_code:
 *   post:
 *     tags: [ChangePasswordVerificationCode]
 *     summary: Create a change password verification code
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
 *               code: { type: string }
 *               newPasswordHash: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *               attempts: { type: number }
 *           example: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 }
 *     responses:
 *       200:
 *         description: Change password verification code created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 } }
 *       400:
 *         description: |
 *           Validation error (missing/invalid field). Zod reports the generic message
 *           "Invalid input" with the specific issue in `content`; both become arrays when more
 *           than one field is invalid.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid input", statusCode: 400, content: { code: "invalid_type", expected: "boolean", received: "string", path: ["used"], message: "Expected boolean, received string" } }
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
 *     tags: [ChangePasswordVerificationCode]
 *     summary: List change password verification codes
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *       Paginated list with filtering, operators, sorting and pagination.
 *         - Equality filter:  `query[field]=value`            (e.g. query[used]=false)
 *         - Operator filter:  `query[field][operator]=value`  (e.g. query[expiresAt][gte]=2024-01-01T00:00:00.000Z)
 *       Operators by type — eq/ne/in/notIn: any; like/notLike: string;
 *       gt/gte/lt/lte: number|date|datetime; between/notBetween: number|date|datetime (two values);
 *       or: combines conditions.
 *     security:
 *       - bearerAuth: []
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
 *             example: { success: true, message: "Success!", statusCode: 200, content: { count: 1, records: [{ user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 }] } }
 *       400:
 *         description: Invalid filter, operator, or value type (e.g. an operator not supported by that field's type)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Unrecognized key(s) in object: 'gte'", statusCode: 400, content: { code: "unrecognized_keys", keys: ["gte"], path: ["code"], message: "Unrecognized key(s) in object: 'gte'" } }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /change_password_verification_code/{id}:
 *   get:
 *     tags: [ChangePasswordVerificationCode]
 *     summary: Get a change password verification code by id
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ChangePasswordVerificationCode ObjectId
 *       - in: query
 *         name: relations[user]
 *         schema: { type: boolean }
 *         description: Include the referenced User document instead of just its id
 *     responses:
 *       200:
 *         description: Change password verification code found
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 } }
 *       400:
 *         description: No change password verification code matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Change password verification code not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   put:
 *     tags: [ChangePasswordVerificationCode]
 *     summary: Replace a change password verification code
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
 *         description: ChangePasswordVerificationCode ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               code: { type: string }
 *               newPasswordHash: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *               attempts: { type: number }
 *           example: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 }
 *     responses:
 *       200:
 *         description: Change password verification code replaced
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: false, attempts: 0 } }
 *       400:
 *         description: Either a validation error (same shape as `POST /change_password_verification_code`), or no code matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Change password verification code not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   patch:
 *     tags: [ChangePasswordVerificationCode]
 *     summary: Update a change password verification code
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`. Partial update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ChangePasswordVerificationCode ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user: { type: string, description: "User ObjectId" }
 *               code: { type: string }
 *               newPasswordHash: { type: string }
 *               expiresAt: { type: string, format: date-time }
 *               used: { type: boolean }
 *               attempts: { type: number }
 *           example: { used: true }
 *     responses:
 *       200:
 *         description: Change password verification code updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: "64b0c0ffee1234567890abcd", code: "482913", newPasswordHash: "$2b$10$sample", expiresAt: "2024-01-01T00:00:00.000Z", used: true, attempts: 0 } }
 *       400:
 *         description: Either a validation error (same shape as `POST /change_password_verification_code`), or no code matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Change password verification code not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   delete:
 *     tags: [ChangePasswordVerificationCode]
 *     summary: Delete a change password verification code
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ChangePasswordVerificationCode ObjectId
 *     responses:
 *       200:
 *         description: Change password verification code deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { deletedCount: 1 } }
 *       400:
 *         description: No change password verification code matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Change password verification code not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 */
class Change_password_verification_codeRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	change_password_verification_codeController

	constructor() {
		this.change_password_verification_codeController = Change_password_verification_codeController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Change_password_verification_codeRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/change_password_verification_code',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.change_password_verification_codeController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.change_password_verification_codeController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.change_password_verification_codeController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.change_password_verification_codeController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.change_password_verification_codeController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.change_password_verification_codeController.remove }
			]
		}
	}
}

module.exports = Change_password_verification_codeRouter
