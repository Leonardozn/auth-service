const RoleController = require('../controllers/role')

/**
 * @openapi
 * tags:
 *   - name: Role
 *     description: |
 *       Platform-wide RBAC roles (e.g. "user", "admin"). Every mutation (create, replace,
 *       update, delete) requires an authenticated admin session, unconditionally - there is no
 *       self-service or ownership concept for a Role. Reading (`GET`) only requires being
 *       authenticated, any role. `permissions` is a single, global catalog shared by every
 *       microservice that consumes this auth-service - `resource` is free text each consumer
 *       defines on its own (auth-service never interprets it), and `read`/`write` are checked by
 *       `POST /auth/validate` when a consumer passes `resource`/`action`. No role gets an
 *       implicit bypass (not even "admin") - authorization is entirely data-driven from this list.
 *
 * /role:
 *   post:
 *     tags: [Role]
 *     summary: Create a role
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>` - the caller's session must
 *       belong to a user whose Role is named "admin".
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               active: { type: boolean }
 *               maxSessions: { type: integer, description: "Max concurrent Sessions users with this role may hold. Omitted or <= 0 means unlimited - on login, the oldest session is evicted once the limit is reached." }
 *               permissions:
 *                 type: array
 *                 description: "Global resource-permission catalog for this role, shared by every microservice. `resource` is free text (each consumer defines its own names); `read`/`write` default to falsy when omitted."
 *                 items:
 *                   type: object
 *                   required: [resource]
 *                   properties:
 *                     resource: { type: string }
 *                     read: { type: boolean }
 *                     write: { type: boolean }
 *           example: { name: "contributor", active: true, maxSessions: 3, permissions: [{ resource: "curriculum", read: true, write: false }] }
 *     responses:
 *       200:
 *         description: Role created
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { name: "contributor", active: true, maxSessions: 3, permissions: [{ resource: "curriculum", read: true, write: false }] } }
 *       400:
 *         description: |
 *           Validation error (missing/invalid field). Zod reports the generic message
 *           "Invalid input" with the specific issue in `content`; both become arrays when more
 *           than one field is invalid.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid input", statusCode: 400, content: { code: "invalid_type", expected: "string", received: "number", path: ["name"], message: "Expected string, received number" } }
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
 *     tags: [Role]
 *     summary: List roles
 *     description: |
 *       Requires `Authorization: Bearer <access token>` - any authenticated role can list roles.
 *       Paginated list with filtering, operators, sorting and pagination.
 *         - Equality filter:  `query[field]=value`            (e.g. query[name]=admin)
 *         - Operator filter:  `query[field][operator]=value`  (e.g. query[active][eq]=true)
 *       Operators by type — eq/ne/in/notIn: any; like/notLike: string;
 *       gt/gte/lt/lte: number|date|datetime; between/notBetween: number|date|datetime (two values);
 *       or: combines conditions. `gt/gte/lt/lte/between/notBetween` are not valid on `name`
 *       (a string field) and return the 400 shown below.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query[field]
 *         schema: { type: string }
 *         description: Equality filter, e.g. `query[name]=admin`
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
 *     responses:
 *       200:
 *         description: List retrieved
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { count: 1, records: [{ name: "editor", active: true, permissions: [{ resource: "curriculum", read: true, write: false }] }] } }
 *       400:
 *         description: Invalid filter, operator, or value type (e.g. an operator not supported by that field's type)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Unrecognized key(s) in object: 'gte'", statusCode: 400, content: { code: "unrecognized_keys", keys: ["gte"], path: ["name"], message: "Unrecognized key(s) in object: 'gte'" } }
 *       401:
 *         description: Missing or malformed Authorization header, or the access token is invalid/expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /role/{id}:
 *   get:
 *     tags: [Role]
 *     summary: Get a role by id
 *     description: |
 *       Requires `Authorization: Bearer <access token>` - any authenticated role can read a role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Role ObjectId
 *     responses:
 *       200:
 *         description: Role found
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { name: "editor", active: true, permissions: [{ resource: "curriculum", read: true, write: false }] } }
 *       400:
 *         description: No role matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Role not found.", statusCode: 400, content: null }
 *       401:
 *         description: Missing or malformed Authorization header, or the access token is invalid/expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *   put:
 *     tags: [Role]
 *     summary: Replace a role
 *     description: |
 *       Full replace - fields omitted from the body are cleared, not left untouched. Requires
 *       `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Role ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               active: { type: boolean }
 *               maxSessions: { type: integer, description: "Max concurrent Sessions users with this role may hold. Omitted or <= 0 means unlimited - on login, the oldest session is evicted once the limit is reached." }
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [resource]
 *                   properties:
 *                     resource: { type: string }
 *                     read: { type: boolean }
 *                     write: { type: boolean }
 *           example: { name: "editor-put", active: true, maxSessions: 3, permissions: [{ resource: "curriculum", read: true, write: true }] }
 *     responses:
 *       200:
 *         description: Role replaced
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { name: "editor-put", active: true, maxSessions: 3, permissions: [{ resource: "curriculum", read: true, write: true }] } }
 *       400:
 *         description: |
 *           Either a validation error (same "Invalid input" shape as `POST /role`), or no role
 *           matches the given id.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Role not found.", statusCode: 400, content: null }
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
 *   patch:
 *     tags: [Role]
 *     summary: Update a role
 *     description: |
 *       Partial update. Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Role ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               active: { type: boolean }
 *               maxSessions: { type: integer, description: "Max concurrent Sessions users with this role may hold. Omitted or <= 0 means unlimited - on login, the oldest session is evicted once the limit is reached." }
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     resource: { type: string }
 *                     read: { type: boolean }
 *                     write: { type: boolean }
 *           example: { permissions: [{ resource: "curriculum", read: true, write: true }] }
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { name: "editor-updated", active: true, permissions: [{ resource: "curriculum", read: true, write: true }] } }
 *       400:
 *         description: |
 *           Either a validation error (same "Invalid input" shape as `POST /role`), or no role
 *           matches the given id.
 *         content:
 *           application/json:
 *             example: { success: false, message: "Role not found.", statusCode: 400, content: null }
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
 *   delete:
 *     tags: [Role]
 *     summary: Delete a role
 *     description: |
 *       Requires `Authorization: Bearer <admin access token>`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Role ObjectId
 *     responses:
 *       200:
 *         description: Role deleted
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { deletedCount: 1 } }
 *       400:
 *         description: No role matches the given id
 *         content:
 *           application/json:
 *             example: { success: false, message: "Role not found.", statusCode: 400, content: null }
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
 */
class RoleRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	roleController

	constructor() {
		this.roleController = RoleController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new RoleRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/role',
			paths: [
				{ requestMethod: 'post', path: '', controllerMethod: this.roleController.add },
				{ requestMethod: 'get', path: '/:id', controllerMethod: this.roleController.findOne },
				{ requestMethod: 'get', path: '', controllerMethod: this.roleController.list },
				{ requestMethod: 'put', path: '/:id', controllerMethod: this.roleController.replace },
				{ requestMethod: 'patch', path: '/:id', controllerMethod: this.roleController.update },
				{ requestMethod: 'delete', path: '/:id', controllerMethod: this.roleController.remove }
			]
		}
	}
}

module.exports = RoleRouter