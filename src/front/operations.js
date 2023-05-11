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

// ENV VARS
const {
  API_URL_LOGIN,
  API_URL_REPORT,
  API_URL_REPORT_INDV,
  API_URL_AUDI_RPT_LIST,
  API_URL_AUDI_RPT,
  API_URL_COBRO_RPT_GENERATE,
  API_URL_COBRO_RPT_DOWNLOAD,
} = process.env;

class Operations {
  axiosService = new AxiosService();
  printerService = new PrinterService();

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
    const serviceResponse = await this.axiosService.postRequest(
      API_URL_LOGIN,
      userCredentials
    );

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
      console.log(`\x1b[33mBuscando último archivo de reportes...\x1b[0m`);
      const serviceResponse = await this.axiosService.getRequest(
        API_URL_AUDI_RPT_LIST
      );

      if (serviceResponse.status === "error") {
        return serviceResponse;
      }

      // Zip name to download
      const zipName = await this.getZipName(serviceResponse.htmlData);
      console.log(zipName);

      console.log(`\x1b[33mDescargando...\x1b[0m`);
      const downloadRequest = await this.axiosService.axiosScrapping({
        url: API_URL_AUDI_RPT + zipName,
        responseType: "arraybuffer",
      });

      if (!fs.existsSync(filesPath)) {
        fs.mkdirSync(filesPath);
      }

      console.log(`\x1b[33mDescomprimiendo...\x1b[0m`);
      fs.writeFileSync(filesPath + zipName, downloadRequest.data);
      const files = await decompress(
        filesPath + zipName,
        filesPath + "08-05-2023"
      );

      const pdfFiles = files.filter((file) => !file.path.includes(".csv"));
      const users = Object.getOwnPropertyNames(ReportsByUser);
      let printerErrors = [];
      const reportExceptions = ["rpt_dailytransactions2", "rpt_nad_balance"];
      for (const user of users) {
        let reports = ReportsByUser[user];
        if (user === "accountant") {
          console.log("\x1b[33mProcesando reportes (Contadora)... \x1b[0m");
        }
        if (user === "salesManager") {
          console.log(
            "\x1b[33mProcesando reportes (Gerencia de ventas)...\x1b[0m"
          );
        }
        if (user === "manager") {
          console.log("\x1b[33mProcesando reportes (Gerencia)...\x1b[0m");
        }
        for (const report of reports) {
          let isExcept = reportExceptions.includes(report);
          if (
            pdfFiles.filter((file) => file.path.includes(report + ".pdf")) &&
            !isExcept
          ) {
            let printerRes;
            printerRes = await this.printerService.print(
              filesPath + "08-05-2023/" + report + ".pdf"
            );

            if (printerRes.errMessage === "No such file") {
              console.log(
                `\x1b[31mNo se encontró el archivo: ${report}.pdf.\x1b[0m`
              );
            }

            if (printerRes.status === "Error") {
              printerErrors.push(printerRes);
            }
          }
        }
      }

      return {
        status: "success",
        printerErrors: printerErrors,
      };
    } catch (err) {
      console.log(err);
      throw new Error(err.message);
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

    try {
      const printerResponses = await Promise.all(printerPromises);
      return {
        status: "success",
        printerRes: printerResponses,
      };
    } catch (err) {
      console.log(err);
      return {
        status: "error",
        errMessage: err.message,
      };
    }

    // console.log(serviceResponse.data);
    // return;
    // const waitForReports = async () => {
    //   let promises = [];
    //   promises.push(await this.axiosService.getRequest(API_URL_REPORT));
    //   promises.push(await this.axiosService.getRequest(API_URL_REPORT_INDV));
    //   Promise.all(promises)
    //     .then((res) => {
    //       console.log(res);
    //     })
    //     .catch((err) => {
    //       console.log(err);
    //       return err;
    //     });
    // };
    // const reportsResponse = await waitForReports();
    // console.log(reportsResponse);
    // return;
    // const serviceResponse = await this.axiosService.getRequest(
    //   API_URL_REPORT_INDV
    // );
    // if (serviceResponse.status === "error") {
    //   return serviceResponse;
    // }
    // console.log("\x1b[32mReporte listo.\x1b[0m");
    // const questionList = [
    //   {
    //     type: "confirm",
    //     name: "confirm",
    //     message: "Recibiste efectivo?",
    //   },
    // ];
    // const input = await this.inquirer.prompt(questionList);
    // // if true, printer must print a copy of the report
    // let res;
    // if (input.confirm) {
    //   //TODO: Implement printer
    //   res = await this.printerService.print(serviceResponse.fileDirectory, 2);
    // } else {
    //   res = await this.printerService.print(serviceResponse.fileDirectory, 1);
    // }
    // console.clear();
    // console.log("\x1b[32m%s.\x1b[0m", res.message);
    // return res;
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
