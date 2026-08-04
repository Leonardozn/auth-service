const Repository = require('../repositories')
const Contract = require('../contracts')
const UserInterfaces = require('../interfaces/user')
const UserContract = require('../contracts/user')
const HandleResponseHandler = require('../handlers/handleResponse')
const DataValidatorHandler = require('../handlers/dataValidator')
const { BadRequestError } = require('../handlers/handleErrors')
const FileManagerHandler = require('../handlers/fileManager')
const path = require('path')
const crypto = require('crypto')
const envVariables = require('../handlers/envVariables')
const ExtractBearerToken = require('./commands/extractBearerToken')
const FindSessionByToken = require('./commands/findSessionByToken')
const AuthorizeAdminOrPermission = require('./commands/authorizeAdminOrPermission')
const DataEncryptHandler = require('../handlers/dataEncrypt')
const HashPassword = require('./commands/hashPassword')

class UserService {
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
	userInterface

	/**
	 * @private
	 */
	userContract

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

		this.userInterface = UserInterfaces.getInstance()
		this.userContract = UserContract.getInstance()
		this.repository = Repository.getInstance()
		this.contract = Contract.getInstance()

		this.fileManagerHandler = FileManagerHandler.getInstance()
		this.storageProvider = this.fileManagerHandler.getProvider()

		this.luxon = DataValidatorHandler.getInstance().getLuxon()
		this.extractBearerToken = ExtractBearerToken.getInstance()
		this.findSessionByToken = FindSessionByToken.getInstance()
		this.authorizeAdminOrPermission = AuthorizeAdminOrPermission.getInstance()
		this.dataEncryptHandler = DataEncryptHandler.getInstance()
		this.hashPassword = HashPassword.getInstance()
	}

	static getInstance() {
		if (!this.instance) this.instance = new UserService()
		return this.instance
	}

	async add(config = {}) {
		const { body, files = [], options = {}, authorizationHeader, trustedRoleAssignment = false } = config
		const payload = Array.isArray(body) ? [...body] : { ...body }

		// 1. Creating a user directly is admin-only. Self-service signup is not this endpoint - it is
		// POST /auth/register, which resolves the default role itself (never from client input) and
		// passes `trustedRoleAssignment` to skip this check. Any other caller creating an account is
		// acting on the platform's user base, which is an administrative act regardless of whether
		// the payload happens to name a role.
		if (!trustedRoleAssignment) await this._requireAdminSession(authorizationHeader)

		// 2. Initial creation
		const unflattenedBody = Array.isArray(payload) ? payload.map(p => this._unflatten(p)) : this._unflatten(payload)
		const parsed = Array.isArray(unflattenedBody)
			? unflattenedBody.map(el => this.userInterface.getCreateInterface().parse(el))
			: this.userInterface.getCreateInterface().parse(unflattenedBody)

		// La contraseña se cifra acá y no antes de validar, para que el largo máximo que revisa
		// bcrypt se aplique al texto que escribió la persona y no al hash.
		//
		// `trustedRoleAssignment` marca al único llamador interno —el registro autoservicio—, que
		// ya cifró por su cuenta. Volver a cifrar un hash produce una cuenta que no puede entrar.
		const data = trustedRoleAssignment
			? parsed
			: Array.isArray(parsed)
				? await Promise.all(parsed.map(el => this._hashPassword(el)))
				: await this._hashPassword(parsed)

		let user = await this.repository.add('user', { data, options })

		// 3. Handle files if present
		if (files && files.length) {
			const userId = Array.isArray(user) ? user[0]._id : user._id
			const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `user-${crypto.randomUUID()}-${originalName}`
					
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
					user = await this.repository.update('user', { id: userId, data: updates, options })
				}
			} catch (err) {
				for (const url of savedFiles) {
					await this.storageProvider.deleteFile(url, destinationPath).catch(() => {})
				}
				throw err
			}
		}

		return this.applayContract(user)
	}
	
	async findOne(config = {}) {
		const { id, authorizationHeader, skipAuthCheck = false } = config

		// 1. Reading a user record is restricted to that account's own owner or an admin - a session
		// alone is not enough, or any customer could read every other account. Skipped for internal
		// reuse (replace/remove re-reading the record they already authenticated for, and the
		// trusted AuthenticationService.refresh()/validate() calls, which authenticate via the token)
		if (!skipAuthCheck) await this._requireSelfOrAdminSession(authorizationHeader, id, 'read')

		let virtuals = {}
		let relations = {}
		const query = this.userInterface.getQueryInterface().parse({ _id: id, ...config.query?.query })
		if (config.query?.virtuals) virtuals = this.userInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.userInterface.getRelationsInterface().parse(config.query.relations)
		const options = config.options || {}

		const result = await this.repository.list('user', { query, virtuals, relations, options })
		const user = result.records[0]
		if (!user) throw new BadRequestError('User not found.')
		
		return this.applayContract(user)
	}
	
	async list(config = {}) {
		// 1. Listing the platform's user base is admin-only. There is no ownership scope to fall back
		// on here the way findOne has: a list request names no account, so "your own" is not an
		// option - either the caller may see every user or none.
		await this._requireAdminSession(config.authorizationHeader, 'read')

		let query = {}
		let virtuals = {}
		let relations = {}
		if (config.query?.query) query = this.userInterface.getQueryInterface().parse(config.query.query)
		if (config.query?.virtuals) virtuals = this.userInterface.getVirtualsInterface().parse(config.query.virtuals)
		if (config.query?.relations) relations = this.userInterface.getRelationsInterface().parse(config.query.relations)
		const size = config.query?.size ? Number(config.query.size) : null
		const page = config.query?.page ? Number(config.query.page) : null
		const sort = config.query?.sort || {}
		const options = config.options || {}

		const user_list = await this.repository.list('user', { query, virtuals, relations, size, page, sort, options })
		user_list.records = this.applayContract(user_list.records)
		return user_list
	}
	
	async update(config = {}) {
		const { body, id, files = [], options = {} } = config
		const data = this._unflatten(body)
		// Not reachable directly over HTTP (PATCH /user/:id is wired to AccountManagementService.editProfile,
		// which already authenticated the caller) - skip the check on this internal re-read.
		const existingUser = await this.findOne({ id, skipAuthCheck: true })
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')

		// 1. Initial update with JSON data
		const payload = this.userInterface.getUpdateInterface().parse(data)
		let user = await this.repository.update('user', { id, data: payload, options })
		
		const existingObj = existingUser.toObject ? existingUser.toObject() : existingUser;

		// 2. Handle files if present
		if (files && files.length) {
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `user-${crypto.randomUUID()}-${originalName}`
					
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
					user = await await this.repository.update('user', { id, data: updates, options })
				}
			} catch (err) {
				for (const url of savedFiles) {
					await this.storageProvider.deleteFile(url, destinationPath).catch(() => {})
				}
				throw err
			}
		}

		// 3. Proactive cleanup: on a PATCH only the file fields present in `data` change; a file
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

		return this.applayContract(user)
	}

	async replace(config = {}) {
		const { body, id, files = [], options = {}, authorizationHeader } = config

		// 1. Replacing a user is restricted to that account's own owner or an admin; assigning a role
		// on top of that is admin-only. A bare authenticated session is not enough: this body accepts
		// `email`, so any customer could point another account's email at their own inbox and take it
		// over through POST /auth/forgot-password.
		if (body && body.role !== undefined) await this._requireAdminSession(authorizationHeader)
		else await this._requireSelfOrAdminSession(authorizationHeader, id)

		const data = this._unflatten(body)
		const existingUser = await this.findOne({ id, skipAuthCheck: true })
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')

		// 2. Initial replace with JSON data
		const parsed = this.userInterface.getUpdateInterface().parse(data)
		// En replace la contraseña siempre viene del cliente, así que siempre se cifra.
		const payload = await this._hashPassword(parsed)
		let user = await await this.repository.replace('user', { id, data: payload, options })

		const existingObj = existingUser.toObject ? existingUser.toObject() : existingUser;

		// 3. Handle files if present
		if (files && files.length) {
			const updates = {}
			const savedFiles = []

			try {
				for (const file of files) {
					const fieldPath = file.fieldname.replace(/\[(\w+)\]/g, '.$1')
					const originalName = file.originalname.replace(/\s+/g, '_')
					const newFilename = `user-${crypto.randomUUID()}-${originalName}`

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
					user = await this.repository.update('user', { id, data: updates, options })
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

		return this.applayContract(user)
	}
	
	async remove(config = {}) {
		const { id, options = {}, authorizationHeader } = config

		// 1. Deleting a user outright is admin-only
		await this._requireAdminSession(authorizationHeader)

		const existingUser = await this.findOne({ id, skipAuthCheck: true })

		const existingObj = existingUser.toObject ? existingUser.toObject() : existingUser
		const destinationPath = envVariables.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')
		const mappedPaths = this._getFilePaths(existingObj)
		
		const repositoryResponse = await await this.repository.remove('user', { id, options })
		
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

	// Authenticates the caller and authorizes the operation on the platform's user base: either the
	// Role is named 'admin', or it grants the requested action on the 'user' resource.
	//
	// Gating this on the role NAME alone made user administration impossible to delegate: an
	// account was either called 'admin' and could do everything, or could do nothing here no
	// matter what its permissions said. That forces every administrative account to be a full
	// administrator, which is the opposite of what a permissions catalog is for.
	async _requireAdminSession(authorizationHeader, action = 'write') {
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})
		await this.authorizeAdminOrPermission.execute({
			repository: this.repository,
			userId: session.user,
			resource: 'user',
			action
		})
		return session
	}

	// Authenticates the caller and allows through the target account's own owner, an admin, or a
	// Role that grants the action on 'user'. Se intenta la propiedad primero porque es la vía de
	// toda cuenta corriente: quien lee o edita lo suyo no necesita ningún permiso del catálogo.
	async _requireSelfOrAdminSession(authorizationHeader, targetUserId, action = 'write') {
		const token = this.extractBearerToken.execute({ authorizationHeader })
		const session = await this.findSessionByToken.execute({
			repository: this.repository,
			luxon: this.luxon,
			tokenField: 'accessToken',
			expiryField: 'accessTokenExpiresAt',
			token
		})

		if (String(session.user) === String(targetUserId)) return session

		await this.authorizeAdminOrPermission.execute({
			repository: this.repository,
			userId: session.user,
			resource: 'user',
			action
		})
		return session
	}


	// Hashes a plain-text `password` present in the payload, leaving everything else untouched.
	//
	// Without this, POST/PUT /user store whatever string arrives, and `verifyCredentials` compares
	// it with bcrypt against a value that is not a bcrypt hash - so the account is created and can
	// **never** log in. Nothing fails at creation time: the failure surfaces later, as "invalid
	// email or password" on a password that is in fact correct.
	//
	// Quién llama decide si hay que cifrar, en vez de mirar si el valor "parece" un hash: una
	// contraseña que empezara con el prefijo de bcrypt se guardaría sin cifrar, y ese es
	// exactamente el caso que un atacante buscaría. El único llamador que trae la contraseña ya
	// cifrada es AuthenticationService.register(), que lo hace por su cuenta.
	async _hashPassword(data) {
		if (!data || typeof data.password !== 'string' || !data.password) return data

		const password = await this.hashPassword.execute({
			dataEncryptHandler: this.dataEncryptHandler,
			password: data.password
		})
		return { ...data, password }
	}

	applayContract(payload) {
		const contract = this.userContract.getContract()

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

module.exports = UserService