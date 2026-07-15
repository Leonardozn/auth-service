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

const AnalyticsManagerHandler = require('./src/handlers/analyticsManager')
const analytics = AnalyticsManagerHandler.getInstance()

const FileManagerHandler = require('./src/handlers/fileManager')
const path = require('path')

const RateLimiterHandler = require('./src/handlers/rateLimiter')
const rateLimiter = RateLimiterHandler.getInstance()

const SecurityHeadersHandler = require('./src/handlers/securityHeaders')
const securityHeaders = SecurityHeadersHandler.getInstance()

const envVarsHandler = require('./src/handlers/envVariables')

// Uploads folder anchored to the service root (this file lives at apps/api/index.js), NOT
// process.cwd(), so it's deterministic regardless of where the process is launched from. This one
// value is the single source of truth: it's both served as static (below) and handed to
// file-manager for writes, so reads and writes can never point at different folders.
const serviceRoot = path.resolve(__dirname, '..', '..')
const uploadPath = envVarsHandler.API_UPLOAD_PATH || path.join(serviceRoot, 'api-uploads')

const fileManager = FileManagerHandler.getInstance({ uploadPath })

const port = envVarsHandler.API_PORT
const host = envVarsHandler.API_HOST
const isDev = envVarsHandler.DEVELOP_MODE === 'true'
const protocol = isDev ? 'http' : 'https'
const hostUrl = isDev ? `${host}:${port}` : host

const server = new serverConfiguration()

// Behind Railway/nginx the client IP arrives in X-Forwarded-For; trust the single proxy hop so the
// rate limiter keys on the real client IP (not the proxy's, which would lump everyone together).
server.app.set('trust proxy', 1)

// Security response headers first, so every response (API, Swagger UI, static) carries them.
server.setSingleSetting(securityHeaders.getMiddleware())

server.setSingleSetting(corsPolicy.getPolicy())

server.setRequestBodyOptions({ limit: '10mb' })

server.setSingleSetting(requestLogger.getLogger(modes.DEV))

// Records HTTP RED metrics for every request; must sit before the routers so it wraps them all.
server.setSingleSetting(analytics.getMiddleware())

// Exposes GET /metrics for Prometheus to scrape (public, outside the API router).
analytics.setupMetricsEndpoint(server.app)

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

server.setStaticPublicFolder(`${envVarsHandler.API_PATH}/files`, uploadPath)

// Global baseline rate limit on the API router (mounted here so /metrics, Swagger UI and the static
// folder, all registered above, are exempt). A generous per-IP cap that only bites crude abuse.
server.setSingleSetting(rateLimiter.getBaselineLimiter())

const middlewares = []

if (uploadPaths.length > 0) {
	middlewares.push({
		includeInPaths: uploadPaths,
		methods: [fileManager.getMiddleware().any()]
	})
}

// Strict rate limit on the sensitive, unauthenticated auth endpoints (credential brute-force and
// email/account-creation abuse). A fresh limiter per path so each gets its own per-IP budget.
const strictAuthPaths = ['/auth/register', '/auth/login', '/auth/forgot-password', '/auth/reset-password']
for (const strictPath of strictAuthPaths) {
	middlewares.push({
		includeInPaths: [{ name: strictPath, method: 'post' }],
		methods: [rateLimiter.getStrictLimiter()]
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