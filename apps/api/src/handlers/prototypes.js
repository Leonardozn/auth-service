const Prototypes = require('@auth-service/prototypes')

class PrototypesHandler {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	prototypes

	/**
	 * @private
	 */
	constructor() {
		this.prototypes = new Prototypes()
	}

	static getInstance() {
		if (!this.instance) this.instance = new PrototypesHandler()
		return this.instance
	}

	setCapitalize() {
		this.prototypes.setCapitalize()
	}
}

module.exports = PrototypesHandler