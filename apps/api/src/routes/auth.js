const AuthController = require('../controllers/auth')

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: |
 *       Identity and session lifecycle - registration, login, token refresh/validation, logout,
 *       password change/recovery, and self-deactivation. This is the authentication protocol
 *       other services (e.g. cv-service) rely on: they forward the caller's access token to
 *       `POST /auth/validate` and trust the returned `user`/`role` for their own authorization.
 *
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Always assigns the default "user" Role - the client cannot influence it (see the RBAC hardening on `POST /user`, which requires an admin to set any other role).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string, description: 'Minimum 8 characters, at least one uppercase letter, one number, and one special character (!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~).' }
 *           example: { name: "Ada", email: "ada@example.com", password: "Sup3rSecret!" }
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 201, content: { user: { _id: "28ea21407ef7a29c2ffbe909", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abee", active: true } } }
 *       400:
 *         description: |
 *           The email is already registered, the password does not meet the required policy
 *           (minimum 8 characters, one uppercase letter, one number, one special character), or a
 *           validation error (missing/invalid field - Zod's generic "Invalid input" with the
 *           issue(s) in `content`; `message` and `content` become arrays when more than one field
 *           is invalid).
 *         content:
 *           application/json:
 *             example: { success: false, message: ["Invalid input", "Invalid input"], statusCode: 400, content: [{ code: "invalid_type", expected: "string", received: "undefined", path: ["email"], message: "Required" }, { code: "invalid_type", expected: "string", received: "undefined", path: ["password"], message: "Required" }] }
 *       500:
 *         description: Unexpected server error (e.g. the default "user" Role is not configured)
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in and start a session
 *     description: Issues a short-lived access token and a longer-lived refresh token, and persists a new Session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *           example: { email: "ada@example.com", password: "Sup3rSecret!" }
 *     responses:
 *       200:
 *         description: Session started
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { token: "006346a615917a6ed77e7e9275f558c9c6930bc40eecc44a84688bef1a8c0fdf", refreshToken: "34be8071b9418f401886512954e6c661c70aa10b01e74cf571494a5f7b630b19", user: { _id: "28ea21407ef7a29c2ffbe909", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abee", active: true } } }
 *       401:
 *         description: Email does not exist, or the password does not match
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid email or password.", statusCode: 401, content: null }
 *       403:
 *         description: The account has been deactivated
 *         content:
 *           application/json:
 *             example: { success: false, message: "Account is deactivated.", statusCode: 403, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate a session's tokens using its refresh token
 *     description: Never resubmits credentials - trades a still-valid refresh token for a brand-new access/refresh pair, persisted on the same Session.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *           example: { refreshToken: "34be8071b9418f401886512954e6c661c70aa10b01e74cf571494a5f7b630b19" }
 *     responses:
 *       200:
 *         description: Tokens rotated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { token: "705583ddc68c5d347bca61ee65623348b4ea0a1094d22e00a68a2ef01139a840", refreshToken: "5917fae55510cfd0049c3824099fee861ec1ddeafd3f95296f1015a809d7da13", user: { _id: "28ea21407ef7a29c2ffbe909", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abee", active: true } } }
 *       401:
 *         description: No session matches the given refresh token, or it has expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid or expired token.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/validate:
 *   post:
 *     tags: [Auth]
 *     summary: Validate an access token (base of the authentication protocol)
 *     description: |
 *       The contract every other service (e.g. cv-service) uses to authorize requests: forward
 *       the caller's access token here and trust the returned `user` - never decode the opaque
 *       token directly. `user.role` is the Role's name (e.g. "admin"/"user"), not its id.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *           example: { token: "705583ddc68c5d347bca61ee65623348b4ea0a1094d22e00a68a2ef01139a840" }
 *     responses:
 *       200:
 *         description: Token is valid and not expired
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { user: { _id: "28ea21407ef7a29c2ffbe909", name: "Ada", email: "ada@example.com", role: "admin", active: true } } }
 *       401:
 *         description: No session matches the given token, or it has expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid or expired token.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out and revoke the current session
 *     description: Idempotent - calling it twice (or after the session is already gone) still returns 200.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session revoked (or already gone)
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: null }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password change - step 1 of 2 (sends a verification code by email)
 *     description: |
 *       Verifies `currentPassword`, then emails a 6-digit verification code to the account's own
 *       address instead of applying the change immediately - confirm it with
 *       `POST /auth/change-password/verify` to actually update the password. The new password is
 *       pre-hashed and held on the pending record so it never needs to be resent. Requesting a new
 *       code invalidates any previous still-pending one for the account. The code expires after
 *       `CHANGE_PASSWORD_CODE_DEFAULT_TIME` and accepts at most `CHANGE_PASSWORD_CODE_MAX_ATTEMPTS`
 *       wrong guesses before it must be requested again.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, description: 'Minimum 8 characters, at least one uppercase letter, one number, and one special character (!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~).' }
 *           example: { currentPassword: "Sup3rSecret!", newPassword: "NewSecret1!" }
 *     responses:
 *       200:
 *         description: Verification code sent to the account's email - the password has not changed yet
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: null }
 *       400:
 *         description: The new password does not meet the required policy
 *         content:
 *           application/json:
 *             example: { success: false, message: "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character (...).", statusCode: 400, content: null }
 *       401:
 *         description: Missing/malformed/expired Authorization header, or `currentPassword` does not match
 *         content:
 *           application/json:
 *             example: { success: false, message: "Current password does not match.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error (includes a failure to send the verification email)
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/change-password/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Confirm a password change - step 2 of 2 (verifies the emailed code)
 *     description: |
 *       Consumes the 6-digit code emailed by `POST /auth/change-password`, applies the pending
 *       (already-hashed) new password, and revokes every other session for the account, keeping
 *       the current one alive. A wrong code counts as a failed attempt; once
 *       `CHANGE_PASSWORD_CODE_MAX_ATTEMPTS` is reached the pending code is invalidated and a new
 *       one must be requested via `POST /auth/change-password`.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *           example: { code: "482913" }
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: null }
 *       400:
 *         description: No pending password change for this account, or the code is invalid/expired
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid or expired verification code.", statusCode: 400, content: null }
 *       401:
 *         description: Missing/malformed/expired Authorization header, or the submitted code does not match (counts as a failed attempt)
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid verification code.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset email
 *     description: |
 *       Always responds 200 with `content: null`, whether or not the email exists - this
 *       endpoint must never reveal account existence. A delivery failure from the email
 *       provider (Resend) is also swallowed and still returns 200.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *           example: { email: "ada@example.com" }
 *     responses:
 *       200:
 *         description: Request accepted (regardless of whether the email exists)
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset a password using a recovery token
 *     description: Consumes a single-use `PasswordResetToken` and revokes every active session for the account (the caller isn't authenticated at this point, so there's no "current session" to keep alive).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token: { type: string }
 *               newPassword: { type: string, description: 'Minimum 8 characters, at least one uppercase letter, one number, and one special character (!"#$%&''()*+,-./:;<=>?@[\]^_`{|}~).' }
 *           example: { token: "a1b2c3...", newPassword: "NewSecret1!" }
 *     responses:
 *       200:
 *         description: Password reset
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: null }
 *       400:
 *         description: The token does not exist, was already used, or has expired, or the new password does not meet the required policy
 *         content:
 *           application/json:
 *             example: { success: false, message: "Invalid or expired reset token.", statusCode: 400, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 *
 * /auth/deactivate:
 *   post:
 *     tags: [Auth]
 *     summary: Deactivate the caller's own account
 *     description: |
 *       Always acts on the caller's own account (no `:id`) - an admin deactivating someone else
 *       uses `PATCH /user/{id}` with `{ active: false }` instead. Sets `User.active = false` and
 *       revokes every Session and PasswordResetToken for the account in one transaction.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             example: { success: true, message: "Success!", statusCode: 200, content: { _id: "28ea21407ef7a29c2ffbe909", name: "Ada", email: "ada@example.com", role: "64b0c0ffee1234567890abee", active: false } }
 *       401:
 *         description: Missing or malformed Authorization header
 *         content:
 *           application/json:
 *             example: { success: false, message: "Missing or malformed Authorization header.", statusCode: 401, content: null }
 *       500:
 *         description: Unexpected server error
 *         content: { application/json: { example: { success: false, message: "An error occurred", statusCode: 500, content: null } } }
 */
class AuthRouter {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	authController

	constructor() {
		this.authController = AuthController.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new AuthRouter()
		return this.instance
	}

	getRoutes() {
		return {
			modelPath: '/auth',
			paths: [
				{ requestMethod: 'post', path: '/register', controllerMethod: this.authController.register },
				{ requestMethod: 'post', path: '/login', controllerMethod: this.authController.login },
				{ requestMethod: 'post', path: '/refresh', controllerMethod: this.authController.refresh },
				{ requestMethod: 'post', path: '/validate', controllerMethod: this.authController.validate },
				{ requestMethod: 'post', path: '/logout', controllerMethod: this.authController.logout },
				{ requestMethod: 'post', path: '/change-password', controllerMethod: this.authController.changePassword },
				{ requestMethod: 'post', path: '/change-password/verify', controllerMethod: this.authController.verifyChangePassword },
				{ requestMethod: 'post', path: '/forgot-password', controllerMethod: this.authController.forgotPassword },
				{ requestMethod: 'post', path: '/reset-password', controllerMethod: this.authController.resetPassword },
				{ requestMethod: 'post', path: '/deactivate', controllerMethod: this.authController.deactivate }
			]
		}
	}
}

module.exports = AuthRouter
