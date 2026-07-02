const express = require('express')

class serverConfiguration {
	/**
	* @private
	*/
	app
	router

	constructor() {
		this.app = express()
	}

	setListenSettings(port, host, docsUrl) {
		this.app.listen(port, host, () => {
			console.log(`🚀 Server running on port ${port}`)
			if (docsUrl) console.log(`
📚 API Documentation: ${docsUrl}`)
		})
	}

	setSingleSetting(settings) {
		this.app.use(settings)
	}

	setRequestBodyOptions(options) {
		this.app.use(express.json(options))
	}

	setStaticPublicFolder(webPath, systemPath) {
		this.app.use(webPath, express.static(systemPath))
	}

	setRoutes(settings) {
		const validMethods = ['get', 'post', 'put', 'patch', 'delete']
		this.router = express.Router()
		const mainPath = settings.mainPath || ''
		const routes = settings.routes
		const middlewares = settings.middlewares || []

		for (const middleware of middlewares) {
			const pathList = middleware.includeInPaths || middleware.excludeOfPaths || []
			for (const pathObj of pathList) {
				if (!pathObj || typeof pathObj.name !== 'string' || typeof pathObj.method !== 'string') {
					throw new Error('Each path entry must be an object with "name" (string) and "method" (string) keys')
				}
				
				if (pathObj.method !== '*' && !validMethods.includes(pathObj.method)) {
					throw new Error(`Invalid method "${pathObj.method}" in path entry. Allowed values: ${validMethods.join(', ')}, *`)
				}
			}
		}
    
		for (const route in routes) {
			for (const el of routes[route].paths) {
				let methods = []

				for (const middleware of middlewares) {
					if (middleware.includeInPaths && middleware.excludeOfPaths) {
						throw new Error('Each middleware must has only one includeInPaths or excludeOfPaths')
					}
					
					if (!middleware.includeInPaths && !middleware.excludeOfPaths) {
						throw new Error('Each middleware must has only one includeInPaths or excludeOfPaths')
					}
					
					if (middleware.includeInPaths && middleware.includeInPaths.find(pathObj => `${routes[route].modelPath}${el.path}`.includes(pathObj.name) && (pathObj.method === '*' || el.requestMethod === pathObj.method))) {
						methods = methods.concat(middleware.methods)
					}

					if (middleware.excludeOfPaths && !middleware.excludeOfPaths.find(pathObj => `${routes[route].modelPath}${el.path}`.includes(pathObj.name) && (pathObj.method === '*' || el.requestMethod === pathObj.method))) {
						methods = methods.concat(middleware.methods)
					}
				}
				
				this.router[el.requestMethod](`${routes[route].modelPath}${el.path}`, ...methods, el.controllerMethod)
			}
		}

		this.app.use(mainPath, this.router)
	}
}

module.exports = serverConfiguration