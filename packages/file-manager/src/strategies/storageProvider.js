class StorageProvider {
	/**
	 * Rename and move a file to its final destination.
	 * @param {Object} file - The file object to save
	 * @param {string} newFilename - The new filename
	 * @returns {Promise<string>} - The final filename or URL
	 */
	async saveFile(file, newFilename) {
		throw new Error('Method not implemented')
	}

	/**
	 * Delete a file.
	 * @param {string} filename - The name of the file
	 * @param {string} destinationPath - The path where the file is stored
	 * @returns {Promise<void>}
	 */
	async deleteFile(filename, destinationPath) {
		throw new Error('Method not implemented')
	}
}

module.exports = StorageProvider