const Repository = require('../repositories')
const Contract = require('../contracts')
const Password_reset_tokenInterfaces = require('../interfaces/password_reset_token')
const Password_reset_tokenContract = require('../contracts/password_reset_token')
const HandleResponseHandler = require('../handlers/handleResponse')
const DataValidatorHandler = require('../handlers/dataValidator')
const { BadRequestError } = require('../handlers/handleErrors')
const FileManagerHandler = require('../handlers/fileManager')
const path = require('path')
const crypto = require('crypto')
const envVariables = require('../handlers/envVariables')
const ExtractBearerToken = require('./commands/extractBearerToken')
const FindSessionByToken = require('./commands/findSessionByToken')
const RequireAdminUser = require('./commands/requireAdminUser')

class Password_reset_tokenService {
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
	password_reset_tokenInterface

	/**
	 * @private
	 */
	password_reset_tokenContract

	/**
	 * @private
	 */
	repository

	/**
	 * @private
	 */
	contract

	constructor() {
		this.handleResponseHandler = HandleResponseHandler.getInstance()
		this.responseBody = this.handleResponseHandler.getResponseBody()

		this.password_reset_tokenInterface = Password_reset_tokenInterfaces.getInstance()
		this.password_reset_tokenContract = Password_reset_tokenContract.getInstance()
		this.repository = Repository.getInstance()
		this.contract = Contract.getInstance()

		this.fileManagerHandler = FileManagerHandler.getInstance()
		this.storageProvider = this.fileManagerHandler.getProvider()

		this.luxon = DataValidatorHandler.getInstance().getLuxon()
		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.requireAdminUser = RequireAdminUser.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new Password_reset_tokenService()
		return this.instance
	}

	async add(config = {}) {
		const { body, files = [], options = {}, authorizationHeader } = config
		const payload = Array.isArray(body) ? [...body] : { ...body }

		// 1. Password reset tokens are an internal recovery record - only an admin may create one directly
		await this._requireAdminSession(authorizationHeader)

		// 2. Initial creation
		const unflattenedBody = Array.isArray(payload) ? payload.map(p => this._unflatten(p)) : this._unflatten(payload)
		const data = Array.isArray(unflattenedBody)
			? unflattenedBody.map(el => this.password_reset_tokenInterface.getCreateInterface().parse(el))
			: this.password_reset_tokenInterface.getCreateInterface().parse(unflattenedBody)
		
		let password_reset_token = await this.repository.add('password_reset_token', { data, options })

		// 3. Handle files if present
		if (files && files.length) {
			const password_reset_tokenId = Array.isArray(password_reset_token) ? password_reset_token[0]._id : password_reset_token._id
			const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `password_reset_token-${crypto.randomUUID()}-${originalName}`
					
					const savedFileUrl = await this.storageProvider.saveFile(file, newFilename)
					savedFiles.push(savedFileUrl)

					// Accumulate into array if multiple files share the same fieldname
					if (fieldPath in updates) {
						updates[fieldPath] = Array.isArray(updates[fieldPath])
							? [...updates[fieldPath], savedFileUrl]
							: [updates[fieldPath], savedFileUrl]
					} else {
						updates[fieldPath] = savedFileUrl
					}
				}

				if (Object.keys(updates).length > 0) {
					password_reset_token = await this.repository.update('password_reset_token', { id: password_reset_tokenId, data: updates, options })
				}
			} catch (err) {
				for (const url of savedFiles) {
					await this.storageProvider.deleteFile(url, destinationPath).catch(() => {})
				}
				throw err
			}
		}

		return this.applayContract(password_reset_token)
	}
	
	async findOne(config = {}) {
		const { id, authorizationHeader, skipAuthCheck = false } = config

		// 1. Password reset tokens are an internal recovery record - only an admin may read one
		// directly (skipped for internal reuse: update/replace/remove re-reading the record they
		// already authenticated for)
		if (!skipAuthCheck) await this._requireAdminSession(authorizationHeader)

		let virtuals = {}
		let relations = {}
		const query = this.password_reset_tokenInterface.getQueryInterface().parse({ _id: id, ...config.query?.query })
		if (config.query?.virtuals) virtuals = this.password_reset_tokenInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.password_reset_tokenInterface.getRelationsInterface().parse(config.query.relations)
		const options = config.options || {}

		const result = await this.repository.list('password_reset_token', { query, virtuals, relations, options })
		const password_reset_token = result.records[0]
		if (!password_reset_token) throw new BadRequestError('Password reset token not found.')
		
		return this.applayContract(password_reset_token)
	}
	
	async list(config = {}) {
		// 1. Password reset tokens are an internal recovery record - only an admin may list them
		await this._requireAdminSession(config.authorizationHeader)

		let query = {}
		let virtuals = {}
		let relations = {}
		if (config.query?.query) query = this.password_reset_tokenInterface.getQueryInterface().parse(config.query.query)
		if (config.query?.virtuals) virtuals = this.password_reset_tokenInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.password_reset_tokenInterface.getRelationsInterface().parse(config.query.relations)
		const size = config.query?.size ? Number(config.query.size) : null
		const page = config.query?.page ? Number(config.query.page) : null
		const sort = config.query?.sort || {}
		const options = config.options || {}

		const password_reset_token_list = await this.repository.list('password_reset_token', { query, virtuals, relations, size, page, sort, options })
		password_reset_token_list.records = this.applayContract(password_reset_token_list.records)
		return password_reset_token_list
	}
	
	async update(config = {}) {
		const { body, id, files = [], options = {}, authorizationHeader } = config

		// 1. Password reset tokens are an internal recovery record - only an admin may edit one directly
		await this._requireAdminSession(authorizationHeader)

		const data = this._unflatten(body)
		const existingPassword_reset_token = await this.findOne({ id, skipAuthCheck: true })
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')

		// 2. Initial update with JSON data
		const payload = this.password_reset_tokenInterface.getUpdateInterface().parse(data)
		let password_reset_token = await this.repository.update('password_reset_token', { id, data: payload, options })

		const existingObj = existingPassword_reset_token.toObject ? existingPassword_reset_token.toObject() : existingPassword_reset_token;

		// 3. Handle files if present
		if (files && files.length) {
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `password_reset_token-${crypto.randomUUID()}-${originalName}`
					
					const savedFileUrl = await this.storageProvider.saveFile(file, newFilename)
					savedFiles.push(savedFileUrl)

					// Accumulate: string for first file, array only when multiple files share the same fieldname
					if (fieldPath in updates) {
						updates[fieldPath] = Array.isArray(updates[fieldPath])
							? [...updates[fieldPath], savedFileUrl]
							: [updates[fieldPath], savedFileUrl]
					} else {
						updates[fieldPath] = savedFileUrl
					}

					// Also update local 'data' so cleanup has the new values
					this._setValueByPath(data, `payload.${fieldPath}`, updates[fieldPath])
				}

				if (Object.keys(updates).length > 0) {
					password_reset_token = await await this.repository.update('password_reset_token', { id, data: updates, options })
				}
			} catch (err) {
				for (const url of savedFiles) {
					await this.storageProvider.deleteFile(url, destinationPath).catch(() => {})
				}
				throw err
			}
		}

		// 4. Proactive cleanup: on a PATCH only the file fields present in `data` change; a file
		// field absent from the body is unchanged, so its stored file must be kept (the record
		// still points to it). Consider only paths from the incoming body - never the union with
		// the existing record, which is correct only for replace()/PUT (full-document semantics).
		const mappedPaths = this._getFilePaths(data)

		if (mappedPaths.length > 0) {
			for (const filePath of mappedPaths) {
				const newValue = this._getValueByPath(data, filePath)
				const oldValue = this._getValueByPath(existingObj, filePath)
				if (oldValue && oldValue !== newValue) {
					if (Array.isArray(oldValue)) {
						const newValues = Array.isArray(newValue) ? newValue : []
						for (const url of oldValue) {
							if (url && typeof url === 'string' && !newValues.includes(url)) {
								await this.storageProvider.deleteFile(url, destinationPath)
							}
						}
					} else if (typeof oldValue === 'string') {
						await this.storageProvider.deleteFile(oldValue, destinationPath)
					}
				}
			}
		}

		return this.applayContract(password_reset_token)
	}

	async replace(config = {}) {
		const { body, id, files = [], options = {}, authorizationHeader } = config

		// 1. Password reset tokens are an internal recovery record - only an admin may replace one directly
		await this._requireAdminSession(authorizationHeader)

		const data = this._unflatten(body)
		const existingPassword_reset_token = await this.findOne({ id, skipAuthCheck: true })
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')

		// 2. Initial replace with JSON data
		const payload = this.password_reset_tokenInterface.getUpdateInterface().parse(data)
		let password_reset_token = await await this.repository.replace('password_reset_token', { id, data: payload, options })

		const existingObj = existingPassword_reset_token.toObject ? existingPassword_reset_token.toObject() : existingPassword_reset_token;

		// 3. Handle files if present
		if (files && files.length) {
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `password_reset_token-${crypto.randomUUID()}-${originalName}`
					
					const savedFileUrl = await this.storageProvider.saveFile(file, newFilename)
					savedFiles.push(savedFileUrl)

					// Accumulate: string for first file, array only when multiple files share the same fieldname
					if (fieldPath in updates) {
						updates[fieldPath] = Array.isArray(updates[fieldPath])
							? [...updates[fieldPath], savedFileUrl]
							: [updates[fieldPath], savedFileUrl]
					} else {
						updates[fieldPath] = savedFileUrl
					}

					// Also update local 'data' so cleanup has the new values
					this._setValueByPath(data, `payload.${fieldPath}`, updates[fieldPath])
				}

				if (Object.keys(updates).length > 0) {
					password_reset_token = await this.repository.update('password_reset_token', { id, data: updates, options })
				}
			} catch (err) {
				for (const url of savedFiles) {
					await this.storageProvider.deleteFile(url, destinationPath).catch(() => {})
				}
				throw err
			}
		}

		// 4. Proactive cleanup: Map paths from both objects to ensure we catch removed fields
		const mappedPathsData = this._getFilePaths(data)
		const mappedPathsOld = this._getFilePaths(existingObj)
		const allPaths = [...new Set([...mappedPathsData, ...mappedPathsOld])]

		if (allPaths.length > 0) {
			for (const filePath of allPaths) {
				const newValue = this._getValueByPath(data, filePath)
				const oldValue = this._getValueByPath(existingObj, filePath)
				if (oldValue && oldValue !== newValue) {
					if (Array.isArray(oldValue)) {
						const newValues = Array.isArray(newValue) ? newValue : []
						for (const url of oldValue) {
							if (url && typeof url === 'string' && !newValues.includes(url)) {
								await this.storageProvider.deleteFile(url, destinationPath)
							}
						}
					} else if (typeof oldValue === 'string') {
						await this.storageProvider.deleteFile(oldValue, destinationPath)
					}
				}
			}
		}

		return this.applayContract(password_reset_token)
	}

	async remove(config = {}) {
		const { id, options = {}, authorizationHeader } = config

		// 1. Password reset tokens are an internal recovery record - only an admin may delete one directly
		await this._requireAdminSession(authorizationHeader)

		const existingPassword_reset_token = await this.findOne({ id, skipAuthCheck: true })

		const existingObj = existingPassword_reset_token.toObject ? existingPassword_reset_token.toObject() : existingPassword_reset_token
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')
		const mappedPaths = this._getFilePaths(existingObj)
		
		const repositoryResponse = await await this.repository.remove('password_reset_token', { id, options })
		
		if (mappedPaths.length > 0) {
			for (const filePath of mappedPaths) {
				const imageUrl = this._getValueByPath(existingObj, filePath)
				
				if (imageUrl) {
					if (Array.isArray(imageUrl)) {
						for (const url of imageUrl) {
							if (url && typeof url === 'string') {
								await this.storageProvider.deleteFile(url, destinationPath)
							}
						}
					} else if (typeof imageUrl === 'string') {
						await this.storageProvider.deleteFile(imageUrl, destinationPath)
					}
				}
			}
		}

		return repositoryResponse
	}

	// Authenticates the caller from the access token and requires an admin role - PasswordResetToken
	// is an internal recovery record, so every raw CRUD operation on it is admin-only, unconditionally.
	async _requireAdminSession(authorizationHeader) {
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})
		await this.requireAdminUser.execute({ repository: this.repository, userId: session.user })
	}

	applayContract(payload) {
		const contract = this.password_reset_tokenContract.getContract()

		if (Array.isArray(payload)) {
			return payload.map(item => this.contract.applyContract(contract, this._normalizeContractPayload(item)))
		}

		if (payload && typeof payload === 'object') {
			return this.contract.applyContract(contract, this._normalizeContractPayload(payload))
		}

		return payload
	}

	_normalizeContractPayload(payload) {
		if (payload && typeof payload.toObject === 'function') return payload.toObject()
		return payload
	}

	_getFilePaths(payload) {
		const fileFieldsEnv = envVariables.API_FILE_FIELDS;
		if (!fileFieldsEnv) return []
		const targetKeys = fileFieldsEnv.split(',').map(f => f.trim())
		const mappedPaths = []

		const traverse = (obj, currentPath) => {
			if (!obj || typeof obj !== 'object') return
			
			for (const key in obj) {
				const path = currentPath ? `${currentPath}.${key}` : key
				if (targetKeys.includes(key)) {
					mappedPaths.push(`payload.${path}`)
				}
				
				if (Array.isArray(obj[key])) {
					obj[key].forEach((item, index) => {
						traverse(item, `${path}.${index}`)
					})
				} else if (typeof obj[key] === 'object' && obj[key] !== null) {
					traverse(obj[key], path)
				}
			}
		}

		traverse(payload, '')
		return mappedPaths
	}

	_getValueByPath(obj, mappedPath) {
		const parts = mappedPath.split('.').slice(1)
		return parts.reduce((acc, p) => acc?.[p], obj)
	}

	_setValueByPath(obj, mappedPath, value) {
		const parts = mappedPath.split('.').slice(1)
		let current = obj
		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i]
			const nextPart = parts[i + 1]
			current[part] = current[part] || (isNaN(nextPart) ? {} : [])
			current = current[part]
		}
		current[parts[parts.length - 1]] = value
	}

	_unflatten(obj) {
		const result = {}

		for (const key in obj) {
			const parts = key.replace(/\]/g, '').split(/[\[\.]/)
			let current = result;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i]

				if (i === parts.length - 1) {
					current[part] = obj[key]
				} else {
					current[part] = current[part] || (isNaN(parts[i + 1]) ? {} : [])
					current = current[part]
				}
			}
		}
		
		return result
	}
}

module.exports = Password_reset_tokenService