class RoleContract {
	/**
	 * @private
	 * @static
	 */
	instance

	static getInstance() {
		if (!this.instance) this.instance = new RoleContract()
		return this.instance
	}

	getContract() {
		return {
			// _id se expone, igual que en User. Sin él el CRUD de /role queda inservible para
			// cualquier cliente: PUT/PATCH/DELETE piden el id en la ruta, y un panel que lista
			// roles no tendría con qué identificar el que el usuario eligió. Un modelo cuyo CRUD
			// está publicado y cuyo identificador no sale es un CRUD que solo se puede leer.
			_id: true,
			name: true,
			active: true,
			maxSessions: true,
			permissions: [{
				resource: true,
				read: true,
				write: true,
			}],
		}
	}
}

module.exports = RoleContract
