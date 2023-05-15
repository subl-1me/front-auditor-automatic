const AxiosService = require("../services/AxiosService");
const PrinterService = require("../services/printerService");
const ConfigService = require("../services/ConfigService");
const inquirer = require("inquirer");
const fs = require("fs");
const PATH = require("path");
const ReportsByUser = require("../utils/reportsByUser");
const decompress = require("decompress");
const filesPath =
  PATH.normalize(process.env.userprofile) + "/Documents/reportes-front-temp/";

const { StandardError, PrinterError } = require("../Errors");
const { DECOMPRESS_ERROR } = require("../ErrCodes");

// extras
const Spinnies = require("spinnies");

// ENV VARS
const {
  API_URL_LOGIN,
  API_URL_REPORT,
  API_URL_REPORT_INDV,
  API_URL_AUDI_RPT_LIST,
  API_URL_AUDI_RPT,
  API_URL_COBRO_RPT_GENERATE,
} = process.env;

class Operations {
  axiosService = new AxiosService();
  printerService = new PrinterService();
  spinnies = new Spinnies();

  constructor() {
    this.config = ConfigService.getConfig();
    this.inquirer = inquirer;
  }

  /**
   * @description It handles the login Front 2 Go process
   * @returns {Promise<*>}
   */
  async login() {
    const userCredentials = await this.waitForCredentials();
    this.spinnies.add("spinner-1", { text: "Login..." });
    const serviceResponse = await this.axiosService.postRequest(
      API_URL_LOGIN,
      userCredentials
    );

    this.spinnies.remove("spinner-1");
    return serviceResponse;
  }

  async getZipName(htmlData) {
    return new Promise((resolve, reject) => {
      // filter "__VIEWSTATE" string because it is very large and unnecessary
      // for this use case
      const shorterData = htmlData
        .split("\r\n")
        .filter((segment) => !segment.includes("__VIEWSTATE"));

      // we need scrap for the lastest reports.zip archive to download it
      // and start printing
      const liElementsListStrings = shorterData
        .filter((element) => element.includes("p_OpenFile.aspx"))
        .reverse();

      // in this use case the last report is in the [1] position
      const liElementToProcess = liElementsListStrings[1];
      const zipName = liElementToProcess
        .split("CECJS")
        .filter((segment) => segment.includes(".zip"))
        .pop();

      resolve("CECJS" + zipName.slice(0, zipName.length - 2));
    });
  }

  async getAuditoriaReports() {
    try {
      // console.log(`\x1b[33mBuscando último archivo de reportes...\x1b[0m`);
      this.spinnies.add("spinner-1", {
        text: "Looking for last report file...",
      });
      // Get html data that contains report list
      const htmlData = await this.axiosService.getRequest(
        API_URL_AUDI_RPT_LIST
      );

      // Scrap for zip name
      const zipName = await this.getZipName(htmlData);

      this.spinnies.update("spinner-1", { text: "Downloading..." });
      // console.log(`\x1b[33mDescargando reporte (${zipName})...\x1b[0m`);
      // download ZIP file
      const zipFile = await this.axiosService.axiosScrapping({
        url: API_URL_AUDI_RPT + zipName,
        responseType: "arraybuffer",
      });

      // Check if directory is already created
      if (!fs.existsSync(filesPath)) {
        fs.mkdirSync(filesPath);
      }

      // console.log(`\x1b[33mDescomprimiendo...\x1b[0m`);
      this.spinnies.update("spinner-1", { text: "Decompressing & saving..." });
      // decompress zip file and save in files path
      fs.writeFileSync(filesPath + zipName, zipFile.data);
      const files = await decompress(
        filesPath + zipName,
        filesPath + "08-05-2023"
      );

      this.spinnies.update("spinner-1", { text: "File saved." });
      if (!files) {
        throw new StandardError(
          "Ocurrió un error al intentar descomprimir archivo de reportes, intente de nuevo. Si el error persiste debe imprimir manualmente.",
          DECOMPRESS_ERROR,
          "error"
        );
      }

      // filter only .pdf to avoid problems with printer
      const pdfFiles = files.filter((file) => file.path.includes(".pdf"));
      const users = Object.getOwnPropertyNames(ReportsByUser);
      let printerErrors = [];
      // console.log("\x1b[33mEnviando reportes a impresora...\x1b[0m");
      this.spinnies.succeed("spinner-1");
      for (const user of users) {
        let reports = ReportsByUser[user];
        this.spinnies.add("spinner-1", { text: "Printing: " });
        for (const report of reports) {
          if (pdfFiles.filter((file) => file.path.includes(report + ".pdf"))) {
            let printerRes;
            this.spinnies.update("spinner-1", {
              text: "Printing: " + report,
            });
            printerRes = await this.printerService.print(
              filesPath + "08-05-2023/" + report + ".pdf"
            );
            if (printerRes.status !== "success") {
              console.log(`Error al imprimir`);
              printerErrors.push(printerRes);
              console.log("---");
            }
          }
        }
      }

      this.spinnies.succeed("spinner-1", {
        text: "All reports where printed successfully.",
      });
      return {
        status: "success",
        printerErrors: printerErrors,
      };
    } catch (err) {
      this.spinnies.stopAll("fail");
      return err;
    }
  }

  async generateReport(reportName) {
    //TODO: Create a report mapping function
    const generableReports = ["Cobro por operador"];
    if (!generableReports.includes(reportName)) {
      throw new Error("Nombre de reporte invalido");
    }

    const serviceResponse = await this.axiosService.getRequest(
      API_URL_COBRO_RPT_GENERATE
    );

    const htmlSegments = serviceResponse.htmlData.split("\r\n");
    const htmlElementReportId = htmlSegments.filter((segment) =>
      segment.includes("ReportSession")
    );
    console.log(htmlSegments);
  }

  async getCobroPorOperadorReport() {
    const reportId = await this.generateReport("Cobro por operador");
    return reportId;
  }

  /**
   * @description It handles two files to download
   * @returns
   */
  async getCorteReport() {
    try {
      let promises = [];
      promises.push(
        await this.axiosService.getRequestDownload(
          API_URL_REPORT + "=" + this.config.lastUsernameSession + "|AND;",
          "rpt_cajeros"
        )
      );
      promises.push(
        await this.axiosService.getRequestDownload(
          API_URL_REPORT_INDV + "=" + this.config.lastUsernameSession + "|AND;",
          "rpt_cajeroindividual"
        )
      );

      const filesPathsList = await Promise.all(promises)
        .then((responses) => {
          const errors = responses.filter(
            (response) => response.status === "error"
          );
          if (errors.length > 0) {
            return {
              status: "error",
              errors: errors,
            };
          }
          return responses.map((response) => response.filePath);
        })
        .catch((err) => {
          return {
            status: "error",
            errMessage: err.message,
          };
        });

      if (filesPathsList.status === "error") {
        return {
          status: "error",
          errMessage: filesPathsList.errMessage,
          errors: filesPathsList.errors,
        };
      }

      console.log("----");
      let printerPromises = [];
      for (let path of filesPathsList) {
        path = PATH.normalize(path);
        printerPromises.push(await this.printerService.print(path));
      }

      const printerResponses = await Promise.all(printerPromises);
      return {
        status: "success",
        printerRes: printerResponses,
      };
    } catch (err) {
      return err;
    }
  }

  /**
   * @description An inquirer prompt to let users input theirs credentials
   * @returns
   */
  async waitForCredentials() {
    // console.clear();
    const questionList = [
      {
        type: "input",
        name: "username",
        message: "Ingresa tu nombre de usuario:",
      },
      {
        type: "password",
        name: "password",
        message: "Ingresa tu contraseña:",
      },
    ];

    const input = await this.inquirer.prompt(questionList);
    return {
      username: input.username,
      password: input.password,
    };
  }
}

module.exports = Operations;

// /**
//  * @description Login
//  * @param {String} Username User's username
//  * @param {String} Password Users' password
//  * @returns ASPXAUTH token
//  */
// const login = async(username, password) => {
//     //TODO: Create a body validator
//     if(!username || !password){
//         return 'Username or password cannot be undefined'
//     }

//     try{
//         const serviceResponse = await AxiosServiceInstance.postRequest(API_URL_LOGIN, { username, password });
//         if(!serviceResponse){
//             console.log('Invalid username or password');
//             return;
//         }

//         console.log('Authorized succcessfully');
//         return serviceResponse;
//     }catch(err){
//         console.log('Something went wrong in login function');
//         return err.message;
//     }
// }

// module.exports = {
//     login
// }
