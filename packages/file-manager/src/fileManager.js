const multer = require('multer')
const envVariables = require('@auth-service/env-variables')
const path = require('path')
const fs = require('fs')

const LocalStorageStrategy = require('./strategies/localStorageStrategy')

class FileManager {
	/**
	 * @private
	 */
	uploadMiddleware

	/**
	 * @private
	 */
	storageStrategy

	constructor(settings = {}, appName) {
if (!appName) throw new Error('App name is required to initialize FileManager')

		const isS3 = envVariables[`${appName.toUpperCase().replaceAll('-', '_')}_UPLOAD_PATH`] && envVariables[`${appName.toUpperCase().replaceAll('-', '_')}_UPLOAD_PATH`].startsWith('s3://')

		let storage

		if (isS3) {
			// FIXME: Implementation of S3 strategy will go here
			throw new Error('S3 Storage Strategy not implemented yet')
		} else {
			const destinationPath = envVariables[`${appName.toUpperCase().replaceAll('-', '_')}_UPLOAD_PATH`] || path.join(process.cwd(), `${appName.toLowerCase()}-uploads`)
			
			if (!fs.existsSync(destinationPath)) {
				fs.mkdirSync(destinationPath, { recursive: true })
			}
			
			storage = multer.diskStorage({
				destination: function (req, file, cb) {
					cb(null, destinationPath)
				},
				filename: function (req, file, cb) {
					const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
					cb(null, uniqueSuffix + '-' + file.originalname)
				}
			})

			// Instanciamos el proveedor para el manejo interno en otros lados
			this.storageStrategy = new LocalStorageStrategy()
		}
		
		const multerOptions = { storage: storage }

		// Configure maximum file size if provided in bytes
		if (settings.maxFileSize) {
			multerOptions.limits = { fileSize: settings.maxFileSize }
		}

		// Configure allowed formats if an array of mimetypes is passed (e.g. ['image/jpeg', 'image/png'])
		if (settings.allowedFormats && Array.isArray(settings.allowedFormats)) {
			multerOptions.fileFilter = (req, file, cb) => {
				if (settings.allowedFormats.includes(file.mimetype)) {
					cb(null, true)
				} else {
					cb(new Error(`Formato no permitido. Solo se acepta: ${settings.allowedFormats.join(', ')}`), false)
				}
			}
		}

		this.uploadMiddleware = multer(multerOptions)
	}

	getMiddleware() {
		return this.uploadMiddleware
	}

	getProvider() {
		return this.storageStrategy
	}
}

module.exports = FileManager