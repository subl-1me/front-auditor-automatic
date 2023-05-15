const printer = require("pdf-to-printer");
const { PrinterError } = require("../Errors");

class PrinterService {
  /**
   * @param {string} filePath
   * @param {Number} copies
   * @returns {Promise<*>}
   */
  async print(filePath) {
    //TODO: May be, implement a module to check if the directory is OK
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
