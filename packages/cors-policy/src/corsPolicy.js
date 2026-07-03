const cors = require('cors')

class CorsPolicy {
	getPolicy(settings={}) {
		return cors(settings)
	}
}


module.exports = CorsPolicy