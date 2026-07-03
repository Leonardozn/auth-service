'use strict'

// Test-only stub for @auth-service/email-manager - prevents forgot-password's Resend call from
// ever hitting the real network during tests. Loaded via `node --require` (e2e/smoke/crud,
// spawned as a subprocess) or required directly at the top of a unit test file (same-process),
// exactly like mock-repository-preload.js. MOCK_EMAIL_CAPTURE_FILE lets a test inspect what
// would have been sent (mirrors mock-repository-preload.js's CAPTURE_FILE).

const Module = require('node:module')
const fs = require('node:fs')

const CAPTURE_FILE = process.env.MOCK_EMAIL_CAPTURE_FILE || ''

class MockEmailManager {
	static instance

	static getInstance() {
		if (!this.instance) this.instance = new MockEmailManager()
		return this.instance
	}

	async send(config) {
		if (CAPTURE_FILE) {
			try { fs.writeFileSync(CAPTURE_FILE, JSON.stringify(config)) } catch { /* capture is best-effort */ }
		}
		return { id: 'mock-email-id' }
	}
}

const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
	if (request === '@auth-service/email-manager') return MockEmailManager
	return originalLoad.apply(this, arguments)
}

module.exports = MockEmailManager
