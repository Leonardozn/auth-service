const HandleResponseHandler = require('../handlers/handleResponse')

class HealthController {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	handleResponseHandler

	/**
	 * @private
	 */
	responseBody

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.health = this.health.bind(this)
	}

	static getInstance() {
		if (!this.instance) this.instance = new HealthController()
		return this.instance
	}

	health(req, res) {
		try {
			const response = this.handleResponseHandler.buildResponse({ data: 'Ok' })

			res.status(response[this.responseBody.STATUS]).json(response)
		} catch (error) {
			console.error(error)
			const response = this.handleResponseHandler.buildResponse(error)

			res.status(response[this.responseBody.STATUS]).json(response)
		}
	}
}

module.exports = HealthController