const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
	{ ignores: ['node_modules/**', 'coverage/**', '.claude/**'] },
	{
		files: ['**/*.js'],
		...js.configs.recommended,
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: { ...globals.node }
		},
		rules: {
			'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', args: 'none' }]
		}
	}
]
