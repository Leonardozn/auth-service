const { HttpStatus, ErrorNames } = require('@auth-service/handle-errors')
const ResponseBody = {
	SUCCESS: 'success',
	MESSAGE: 'message',
	STATUS: 'statusCode',
	CONTENT: 'content'
}

/**
 * @typedef { Object } ResponseOk
 * @property { true } success   - Indicates success.
 * @property { string } message - Success message.
 * @property { number } status  - HTTP status code (2xx/3xx).
 * @property { Object } content - Payload when the operation succeeds.
 */

/**
 * @typedef { Object } ResponseError
 * @property { false } success  - Indicates failure.
 * @property { string } message - Corresponding error message.
 * @property { number } status  - HTTP status code (4xx/5xx).
 * @property { null } content   - No content when the operation fails.
 */

class HandleResponse {
	/**
	 * Builds a standardized example response for success or error.
	 * @param { number } status
	 * @returns { ResponseOk | ResponseError }
	 */
	getExampleResponseFormat(status) {
		if (status >= 400) {
			return {
				[ResponseBody.SUCCESS]: false,
				[ResponseBody.MESSAGE]: 'Corresponding error message.',
				[ResponseBody.STATUS]: status,
				[ResponseBody.CONTENT]: null
			}
		}

		return {
			[ResponseBody.SUCCESS]: true,
			[ResponseBody.MESSAGE]: 'Success!',
			[ResponseBody.STATUS]: status,
			[ResponseBody.CONTENT]: {}
		}
	}

	/**
	 * Builds a standardized response from either a payload or an Error.
	 * - If `data` is an Error, returns a ResponseError with message, status, and content derived from the error.
	 * - Otherwise, returns a ResponseOk with the given payload as `content`.
	 *
	 * @param { Error|Object } data - Error to serialize or payload to wrap in a success response.
	 * @returns { ResponseOk | ResponseError } Standardized response object.
	 */
	buildResponse(data) {
		if (data instanceof Error) {
			const statusCode = this.getStatusCode(data)
			const errorMessage = this.getErrorMessage(data)
			const errorContent = this.getErrorContent(data)

			return {
				[ResponseBody.SUCCESS]: false,
				[ResponseBody.MESSAGE]: errorMessage,
				statusCode,
				[ResponseBody.CONTENT]: errorContent
			}
		}

		return {
			[ResponseBody.SUCCESS]: true,
			[ResponseBody.MESSAGE]: 'Success!',
			[ResponseBody.STATUS]: HttpStatus.OK,
			[ResponseBody.CONTENT]: data
		}
	}

	/**
	 * @private
	 */
	getErrorContent(error) {
		if (error.isAxiosError) return error.response ? error.response.data : null

		if (error.name === ErrorNames.ZOD_ERROR) {
			const errors = []
			for (const item of error.errors) errors.push(this.findFirstDeepestObject(item))
			if (errors.length === 1) return errors[0]
			return errors
		}

		return null
	}

	/**
	 * @private
	 */
	getErrorMessage(error) {
		if (error.name === ErrorNames.ZOD_ERROR) {
			const messages = error.errors.map(el => el.message)
			if (messages.length === 1) return messages[0]
			return messages
		}

		if (this.isDuplicateKeyError(error)) return this.getDuplicateKeyMessage(error)

		// Errors thrown on purpose (our error classes set 'status') and Axios errors carry a
		// safe, intentional message; expose it. Any other error is unexpected (DB driver,
		// programming errors) and must not leak its raw message to the client.
		if (error.status || error.isAxiosError) return error.message || 'An error occurred'

		return 'An unexpected error occurred. Please try again later.'
	}

	/**
	 * @private
	 */
	getStatusCode(error) {
		if (error.isAxiosError) {
			return error.response && error.response.status ? error.response.status : HttpStatus.BAD_GATEWAY
		}

		if (error.status) return error.status
		if (error.name === ErrorNames.ZOD_ERROR) return HttpStatus.BAD_REQUEST
		if (this.isDuplicateKeyError(error)) return HttpStatus.BAD_REQUEST
		return HttpStatus.INTERNAL_SERVER
	}

	/**
	 * @private
	 * Detects a MongoDB duplicate key error (E11000), including the bulk-write shape.
	 */
	isDuplicateKeyError(error) {
		if (error.code === 11000 || error.code === 11001) return true
		if (Array.isArray(error.writeErrors)) return error.writeErrors.some(el => el && (el.code === 11000 || el.code === 11001))
		return false
	}

	/**
	 * @private
	 * Builds a clear, user-facing message from the duplicated field/value, without exposing
	 * the internal collection or index name.
	 */
	getDuplicateKeyMessage(error) {
		const keyValue = this.getDuplicateKeyValue(error)

		if (keyValue) {
			const fields = Object.keys(keyValue).map(field => field + " '" + keyValue[field] + "'")
			return 'A record with the same ' + fields.join(', ') + ' already exists.'
		}

		return 'A record with the same value already exists.'
	}

	/**
	 * @private
	 */
	getDuplicateKeyValue(error) {
		if (error.keyValue) return error.keyValue

		if (Array.isArray(error.writeErrors)) {
			const duplicate = error.writeErrors.find(el => el && (el.keyValue || (el.err && el.err.keyValue)))
			if (duplicate) return duplicate.keyValue || duplicate.err.keyValue
		}

		return null
	}

	/**
	 * @private
	 */
	findFirstDeepestObject(input) {
		let bestNode = input

		const walk = (node) => {
			if (!node || typeof node !== 'object') return
			if (Array.isArray(node.unionErrors) && node.unionErrors.length > 0) return walk(node.unionErrors[0])
			if (Array.isArray(node.errors) && node.errors.length > 0) return walk(node.errors[0])
			if ('message' in node) bestNode = node
		}

		walk(input)
		return bestNode
	}
}

module.exports = {
	ResponseBody,
	HandleResponse
}