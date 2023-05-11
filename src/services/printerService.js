const printer = require("pdf-to-printer");

class PrinterService {
  /**
   * @param {string} filePath
   * @param {Number} copies
   * @returns {Promise<*>}
   */
  async print(filePath, copies) {
    //TODO: May be, implement a module to check if the directory is OK
    console.log("\x1b[33mEnviando a impresora: \x1b[0m" + filePath);
    try {
      const printerResponse = await printer.print(filePath, {
        side: "simplex",
      });

      return {
        status: "success",
        message: "File was sended to printer successfully.",
        printerRes: printerResponse,
      };
    } catch (err) {
      return {
        status: "error",
        filePath: filePath,
        errMessage: err,
      };
    }
  }
}

module.exports = PrinterService;
