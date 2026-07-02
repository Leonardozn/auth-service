const HttpStatus = {
	OK: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER: 500,
	BAD_GATEWAY: 502
}

const ErrorNames = {
	ZOD_ERROR: 'ZodError',
	BAD_REQUEST_ERROR: 'BadRequestError',
	UNAUTHORIZED_ERROR: 'UnauthorizedError',
	FORBIDDEN_ERROR: 'ForbiddenError',
	NOT_FOUND_ERROR: 'NotFoundError',
	INTERNAL_SERVER_ERROR: 'InternalServerError'
}

class BadRequestError extends Error {
	/**
	 * @param {string} message - Error message
	 */
	 constructor(message='Bad request error.') {
		super(message)
		this.name = ErrorNames.BAD_REQUEST_ERROR
		this.status = HttpStatus.BAD_REQUEST
	}
}

class UnauthorizedError extends Error {
	/**
	 * @param {string} message - Error message
	 */
	constructor(message='Unauthorized error.') {
		super(message)
		this.name = ErrorNames.UNAUTHORIZED_ERROR
		this.status = HttpStatus.UNAUTHORIZED
	}
}

class ForbiddenError extends Error {
	/**
	 * @param {string} message - Error message
	 */
	constructor(message='Forbidden error.') {
		super(message)
		this.name = ErrorNames.FORBIDDEN_ERROR
		this.status = HttpStatus.FORBIDDEN
	}
}

class NotFoundError extends Error {
	/**
	 * @param {string} message - Error message
	 */
	constructor(message='Not found error.') {
		super(message)
		this.name = ErrorNames.NOT_FOUND_ERROR
		this.status = HttpStatus.NOT_FOUND
	}
}

class InternalServerError extends Error {
	/**
	 * @param {string} message - Error message
	 */
	constructor(message='Internal error.') {
		super(message)
		this.name = ErrorNames.INTERNAL_SERVER_ERROR
		this.status = HttpStatus.INTERNAL_SERVER
	}
}

module.exports ={
	HttpStatus,
	ErrorNames,
	BadRequestError,
	UnauthorizedError,
	ForbiddenError,
	NotFoundError,
	InternalServerError
}