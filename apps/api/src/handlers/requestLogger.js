const { RequestLogger, modes } = require('@auth-service/request-logger')

class RequestLoggerHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	modes

	/**
	 * @private
	 */
	requestLogger

	/**
	 * @private
	 */
	constructor() {
		this.modes = modes
		this.requestLogger = new RequestLogger()
	}

	static getInstance() {
		if (!this.instance) this.instance = new RequestLoggerHandler()
		return this.instance
	}

	getModes() {
		return this.modes
	}

	getLogger(mode) {
		return this.requestLogger.getLogger(mode)
	}
}

module.exports = RequestLoggerHandler