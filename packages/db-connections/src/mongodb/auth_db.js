const mongoose = require('mongoose')
const envVars = require('@auth-service/env-variables')
const credentials = `mongodb://${envVars.AUTH_DB_DATABASE_USERNAME}:${envVars.AUTH_DB_DATABASE_PASSWORD}@${envVars.AUTH_DB_DATABASE_HOST}:${envVars.AUTH_DB_DATABASE_PORT}/${envVars.AUTH_DB_DATABASE_NAME}`
const mongodbUri = envVars.AUTH_DB_MONGODB_URI
const options = {
	authSource: 'admin',
	serverSelectionTimeoutMS: 30000,
	socketTimeoutMS: 45000,
	replicaSet: envVars.AUTH_DB_DATABASE_REPLICA_SET
}

const connectWithRetry = async () => {
	while (true) {
		try {
			mongoose.set('strictQuery', false)
			await mongoose.connect(mongodbUri || credentials, options)
			break
		} catch (error) {
			console.error(`\x1b[31m❌ Mongodb (${envVars.AUTH_DB_DATABASE_NAME}) connection error: ${error.message}`)
			console.log(`🔄 Retrying in 5 seconds...`)
			await new Promise((resolve) => setTimeout(resolve, 5000))
		}
	}
}

// Automatic creation of collection
mongoose.set('autoCreate', JSON.parse(envVars.AUTH_DB_DATABASE_AUTO_CREATE))

// Connection events
mongoose.connection.on('connected', () => console.log(`\x1b[32m🟢 MongoDB (${envVars.AUTH_DB_DATABASE_NAME}) connection established.`))
mongoose.connection.on('disconnected', () => console.warn(`\x1b[33m🟡 MongoDB (${envVars.AUTH_DB_DATABASE_NAME}) connection lost.`))

// Start connect
connectWithRetry()

module.exports = mongoose