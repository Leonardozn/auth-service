PrototypesHandler = require('./src/handlers/prototypes')
const prototypes = PrototypesHandler.getInstance()
prototypes.setCapitalize()

const serverConfiguration = require('./src/handlers/serverConfiguration')

const Routes = require('./src/routes')
const routes = Routes.getInstance().getRoutes()

const CorsPolicyHandler = require('./src/handlers/corsPolicy')
const corsPolicy = CorsPolicyHandler.getInstance()

const RequestLoggerHandler = require('./src/handlers/requestLogger')
const requestLogger = RequestLoggerHandler.getInstance()
const modes = requestLogger.getModes()

const FileManagerHandler = require('./src/handlers/fileManager')
const fileManager = FileManagerHandler.getInstance()
const path = require('path')

const envVarsHandler = require('./src/handlers/envVariables')

const port = envVarsHandler.API_PORT
const host = envVarsHandler.API_HOST
const isDev = envVarsHandler.DEVELOP_MODE === 'true'
const protocol = isDev ? 'http' : 'https'
const hostUrl = isDev ? `${host}:${port}` : host

const server = new serverConfiguration()

server.setSingleSetting(corsPolicy.getPolicy())

server.setRequestBodyOptions({ limit: '10mb' })

server.setSingleSetting(requestLogger.getLogger(modes.DEV))

const DocumentationConfigHandler = require('./src/handlers/documentationConfig')
const documentationHandler = DocumentationConfigHandler.getInstance()

documentationHandler.initialize({
	title: 'Enode api API',
	version: '1.0.0',
	description: 'API for api management system',
	serverUrl: `${protocol}://${hostUrl}${envVarsHandler.API_PATH}`,
	apiPaths: ['./apps/api/src/routes/*.js']
})

documentationHandler.setupSwaggerUI(server.app, '/api-docs')

let uploadPaths = envVarsHandler.API_UPLOAD_INCLUDE_PATHS ? envVarsHandler.API_UPLOAD_INCLUDE_PATHS.split(',') : []
uploadPaths = uploadPaths.map(path => ({ name: path.trim(), method: '*' }))

const staticPath = envVarsHandler.API_UPLOAD_PATH || path.join(process.cwd(), 'api-uploads')

server.setStaticPublicFolder(`${envVarsHandler.API_PATH}/files`, staticPath)

const middlewares = []

if (uploadPaths.length > 0) {
	middlewares.push({
		includeInPaths: uploadPaths,
		methods: [fileManager.getMiddleware().any()]
	})
}

server.setRoutes({
	mainPath: envVarsHandler.API_PATH,
	routes,
	middlewares
})

const swaggerUrl = `${protocol}://${hostUrl}/api-docs`
server.setListenSettings(port, host, swaggerUrl)

module.exports = server