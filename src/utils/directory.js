const fs = require("fs/promises");
const fsSync = require("fs");
const Spinnies = require("spinnies");

/**
 * This class handles the creation/deletion of directorys to store Front reports or documents
 */
class Directory {
  constructor() {
    this.spinnies = new Spinnies();
    if (!Directory.instance) {
      Directory.instance = this;
    }

    return Directory.instance;
  }

  initSpinner(text) {
    this.spinnies.add("spinner-1", { text });
  }

  stopSpinner(text) {
    this.spinnies.succeed("spinner-1", { text });
  }

  async createDir(path) {
    console.log("Creating new dir:", path);
    if (fsSync.existsSync(path)) {
      return;
    }

    return await fs.mkdir(path);
  }

  /**
   * Writes a file by the provided parameters
   * @param {string} path Directory where data will be saved
   * @param {string} data File data
   * @param {string} encoding Enconding data saved
   */
  async saveFile(path, data, encoding) {
    console.log("saving path:", path);
    // this.initSpinner(`Saving zip file...`);
    const writer = await fs.writeFile(path, data, encoding);
    // this.stopSpinner("File saved.");
    return;
  }

  async deleteFile(path) {}

  async deleteDir(path) {}
}

const globalDirectoryInstance = new Directory();
module.exports = globalDirectoryInstance;
