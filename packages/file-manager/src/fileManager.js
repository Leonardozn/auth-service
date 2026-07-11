const multer = require('multer')
const envVariables = require('@auth-service/env-variables')
const path = require('path')
const fs = require('fs')

const LocalStorageStrategy = require('./strategies/localStorageStrategy')

// Service root, anchored to this package's on-disk location (packages/file-manager/src), NOT
// process.cwd(). It's the fallback base for the uploads folder when neither the caller nor the env
// provides an absolute path, so the folder is always at <service-root>/<app>-uploads regardless of
// the directory the process was launched from (running from the root vs. from apps/api used to
// scatter two separate api-uploads folders).
const SERVICE_ROOT = path.resolve(__dirname, '..', '..', '..')

class FileManager {
	/**
	 * @private
	 */
	uploadMiddleware

	/**
	 * @private
	 */
	storageStrategy

	/**
	 * @private
	 */
	destinationPath

	constructor(settings = {}, appName) {
		if (!appName) throw new Error('App name is required to initialize FileManager')

		const envPrefix = appName.toUpperCase().replaceAll('-', '_')

		// Destination resolution — single source of truth is the app's index.js, which computes the
		// absolute path and passes it as settings.uploadPath. Priority: explicit setting > env
		// (`<APP>_UPLOAD_PATH`) > `<service-root>/<app>-uploads`.
		const destinationPath = settings.uploadPath || envVariables[`${envPrefix}_UPLOAD_PATH`] || path.join(SERVICE_ROOT, `${appName.toLowerCase()}-uploads`)

		const isS3 = typeof destinationPath === 'string' && destinationPath.startsWith('s3://')

		let storage

		if (isS3) {
			// FIXME: Implementation of S3 strategy will go here
			throw new Error('S3 Storage Strategy not implemented yet')
		} else {
			// Kept so the directory can be created lazily (see _ensureDestination), only when an upload
			// middleware is actually mounted — a service that never uploads should not create an empty
			// folder just by wiring the handler.
			this.destinationPath = destinationPath

			storage = multer.diskStorage({
				destination: (req, file, cb) => {
					cb(null, this.destinationPath)
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

	// Creates the destination folder on first use rather than at construction, so only a service that
	// actually mounts an upload middleware materializes the folder. No-op for the S3 strategy (no
	// local destinationPath) and idempotent.
	_ensureDestination() {
		if (this.destinationPath && !fs.existsSync(this.destinationPath)) {
			fs.mkdirSync(this.destinationPath, { recursive: true })
		}
	}

	getMiddleware() {
		this._ensureDestination()
		return this.uploadMiddleware
	}

	getProvider() {
		return this.storageStrategy
	}
}

module.exports = FileManager