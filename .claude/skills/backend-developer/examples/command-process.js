/**
 * Example: MULTI-MODEL process implemented as an exclusive service, structured
 * into steps (commands). Each step is a single-method class in services/commands/,
 * and the main process method only orchestrates.
 *
 * Suggested file structure:
 *
 *   apps/api/src/services/checkout.js                 <- process service
 *   apps/api/src/services/commands/createDataModel.js <- reusable step
 *   apps/api/src/services/commands/attachSubModels.js <- reusable step
 *
 * Rules applied:
 *  - arch-service-granularity: multi-model process => exclusive service.
 *  - arch-command-steps: one step = one class = one method, in commands/.
 *  - proc-reuse-commands: generic commands (dependencies as parameters).
 *  - arch-contract-filtering: each model in the response filtered with its contract.
 *  - code-luxon-dates: dates with luxon via data-validator, zone=utc.
 */

// =========================================================================
// services/commands/createDataModel.js
// =========================================================================
class CreateDataModel {
	static getInstance() {
		if (!this.instance) this.instance = new CreateDataModel()
		return this.instance
	}

	// single method = the step. Receives dependencies as parameters => reusable.
	async execute({ repository, data, options = {} }) {
		return await repository.add('data_model', { data, options })
	}
}
// module.exports = CreateDataModel

// =========================================================================
// services/commands/attachSubModels.js
// =========================================================================
class AttachSubModels {
	static getInstance() {
		if (!this.instance) this.instance = new AttachSubModels()
		return this.instance
	}

	async execute({ repository, dataModelId, subModelsData = [] }) {
		const created = []
		for (const subData of subModelsData) {
			const sub = await repository.add('sub_data_model', { data: { ...subData, data_model: dataModelId } })
			created.push(sub)
		}
		return created
	}
}
// module.exports = AttachSubModels

// =========================================================================
// services/checkout.js  (service EXCLUSIVE to the process)
// =========================================================================
const Repository = require('../repositories')
const Data_modelService = require('./data_model')
const Sub_data_modelService = require('./sub_data_model')
const DataValidatorHandler = require('../handlers/dataValidator')
// const CreateDataModel = require('./commands/createDataModel')
// const AttachSubModels = require('./commands/attachSubModels')

class CheckoutService {
	constructor() {
		this.repository = Repository.getInstance()
		this.data_modelService = Data_modelService.getInstance()
		this.sub_data_modelService = Sub_data_modelService.getInstance()

		this.createDataModel = CreateDataModel.getInstance()
		this.attachSubModels = AttachSubModels.getInstance()

		// luxon through the data-validator handler
		this.luxon = DataValidatorHandler.getInstance().getLuxon()
	}

	static getInstance() {
		if (!this.instance) this.instance = new CheckoutService()
		return this.instance
	}

	// The main process reads as the sequence of steps
	async execute(config = {}) {
		const { DateTime } = this.luxon

		// Step 0: process data (date in UTC)
		const processedAt = DateTime.now().setZone('utc').toISO()

		// Step 1: create the main model
		const data_model = await this.createDataModel.execute({
			repository: this.repository,
			data: { ...config.data, arrival: processedAt }
		})

		// Step 2: attach the sub-models
		const subModels = await this.attachSubModels.execute({
			repository: this.repository,
			dataModelId: data_model._id,
			subModelsData: config.subModels
		})

		// The response contains TWO models => filter EACH one with its contract
		return {
			data_model: this.data_modelService.applayContract(data_model),
			sub_data_models: this.sub_data_modelService.applayContract(subModels)
		}
	}
}

module.exports = CheckoutService
