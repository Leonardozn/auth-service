const UserController = require('../controllers/user')

/**
 * @openapi
 * tags:
 *   - name: User
 *     description: |
 *       User account records. `POST`/`PUT` create/replace a user directly and accept every
 *       field, including `role` - assigning a `role` through either of them requires an
 *       authenticated admin session, to prevent a caller from self-escalating privileges.
 *       Self-service registration goes through `POST /auth/register` instead (always assigns
 *       the default "user" role, no admin needed). `PATCH` is wired to account management
 *       (edit own profile, or an admin editing anyone) and never accepts `role` or `password`.
 *
 * /user:
 *   post:
 *     tags: [User]
 *     summary: Create a user
 *     description: |
 *       Every field is optional at the schema level. Omitting `role` creates the record with
 *       no role and needs no authentication. Including `role` requires
 *       `Authorization: Bearer <admin access token>` - the caller's session must belong to a
 *       user whose Role is named "admin", otherwise the request is rejected before the record
 *       is created.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, description: "Role ObjectId - admin-only to set" }
 *               active: { type: boolean }
 *           example: { name: "Carl", email: "carl@example.com", password: "Sup3rSecret!", role: "64b0c0ffee1234567890abcd", active: true }
 *     responses:
 *       200:
 *         description: User created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { _id: "5c94de2b1528d67de50e47b1", name: "Carl", email: "carl@example.com", role: "64b0c0ffee1234567890abcd", active: true } }
 *       400:
 *         description: |
 *           Validation error (missing/invalid field). Zod reports the generic message
 *           "Invalid input" with the specific issue in `content`; both become arrays when more
 *           than one field is invalid.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid input", statusCode: 400, content: { code: "invalid_type", expected: "string", received: "number", path: ["name"], message: "Expected string, received number" } }
 *       401:
 *         description: A `role` was submitted but the Authorization header is missing or malformed.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       403:
 *         description: A `role` was submitted but the caller's session does not belong to an admin.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Not authorized to perform this action.", statusCode: 403, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   get:
 *     tags: [User]
 *     summary: List users
 *     description: |
 *       Paginated list with filtering, operators, sorting and pagination.
 *         - Equality filter:  `query[field]=value`            (e.g. query[name]=Ada)
 *         - Operator filter:  `query[field][operator]=value`  (e.g. query[active][eq]=true)
 *       Operators by type — eq/ne/in/notIn: any; like/notLike: string;
 *       gt/gte/lt/lte: number|date|datetime; between/notBetween: number|date|datetime (two values);
 *       or: combines conditions. `gt/gte/lt/lte/between/notBetween` are not valid on `name`/`email`/`role`
 *       (string/objectId fields) and return the 400 shown below.
 *     parameters:
 *       - in: query
 *         name: query[field]
 *         schema: { type: string }
 *         description: Equality filter, e.g. `query[name]=Ada`
 *       - in: query
 *         name: query[field][operator]
 *         schema: { type: string }
 *         description: Operator filter, e.g. `query[active][eq]=true`
 *       - in: query
 *         name: sort[field]
 *         schema: { type: integer, enum: [1, -1] }
 *         description: Sort ascending (1) or descending (-1), e.g. `sort[name]=-1`
 *       - in: query
 *         name: size
 *         schema: { type: integer }
 *         description: Records per page
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: 1-based page number
 *       - in: query
 *         name: relations[role]
 *         schema: { type: boolean }
 *         description: Include the referenced Role document instead of just its id
 *     responses:
 *       200:
 *         description: List retrieved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { count: 1, records: [{ _id: "64b0c0ffee1234567890abcf", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abcd", active: true }] } }
 *       400:
 *         description: Invalid filter, operator, or value type (e.g. an operator not supported by that field's type)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Unrecognized key(s) in object: 'gte'", statusCode: 400, content: { code: "unrecognized_keys", keys: ["gte"], path: ["name"], message: "Unrecognized key(s) in object: 'gte'" } }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /user/{id}:
 *   get:
 *     tags: [User]
 *     summary: Get a user by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ObjectId
 *       - in: query
 *         name: relations[role]
 *         schema: { type: boolean }
 *         description: Include the referenced Role document instead of just its id
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { _id: "64b0c0ffee1234567890abcf", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abcd", active: true } }
 *       400:
 *         description: No user matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "User not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   put:
 *     tags: [User]
 *     summary: Replace a user
 *     description: |
 *       Full replace - fields omitted from the body are cleared, not left untouched. Just like
 *       `POST /user`, including `role` in the body requires an admin session
 *       (`Authorization: Bearer <admin access token>`); omitting it needs no authentication.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, description: "Role ObjectId - admin-only to set" }
 *               active: { type: boolean }
 *           example: { name: "Ada Updated", email: "ada@example.com", password: "x", role: "64b0c0ffee1234567890abcd", active: true }
 *     responses:
 *       200:
 *         description: User replaced
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { _id: "64b0c0ffee1234567890abcf", name: "Ada Updated", email: "ada@example.com", role: "64b0c0ffee1234567890abcd", active: true } }
 *       400:
 *         description: |
 *           Either a validation error (same "Invalid input" shape as `POST /user`), or no user
 *           matches the given id.
 *         content:
 *           application/json:
 *             example: { success: false, message: "User not found.", statusCode: 400, content: null }
 *       401:
 *         description: A `role` was submitted but the Authorization header is missing or malformed.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       403:
 *         description: A `role` was submitted but the caller's session does not belong to an admin.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Not authorized to perform this action.", statusCode: 403, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   patch:
 *     tags: [User]
 *     summary: Edit profile (self, or an admin on anyone)
 *     description: |
 *       Not a plain field update - wired to account management. Accepts only `name`, `email`,
 *       `active` (never `password` or `role`). Requires `Authorization: Bearer <access token>`.
 *       The caller must either be the account's own owner, or a user whose Role is "admin" to
 *       act on someone else. `active` changes are silently ignored unless the caller is an
 *       admin (self-deactivation goes through `POST /auth/deactivate` instead, which also
 *       revokes sessions).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               active: { type: boolean, description: "Admin-only - ignored when the caller is editing their own account" }
 *           example: { name: "Ada Self" }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { _id: "64b0c0ffee1234567890abcf", name: "Ada Self", email: "ada@example.com", role: "64b0c0ffee1234567890abcd", active: true } }
 *       400:
 *         description: The new email is already taken by a different user
 *         content:
 *           application/json:
 *             example: { success: false, message: "This email is already registered.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header, or the access token is invalid/expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       403:
 *         description: The caller is neither the account's own owner nor an admin
 *         content:
 *           application/json:
 *             example: { success: false, message: "Not authorized to access this account.", statusCode: 403, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   delete:
 *     tags: [User]
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: User ObjectId
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { deletedCount: 1 } }
 *       400:
 *         description: No user matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "User not found.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 */
class UserRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	userController

	constructor() {
		this.userController = UserController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/user',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.userController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.userController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.userController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.userController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.userController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.userController.remove }
			]
		}
	}
}

module.exports = UserRouter