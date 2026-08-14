const envVariables = require('../../handlers/envVariables')

const DEFAULTS = {
	name: 'Your account',
	logoUrl: '',
	// Un azul y un naranja sobrios: neutros, con contraste suficiente contra el blanco de la tarjeta
	// y el blanco del texto encima. Son un punto de partida, no una marca — cada despliegue pone la
	// suya por variables de entorno.
	primaryColor: '#0F4C81',
	accentColor: '#C2410C',
	url: '',
	language: 'en'
}

class ResolveEmailBrand {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new ResolveEmailBrand()
		return this.instance
	}

	/**
	 * Reads the brand that the transactional emails wear.
	 *
	 * **It comes from environment variables and not from another service, on purpose.** This is the
	 * identity service of the ecosystem, shared by projects that have nothing to do with each other;
	 * asking a particular project's catalogue for its colours would make registering impossible
	 * whenever that project's service is down, for every project. Configuration is the seam that
	 * keeps a shared service shared.
	 *
	 * The cost is that these values are a copy: changing the store's colours in its admin panel does
	 * not repaint the emails until the variables are updated too. That is a real limitation and the
	 * right one to accept - the alternative couples sign-up to a catalogue.
	 *
	 * @returns { Object } { brand: { name, logoUrl, primaryColor, accentColor, url }, language }
	 */
	execute() {
		return {
			brand: {
				name: envVariables.BRAND_NAME || DEFAULTS.name,
				logoUrl: envVariables.BRAND_LOGO_URL || DEFAULTS.logoUrl,
				primaryColor: envVariables.BRAND_PRIMARY_COLOR || DEFAULTS.primaryColor,
				accentColor: envVariables.BRAND_ACCENT_COLOR || DEFAULTS.accentColor,
				url: envVariables.BRAND_URL || DEFAULTS.url
			},
			// Inglés por defecto para no cambiarle el idioma a los proyectos que ya usan el servicio;
			// cada despliegue declara el suyo.
			language: envVariables.BRAND_EMAIL_LANGUAGE || DEFAULTS.language
		}
	}
}

module.exports = ResolveEmailBrand
