const printer = require("pdf-to-printer");
const { PrinterError } = require("../Errors");
const path = require("path");

class PrinterService {
  /**
   * @param {string} filePath
   * @param {Number} copies
   * @returns {Promise<*>}
   */
  async print(filePath) {
    //TODO: May be, implement a module to check if the directory is OK
    console.log("inside printer:", filePath);
    filePath = path.normalize(filePath);
    try {
      await printer.print(filePath, {
        side: "simplex",
        scale: "fit",
        orientation: "portrait",
      });

      return {
        status: "success",
      };
    } catch (err) {
      console.log(err);
      return {
        status: "error",
        response: {
          reason: err,
          filePath,
        },
      };
    }
  }
}

module.exports = PrinterService;
