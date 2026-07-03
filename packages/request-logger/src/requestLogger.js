const morgan = require('morgan')

const modes = {
	COMBINED: 'combined',
	COMMON: 'common',
	DEV: 'dev',
	SHORT: 'short',
	TINY: 'tiny'
}

class RequestLogger {
	/**
	 * Returns an Express request-logging middleware configured with the given mode.
	 *
	 * @param { string | import('morgan').FormatFn } mode - A Morgan predefined format name
	 * (e.g., "combined", "common", "dev", "short", "tiny") or a custom format function.
	 * @returns { import('express').RequestHandler } Express middleware that logs HTTP requests.
	 * @throws { Error } If the mode is not recognized (when a string is provided and not in `modes`).
	 *
	 * @example
	 * // Using a predefined format
	 * const logger = new RequestLogger().getLogger('dev');
	 * app.use(logger);
	 *
	 * @example
	 * // Using a custom format function
	 * const custom = (tokens, req, res) => `${tokens.method(req, res)} ${tokens.url(req, res)}`;
	 * const logger = new RequestLogger().getLogger(custom);
	 * app.use(logger);
	 */
	getLogger(mode) {
		if (!Object.values(modes).includes) throw new Error('Request logger mode not recognized.')
		return morgan(mode)
	}
}

module.exports = {
	modes,
	RequestLogger
}