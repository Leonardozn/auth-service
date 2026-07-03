const FileManager = require('@auth-service/file-manager')

class FileManagerHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	fileManager

	/**
	 * @private
	 */
	constructor() {
		this.fileManager = new FileManager({}, 'api')
	}

	static getInstance() {
		if (!this.instance) this.instance = new FileManagerHandler()
		return this.instance
	}

	getMiddleware() {
		return this.fileManager.getMiddleware()
	}

	getProvider() {
		return this.fileManager.getProvider()
	}
}

module.exports = FileManagerHandler
