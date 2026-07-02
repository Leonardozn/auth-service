class Contracts {
	/**
	 * @private
	 * @static
	 */
	instance

	/**
	 * @private
	 */
	omitSymbol = Symbol('omit')

	static getInstance() {
		if (!this.instance) this.instance = new Contracts()
		return this.instance
	}

	applyContract(contract, payload) {
		if (contract === undefined || payload === undefined) {
			throw new Error('Both contract and payload are required.')
		}

		if (!this.isJsonObject(contract)) throw new Error('contract must be a json object.')
		if (!this.isJsonObject(payload)) throw new Error('payload must be a json object.')
		if (!this.isValidContract(contract)) throw new Error('contract has an invalid format.')

		const result = this.filterWithContract(contract, payload)
		if (result === this.omitSymbol) return {}
		return result
	}

	/**
	 * @private
	 */
	isJsonObject(value) {
		return !!value && typeof value === 'object' && !Array.isArray(value)
	}

	/**
	 * @private
	 */
	isNodeDisabled(node) {
		if (node === false) return true
		if (node === true) return false

		if (Array.isArray(node)) {
			if (!node.length) return true
			return this.isNodeDisabled(node[0])
		}

		if (!this.isJsonObject(node)) return true

		const keys = Object.keys(node)
		if (!keys.length) return true

		for (const key of keys) {
			if (!this.isNodeDisabled(node[key])) return false
		}

		return true
	}

	/**
	 * @private
	 */
	isValidContract(node) {
		if (node === true || node === false) return true

		if (Array.isArray(node)) {
			if (node.length !== 1) return false
			return this.isValidContract(node[0])
		}

		if (!this.isJsonObject(node)) return false

		const keys = Object.keys(node)
		if (!keys.length) return false

		for (const key of keys) {
			if (!this.isValidContract(node[key])) return false
		}

		return true
	}

	/**
	 * @private
	 */
	filterWithContract(contractNode, payloadNode) {
		if (this.isNodeDisabled(contractNode)) return this.omitSymbol

		if (contractNode === true) return payloadNode

		if (Array.isArray(contractNode)) {
			if (!Array.isArray(payloadNode)) return this.omitSymbol

			const nodeContract = contractNode[0]
			if (nodeContract === true) return payloadNode

			const filteredArray = []
			for (const item of payloadNode) {
				const filteredItem = this.filterWithContract(nodeContract, item)
				if (filteredItem !== this.omitSymbol) filteredArray.push(filteredItem)
			}

			return filteredArray
		}

		if (!this.isJsonObject(payloadNode)) return this.omitSymbol

		const filteredObject = {}
		for (const key of Object.keys(contractNode)) {
			if (!Object.prototype.hasOwnProperty.call(payloadNode, key)) continue

			const filteredValue = this.filterWithContract(contractNode[key], payloadNode[key])
			if (filteredValue !== this.omitSymbol) filteredObject[key] = filteredValue
		}

		return filteredObject

  }
}

module.exports = Contracts