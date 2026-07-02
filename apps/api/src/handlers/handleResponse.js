const { ResponseBody, HandleResponse } = require('@auth-service/handle-response')

class HandleResponseHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	handleResponse

	/**
	 * @private
	 */
	constructor() {
		this.handleResponse = new HandleResponse()
	}

	static getInstance() {
		if (!this.instance) this.instance = new HandleResponseHandler()
		return this.instance
	}

	getResponseBody() {
		return ResponseBody
	}

	getExampleResponseFormat(status) {
		return this.handleResponse.getExampleResponseFormat(status)
	}

	buildResponse(data) {
		return this.handleResponse.buildResponse(data)
	}
}

module.exports = HandleResponseHandler