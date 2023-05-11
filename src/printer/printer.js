// Printer tests
const printer = require("pdf-to-printer");
const fs = require("fs");
const dirPdfMocks = "C:/users/julio/Documents/pdf-mocks";

class Printer {
  async print(filePath, times) {
    try {
      console.log("Enviando reporte/s a la impresora...");
      const printerRes = await printer.print(filePath);
      return {
        status: "success",
        message: "Reporte/s enviado/s correctamente.",
      };
    } catch (err) {
      return {
        status: "error",
        errMessage: err.message,
      };
    }
  }
}

module.exports = Printer;

// fs.readdir(dirPdfMocks, (err, files) => {
//   if (err) {
//     console.log("Error trying to read directory.");
//     console.log(err);
//     return;
//   }

//   console.log("Printing files...");
//   files.forEach((file) => {
//     let filePath = dirPdfMocks + "/" + file;
//     printer
//       .print(filePath)
//       .then((response) => {
//         console.log("Finalizing printing process...");
//         if (!response) {
//           console.log("Print process finalized with no response.");
//           return;
//         }

//         console.log("Print process finalized with the following response:");
//         console.log(response);
//       })
//       .catch((err) => {
//         console.log("An error occurred trying to print a file.");
//         console.log(err);
//       });
//   });
// });
