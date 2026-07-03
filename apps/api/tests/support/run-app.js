'use strict'

// Shared test helper: boots this app as a real subprocess (DB mocked via
// mock-repository-preload.js), waits for it to come up, and returns request/stop helpers.
// Used by smoke/e2e/crud tests - never required by unit tests, which exercise the service
// in-process instead.

const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')
// Loads the real root .env as a side effect (same package the app itself uses), so
// API_PATH here matches what the spawned child will resolve to - avoids the two ever
// silently disagreeing about where routes are mounted.
const envVariables = require('@auth-service/env-variables')

const APP_ROOT = path.join(__dirname, '..', '..')
// The app's own index.js assumes it's launched from the monorepo root (see its Swagger
// apiPaths: './apps/api/src/routes/*.js', and the root .env that env-variables loads via
// process.cwd()) - the real "start" script runs it the same way, so the subprocess must too.
const PROJECT_ROOT = path.join(APP_ROOT, '..', '..')
const PRELOAD = path.join(__dirname, 'mock-repository-preload.js')
const EMAIL_PRELOAD = path.join(__dirname, 'mock-email-resend-preload.js')

function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer()
		server.unref()
		server.on('error', reject)
		server.listen(0, () => {
			const { port } = server.address()
			server.close(() => resolve(port))
		})
	})
}

async function waitForHealth(baseUrl, appPath, timeoutMs) {
	const deadline = Date.now() + timeoutMs
	let lastError

	while (Date.now() < deadline) {
		try {
			const res = await fetch(`${baseUrl}${appPath}/health`)
			if (res.ok) return
		} catch (err) {
			lastError = err
		}
		await new Promise(resolve => setTimeout(resolve, 150))
	}

	throw new Error(`App did not become healthy in time. Last error: ${lastError && lastError.message}`)
}

// extraEnv lets a test set MOCK_SEED_SCHEMA/MOCK_SEED_ID/MOCK_SEED_RECORD/MOCK_CAPTURE_FILE.
async function runApp(extraEnv = {}) {
	const port = await getFreePort()
	const env = {
		...process.env,
		API_PORT: String(port),
		API_HOST: 'localhost',
		...extraEnv
	}

	const appPath = env.API_PATH || envVariables.API_PATH || ''
	const baseUrl = `http://localhost:${port}`

	const child = spawn(process.execPath, ['--require', PRELOAD, '--require', EMAIL_PRELOAD, 'apps/api/index.js'], {
		cwd: PROJECT_ROOT,
		env,
		stdio: 'pipe'
	})

	let stderr = ''
	child.stderr.on('data', chunk => { stderr += chunk.toString() })

	try {
		await waitForHealth(baseUrl, appPath, 15000)
	} catch (err) {
		child.kill()
		throw new Error(`${err.message}
--- app stderr ---
${stderr}`)
	}

	return {
		baseUrl,
		path: appPath,
		async request(method, url, body, headers) {
			const res = await fetch(`${baseUrl}${url}`, {
				method,
				headers: {
					...(body !== undefined ? { 'Content-Type': 'application/json' } : undefined),
					...headers
				},
				body: body !== undefined ? JSON.stringify(body) : undefined
			})
			const payload = await res.json().catch(() => null)
			return { status: res.status, body: payload }
		},
		stop() {
			return new Promise(resolve => {
				child.once('exit', resolve)
				child.kill()
			})
		}
	}
}

module.exports = { runApp }
